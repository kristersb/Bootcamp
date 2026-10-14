import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { exportReportHtml, getReport } from '../api/reports'
import { formatDate } from '../utils/format-date'
import { formatDuration } from '../utils/format-duration'
import './TestCasesPage.css'
import './TestSuiteDetailPage.css'
import './TestRunDetailPage.css'
import './ReportDetailPage.css'

const RESULT_LABELS = { passed: 'Passed', failed: 'Failed', skipped: 'Skipped' }

function ReportDetailPage() {
  const { id } = useParams()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [exportError, setExportError] = useState('')
  const [exporting, setExporting] = useState(false)

  const load = useCallback(
    () =>
      getReport(id)
        .then(setReport)
        .catch((err) => setLoadError(err.message))
        .finally(() => setLoading(false)),
    [id]
  )

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    load()
  }, [load])

  if (loading) {
    return (
      <div className="test-cases-page">
        <p>Loading...</p>
      </div>
    )
  }

  async function handleExport() {
    setExportError('')
    setExporting(true)
    try {
      await exportReportHtml(report.id)
    } catch (err) {
      setExportError(`Could not download the HTML report: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  if (!report) {
    return (
      <div className="test-cases-page">
        <Link to="/reports" className="back-link">
          ← All reports
        </Link>
        <p className="form-error" role="alert">
          {loadError || 'Report not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="test-cases-page">
      <Link to="/reports" className="back-link no-print">
        ← All reports
      </Link>

      <div className="suite-detail-header">
        <div>
          <h1>
            {report.suite_name} <span className="run-number-title">Report #{report.id}</span>
          </h1>
          <p className="suite-meta run-summary">
            <span>
              <strong>{report.passed_count}</strong> passed
            </span>
            <span>
              <strong>{report.failed_count}</strong> failed
            </span>
            <span>
              <strong>{report.skipped_count}</strong> skipped
            </span>
            <span>
              <strong>{report.total_count}</strong> total
            </span>
          </p>
          <p className="suite-meta">
            From run #{report.run_id}, started {formatDate(report.run_date)} · Report generated {formatDate(report.generated_at)}
          </p>
        </div>
        <div className="suite-actions no-print">
          <button type="button" className="btn-primary" disabled={exporting} onClick={handleExport}>
            {exporting ? 'Downloading...' : 'Download HTML'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      {exportError && (
        <p className="form-error no-print" role="alert">
          {exportError}
        </p>
      )}

      <table className="test-cases-table report-results-table">
        <caption className="visually-hidden">Test case results</caption>
        <colgroup>
          <col className="col-num" />
          <col />
          <col className="col-result" />
          <col className="col-duration" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th>Test Case</th>
            <th>Result</th>
            <th>Duration</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {report.results.map((result, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{result.case_title}</td>
              <td>
                <span className={`result-pill result-${result.result ?? 'pending'}`}>
                  {result.result ? RESULT_LABELS[result.result] : 'Pending'}
                </span>
              </td>
              <td>{result.duration_ms != null ? formatDuration(result.duration_ms) : '—'}</td>
              <td>{result.notes || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ReportDetailPage
