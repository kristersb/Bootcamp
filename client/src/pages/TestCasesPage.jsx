import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUSES } from '../constants/testCase'
import { deleteTestCase, listTestCaseSuites, listTestCases, testCaseExportUrl } from '../api/testCases'
import ConfirmDialog from '../components/ConfirmDialog'
import SeverityBadge from '../components/SeverityBadge'
import RowActionsMenu from '../components/RowActionsMenu'
import TestCaseFormModal from '../components/TestCaseFormModal'
import { formatDate } from '../utils/format-date'
import './TestCasesPage.css'

function TestCasesPage() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('updated_at')
  const [order, setOrder] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalState, setModalState] = useState(null) // null | 'create' | testCase object
  const [refreshToken, setRefreshToken] = useState(0)
  const [pendingDelete, setPendingDelete] = useState(null) // { testCase, suites }
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setListError('')

    listTestCases({ search, status, sort, order, page })
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setTotal(data.total)
        setPageSize(data.pageSize)
        // The server returns the last page when the requested one is past the end (for example after a delete).
        if (data.page !== page) setPage(data.page)
      })
      .catch((err) => {
        if (cancelled) return
        setListError(err.message)
        setItems([])
        setTotal(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [search, status, sort, order, page, refreshToken])

  function refresh() {
    setRefreshToken((t) => t + 1)
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setStatus('')
    setPage(1)
  }

  function toggleSort(field) {
    if (sort === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      setOrder('desc')
    }
    setPage(1)
  }

  function sortIndicator(field) {
    if (sort !== field) return ''
    return order === 'asc' ? ' ▲' : ' ▼'
  }

  function ariaSort(field) {
    if (sort !== field) return undefined
    return order === 'asc' ? 'ascending' : 'descending'
  }

  function handleSaved({ created }) {
    const hiddenHint =
      created && (search || status || page > 1)
        ? ' It may not show on this page: clear the search and filter, or check the other pages.'
        : ''
    setNotice(created ? `Test case created.${hiddenHint}` : 'Test case saved.')
    refresh()
  }

  async function handleDelete(testCase) {
    setError('')
    setDeleteError('')
    try {
      const suites = await listTestCaseSuites(testCase.id)
      setPendingDelete({ testCase, suites })
    } catch (err) {
      if (err.status === 404) {
        setNotice(`"${testCase.title}" no longer exists. The list has been refreshed.`)
        refresh()
      } else {
        setError(`Could not check which suites use this test case, so nothing was deleted: ${err.message}`)
      }
    }
  }

  async function confirmDelete() {
    const { testCase } = pendingDelete
    setDeleting(true)
    setDeleteError('')
    try {
      const result = await deleteTestCase(testCase.id)
      setPendingDelete(null)
      const suiteNote =
        result.removedFromSuites > 0
          ? ` It was removed from ${result.removedFromSuites} test suite${result.removedFromSuites === 1 ? '' : 's'}.`
          : ''
      setNotice(`Deleted "${testCase.title}".${suiteNote}`)
      refresh()
    } catch (err) {
      if (err.status === 404) {
        setPendingDelete(null)
        setNotice(`"${testCase.title}" was already deleted. The list has been refreshed.`)
        refresh()
      } else {
        setDeleteError(`Could not delete: ${err.message}`)
      }
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const filtersActive = Boolean(search || status)
  const liveMessage = loading
    ? 'Loading test cases.'
    : listError
      ? ''
      : `${total} test case${total === 1 ? '' : 's'} found. Page ${page} of ${totalPages}.`

  return (
    <div className="test-cases-page">
      <div className="test-cases-header">
        <h1>Test Cases</h1>
        <div className="test-cases-header-actions">
          {/* A plain anchor, not a click handler: the URL itself carries the current filters, and the
              browser handles the attachment download from the server's Content-Disposition header. */}
          <a className="btn-secondary" href={testCaseExportUrl({ search, status, sort, order })} download>
            Download CSV
          </a>
          <Link to="/test-cases/import" className="btn-secondary">
            Import CSV
          </Link>
          <button type="button" className="btn-primary" onClick={() => setModalState('create')}>
            + Add Test Case
          </button>
        </div>
      </div>

      <div className="test-cases-toolbar">
        <input
          type="search"
          aria-label="Search test cases by title"
          maxLength={200}
          placeholder="Search by title..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <p className="visually-hidden" role="status">
        {liveMessage}
      </p>

      <div className="notice-slot" role="status">
        {notice && (
          <p className="notice">
            <span>{notice}</span>
            <button type="button" className="notice-dismiss" aria-label="Dismiss message" onClick={() => setNotice('')}>
              ×
            </button>
          </p>
        )}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {listError && (
        <div className="list-error" role="alert">
          <span>{listError}</span>
          <button type="button" className="btn-secondary" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      <div className="table-scroll">
      <table className={`test-cases-table${loading && items.length > 0 ? ' is-loading' : ''}`} aria-busy={loading}>
        <caption className="visually-hidden">Test cases</caption>
        <colgroup>
          <col />
          <col className="col-severity" />
          <col className="col-status" />
          <col className="col-date" />
          <col className="col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>Title</th>
            <th aria-sort={ariaSort('severity')}>
              <button type="button" className="sort-button" onClick={() => toggleSort('severity')}>
                Severity<span aria-hidden="true">{sortIndicator('severity')}</span>
              </button>
            </th>
            <th>Status</th>
            <th aria-sort={ariaSort('updated_at')}>
              <button type="button" className="sort-button" onClick={() => toggleSort('updated_at')}>
                Updated<span aria-hidden="true">{sortIndicator('updated_at')}</span>
              </button>
            </th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0 && !listError && (
            <tr>
              <td colSpan={5} className="empty-row">
                Loading test cases...
              </td>
            </tr>
          )}
          {!loading && !listError && items.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-row">
                {filtersActive ? (
                  <>
                    No test cases match your search or filter.{' '}
                    <button type="button" className="link-button" onClick={clearFilters}>
                      Clear search and filter
                    </button>
                  </>
                ) : (
                  'No test cases yet. Use "Add Test Case" to create one.'
                )}
              </td>
            </tr>
          )}
          {items.map((testCase) => (
            <tr key={testCase.id}>
              <td>{testCase.title}</td>
              <td>
                <SeverityBadge severity={testCase.severity} />
              </td>
              <td>
                <span className={`status-pill status-pill-${testCase.status}`}>{testCase.status}</span>
              </td>
              <td>{formatDate(testCase.updated_at)}</td>
              <td className="actions-cell">
                <RowActionsMenu
                  label={`Actions for ${testCase.title}`}
                  onEdit={() => setModalState(testCase)}
                  onDelete={() => handleDelete(testCase)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {!listError && (
        <nav className="pagination" aria-label="Pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </nav>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete test case?"
          confirmLabel="Delete test case"
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            <strong>{pendingDelete.testCase.title}</strong> will be deleted. This can't be undone.
          </p>
          {pendingDelete.suites.length > 0 && (
            <>
              <p>
                It is used in {pendingDelete.suites.length} test suite{pendingDelete.suites.length === 1 ? '' : 's'}{' '}
                and will be removed from:
              </p>
              <ul className="confirm-list">
                {pendingDelete.suites.map((suite) => (
                  <li key={suite.id}>{suite.name}</li>
                ))}
              </ul>
            </>
          )}
        </ConfirmDialog>
      )}

      {modalState && (
        <TestCaseFormModal
          testCase={modalState === 'create' ? null : modalState}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
          onStale={refresh}
        />
      )}
    </div>
  )
}

export default TestCasesPage
