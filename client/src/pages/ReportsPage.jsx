import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listReports } from '../api/reports'
import { formatDate } from '../utils/format-date'
import './TestCasesPage.css'
import './TestRunsPage.css'

function ReportsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    listReports()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshToken])

  return (
    <div className="test-cases-page">
      <div className="test-cases-header">
        <h1>Reports</h1>
      </div>
      <p className="runs-intro">
        A report is a snapshot of a test run. Generate one from a run&apos;s detail page with <strong>Generate report</strong>.
      </p>

      <p className="visually-hidden" role="status">
        {loading ? 'Loading reports.' : error ? '' : `${items.length} report${items.length === 1 ? '' : 's'} found.`}
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
          <caption className="visually-hidden">Reports</caption>
          <colgroup>
            <col />
            <col className="col-run-count" />
            <col className="col-run-count" />
            <col className="col-run-count" />
            <col className="col-run-count" />
            <col className="col-date" />
          </colgroup>
          <thead>
            <tr>
              <th>Suite</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Skipped</th>
              <th>Total</th>
              <th>Generated</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="empty-row">
                  Loading reports...
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  No reports yet. Open a test run and press &quot;Generate report&quot;.
                </td>
              </tr>
            )}
            {items.map((report) => (
              <tr key={report.id}>
                <td>
                  <Link className="bug-link" to={`/reports/${report.id}`}>
                    {report.suite_name}
                  </Link>{' '}
                  <span className="run-number">Run #{report.run_id}</span>
                </td>
                <td>{report.passed_count}</td>
                <td>{report.failed_count}</td>
                <td>{report.skipped_count}</td>
                <td>{report.total_count}</td>
                <td>{formatDate(report.generated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ReportsPage
