import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BUG_PRIORITIES, BUG_SEVERITIES, BUG_STATUSES } from '../constants/bug'
import { listBugs } from '../api/bugs'
import { formatDate } from '../utils/format-date'
import BugFormModal from '../components/BugFormModal'
import SeverityBadge from '../components/SeverityBadge'
import './TestCasesPage.css'
import './BugsPage.css'

const COLUMNS = [
  { field: 'title', label: 'Title' },
  { field: 'severity', label: 'Severity' },
  { field: 'priority', label: 'Priority' },
  { field: 'status', label: 'Status' },
  { field: 'updated_at', label: 'Updated' },
]

function BugsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [priority, setPriority] = useState('')
  const [sort, setSort] = useState('updated_at')
  const [order, setOrder] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

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
    setError('')

    listBugs({ status, severity, priority, search, sort, order, page })
      .then((data) => {
        if (cancelled) return
        setItems(data.items)
        setTotal(data.total)
        setPageSize(data.pageSize)
        if (data.page !== page) setPage(data.page)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setItems([])
        setTotal(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, severity, priority, search, sort, order, page, refreshToken])

  function changeFilter(setter) {
    return (e) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setStatus('')
    setSeverity('')
    setPriority('')
    setPage(1)
  }

  function toggleSort(field) {
    if (sort === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(field)
      setOrder(field === 'title' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const filtersActive = Boolean(search || status || severity || priority)
  const liveMessage = loading
    ? 'Loading bugs.'
    : error
      ? ''
      : `${total} bug${total === 1 ? '' : 's'} found. Page ${page} of ${totalPages}.`

  return (
    <div className="test-cases-page">
      <div className="test-cases-header">
        <h1>Bugs</h1>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          + New Bug
        </button>
      </div>

      <div className="test-cases-toolbar bug-filters">
        <input
          type="search"
          aria-label="Search bugs by title or description"
          maxLength={200}
          placeholder="Search title or description..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select aria-label="Filter by status" value={status} onChange={changeFilter(setStatus)}>
          <option value="">All statuses</option>
          {BUG_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select aria-label="Filter by severity" value={severity} onChange={changeFilter(setSeverity)}>
          <option value="">All severities</option>
          {BUG_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select aria-label="Filter by priority" value={priority} onChange={changeFilter(setPriority)}>
          <option value="">All priorities</option>
          {BUG_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button type="button" className="btn-secondary" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <p className="visually-hidden" role="status">
        {liveMessage}
      </p>

      {error && (
        <div className="list-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={() => setRefreshToken((t) => t + 1)}>
            Try again
          </button>
        </div>
      )}

      <div className="table-scroll">
        <table className={`test-cases-table${loading && items.length > 0 ? ' is-loading' : ''}`} aria-busy={loading}>
          <caption className="visually-hidden">Bugs</caption>
          <colgroup>
            <col />
            <col className="col-severity" />
            <col className="col-priority" />
            <col className="col-status" />
            <col className="col-date" />
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map(({ field, label }) => (
                <th key={field} aria-sort={sort === field ? (order === 'asc' ? 'ascending' : 'descending') : undefined}>
                  <button type="button" className="sort-button" onClick={() => toggleSort(field)}>
                    {label}
                    <span aria-hidden="true">{sort === field ? (order === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && !error && (
              <tr>
                <td colSpan={COLUMNS.length} className="empty-row">
                  Loading bugs...
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="empty-row">
                  {filtersActive ? (
                    <>
                      No bugs match your search or filters.{' '}
                      <button type="button" className="link-button" onClick={clearFilters}>
                        Clear search and filters
                      </button>
                    </>
                  ) : (
                    'No bugs reported yet. Use "New Bug" to report one.'
                  )}
                </td>
              </tr>
            )}
            {items.map((bug) => (
              <tr key={bug.id}>
                <td>
                  <Link className="bug-link" to={`/bugs/${bug.id}`}>
                    {bug.title}
                  </Link>
                </td>
                <td>
                  <SeverityBadge severity={bug.severity} />
                </td>
                <td>
                  <span className="status-pill">{bug.priority}</span>
                </td>
                <td>
                  <span className="status-pill">{bug.status}</span>
                </td>
                <td>{formatDate(bug.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!error && (
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

      {showForm && (
        <BugFormModal onClose={() => setShowForm(false)} onSaved={(bug) => navigate(`/bugs/${bug.id}`)} />
      )}
    </div>
  )
}

export default BugsPage
