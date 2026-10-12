import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { commitTestCaseImport, previewTestCaseImport } from '../api/testCases'
import { useSingleFlight } from '../hooks/use-single-flight'
import SeverityBadge from '../components/SeverityBadge'
import '../components/TestCaseFormModal.css'
import './TestCasesPage.css'
import './TestCaseImportPage.css'

const TEMPLATE_CSV =
  'title,preconditions,steps,expectedResult,severity,status\n' +
  '"[Login] Successful login with valid credentials","User has an existing account","Go to the login page|Enter a valid email and password|Click Login","The user is redirected to the dashboard",Major,draft\n'

function summarizeSteps(steps) {
  if (steps.length === 0) return '—'
  if (steps.length <= 2) return steps.join(', ')
  return `${steps.slice(0, 2).join(', ')}, +${steps.length - 2} more`
}

function RowErrorList({ errors }) {
  return (
    <ul className="import-row-errors">
      {errors.map((err, i) => (
        <li key={i}>{err}</li>
      ))}
    </ul>
  )
}

function TestCaseImportPage() {
  const [phase, setPhase] = useState('upload')
  const [fileName, setFileName] = useState('')
  const [content, setContent] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [preview, setPreview] = useState(null)
  const [committing, setCommitting] = useState(false)
  const [commitError, setCommitError] = useState('')
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)
  const runOnce = useSingleFlight()

  const templateHref = useMemo(() => 'data:text/csv;charset=utf-8,' + encodeURIComponent(TEMPLATE_CSV), [])

  function reset() {
    setPhase('upload')
    setFileName('')
    setContent('')
    setPreviewError('')
    setPreview(null)
    setCommitError('')
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreviewError('')
    setPreviewing(true)
    let text
    try {
      text = await file.text()
    } catch {
      setPreviewing(false)
      setPreviewError('Could not read the file. Choose a .csv file and try again.')
      return
    }

    try {
      const data = await previewTestCaseImport(text)
      setContent(text)
      setFileName(file.name)
      setPreview(data)
      setPhase('preview')
    } catch (err) {
      setPreviewError(err.message)
    } finally {
      setPreviewing(false)
    }
  }

  async function handleImport() {
    await runOnce(async () => {
      setCommitting(true)
      setCommitError('')
      try {
        const data = await commitTestCaseImport(content)
        setResult(data)
        setPhase('result')
      } catch (err) {
        setCommitError(err.message)
      } finally {
        setCommitting(false)
      }
    })
  }

  return (
    <div className="test-cases-page import-page">
      <Link to="/test-cases" className="back-link">
        ← All test cases
      </Link>

      <div className="test-cases-header">
        <h1>Import Test Cases from CSV</h1>
      </div>

      {phase === 'upload' && (
        <>
          <p className="import-intro">
            The CSV must include <strong>title</strong>, <strong>severity</strong> and <strong>steps</strong> columns at
            minimum. <strong>preconditions</strong> and <strong>steps</strong> hold multiple items as one cell, separated by
            a pipe: <code>Step one|Step two</code>. <strong>status</strong> defaults to draft if left blank.
          </p>
          <p className="import-intro">
            <a href={templateHref} download="test-cases-import-template.csv">
              Download a CSV template
            </a>
          </p>

          <div className="import-upload-box">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              aria-label="Choose a CSV file"
              disabled={previewing}
              onChange={handleFileSelected}
            />
            {previewing && <p className="import-status-line">Reading and validating...</p>}
          </div>

          {previewError && (
            <p className="form-error" role="alert">
              {previewError}
            </p>
          )}
        </>
      )}

      {phase === 'preview' && preview && (
        <>
          <p className="import-intro">
            <strong>{fileName}</strong> &middot; {preview.validCount} of {preview.totalRows} row
            {preview.totalRows === 1 ? '' : 's'} valid
            {preview.invalidCount > 0 ? `, ${preview.invalidCount} will be skipped` : ''}.
          </p>

          {commitError && (
            <p className="form-error" role="alert">
              {commitError}
            </p>
          )}

          <div className="table-scroll">
            <table className="test-cases-table import-preview-table">
              <caption className="visually-hidden">Preview of rows to import</caption>
              <colgroup>
                <col className="col-import-row" />
                <col />
                <col className="col-severity" />
                <col />
                <col className="col-status" />
                <col className="col-import-status" />
              </colgroup>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Steps</th>
                  <th>Status</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className={row.errors.length ? 'import-row-invalid' : undefined}>
                    <td>{row.rowNumber}</td>
                    <td>{row.input.title || '—'}</td>
                    <td>
                      {row.input.severity ? <SeverityBadge severity={row.input.severity} /> : '—'}
                    </td>
                    <td>{summarizeSteps(row.input.steps)}</td>
                    <td>
                      <span className="status-pill">{row.input.status || 'draft'}</span>
                    </td>
                    <td>
                      {row.errors.length === 0 ? (
                        <span className="import-valid-pill">Valid</span>
                      ) : (
                        <>
                          <span className="import-invalid-pill">Invalid</span>
                          <RowErrorList errors={row.errors} />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="import-actions">
            <button type="button" className="btn-primary" disabled={preview.validCount === 0 || committing} onClick={handleImport}>
              {committing ? 'Importing...' : `Import ${preview.validCount} valid row${preview.validCount === 1 ? '' : 's'}`}
            </button>
            <button type="button" className="btn-secondary" disabled={committing} onClick={reset}>
              Choose a different file
            </button>
          </div>
        </>
      )}

      {phase === 'result' && result && (
        <>
          <p className="import-intro">
            <strong>{result.importedCount}</strong> test case{result.importedCount === 1 ? '' : 's'} imported
            {result.skippedCount > 0 ? `, ${result.skippedCount} skipped` : ''}.
          </p>

          {result.skippedCount > 0 && (
            <div className="table-scroll">
              <table className="test-cases-table import-preview-table">
                <caption className="visually-hidden">Skipped rows</caption>
                <colgroup>
                  <col className="col-import-row" />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Why it was skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {result.skipped.map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td>
                        <RowErrorList errors={row.errors} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="import-actions">
            <Link to="/test-cases" className="btn-primary">
              Back to Test Cases
            </Link>
            <button type="button" className="btn-secondary" onClick={reset}>
              Import another file
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default TestCaseImportPage
