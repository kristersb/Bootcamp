import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RUN_STATUSES, runStatusClass, runStatusLabel } from '../constants/test-run'
import { listTestRuns } from '../api/test-runs'
import { formatDate } from '../utils/format-date'
import './TestCasesPage.css'
import './TestRunsPage.css'

function TestRunsPage() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    listTestRuns({ status, page })
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
  }, [status, page, refreshToken])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const liveMessage = loading
    ? 'Loading test runs.'
    : error
      ? ''
      : `${total} test run${total === 1 ? '' : 's'} found. Page ${page} of ${totalPages}.`

  return (
    <div className="test-cases-page">
      <div className="test-cases-header">
        <h1>Test Runs</h1>
      </div>
      <p className="runs-intro">
        A run records the result of each test case in a suite. Start one from a suite&apos;s page with <strong>New Run</strong>.
      </p>

      <div className="test-cases-toolbar">
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All statuses</option>
          {RUN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {status && (
          <button type="button" className="btn-secondary" onClick={() => setStatus('')}>
            Clear filter
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
        <table className={`test-cases-table runs-table${loading && items.length > 0 ? ' is-loading' : ''}`} aria-busy={loading}>
          <caption className="visually-hidden">Test runs</caption>
          <colgroup>
            <col />
            <col className="col-status" />
            <col className="col-run-count" />
            <col className="col-run-count" />
            <col className="col-run-count" />
            <col className="col-run-count" />
            <col className="col-date" />
          </colgroup>
          <thead>
            <tr>
              <th>Suite</th>
              <th>Status</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Skipped</th>
              <th>Pending</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="empty-row">
                  Loading test runs...
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-row">
                  {status
                    ? `No ${status} runs.`
                    : 'No test runs yet. Open a test suite and press "New Run" to start one.'}
                </td>
              </tr>
            )}
            {items.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link className="bug-link" to={`/test-runs/${run.id}`}>
                    {run.suite_name}
                  </Link>{' '}
                  <span className="run-number">Run #{run.id}</span>
                </td>
                <td>
                  <span className={`status-pill status-pill-${runStatusClass(run)}`}>{runStatusLabel(run)}</span>
                </td>
                <td>{run.pass_count}</td>
                <td>{run.fail_count}</td>
                <td>{run.skip_count}</td>
                <td>{run.pending_count}</td>
                <td>{formatDate(run.start_time)}</td>
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
    </div>
  )
}

export default TestRunsPage
