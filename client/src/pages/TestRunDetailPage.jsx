import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RUN_LIMITS } from '../constants/test-run'
import { completeTestRun, getTestRun, updateTestRunResult } from '../api/test-runs'
import { createReport } from '../api/reports'
import { useSingleFlight } from '../hooks/use-single-flight'
import { formatDate } from '../utils/format-date'
import ConfirmDialog from '../components/ConfirmDialog'
import './TestCasesPage.css'
import './TestSuiteDetailPage.css'
import './TestRunDetailPage.css'

const RESULT_BUTTONS = [
  { result: 'passed', label: 'Pass' },
  { result: 'failed', label: 'Fail' },
  { result: 'skipped', label: 'Skip' },
]

const RESULT_LABELS = { passed: 'Passed', failed: 'Failed', skipped: 'Skipped' }

// Empty means "no duration". Otherwise a plain non-negative number of seconds, stored as milliseconds.
function parseSeconds(text) {
  const value = text.trim()
  if (value === '') return { ok: true, ms: null }
  if (!/^\d+(\.\d+)?$/.test(value) || Number(value) > RUN_LIMITS.maxSeconds) return { ok: false }
  return { ok: true, ms: Math.round(Number(value) * 1000) }
}

function serverSeconds(result) {
  return result.duration_ms == null ? '' : String(result.duration_ms / 1000)
}

function TestRunDetailPage() {
  const { id } = useParams()
  const uid = useId()
  const navigate = useNavigate()
  const runOnce = useSingleFlight()

  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [drafts, setDrafts] = useState({}) // unsaved edits: { [resultId]: { notes?, seconds? } }
  const [durationErrors, setDurationErrors] = useState({}) // { [resultId]: message }
  const [busy, setBusy] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)

  const load = useCallback(
    () =>
      getTestRun(id)
        .then(setRun)
        .catch((err) => setLoadError(err.message))
        .finally(() => setLoading(false)),
    [id]
  )

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    load()
  }, [load])

  const draftNotes = (result) => drafts[result.id]?.notes ?? result.notes
  const draftSeconds = (result) => drafts[result.id]?.seconds ?? serverSeconds(result)
  const isDirty = (result) => draftNotes(result) !== result.notes || draftSeconds(result) !== serverSeconds(result)

  function setDraft(result, field, value) {
    setDrafts((current) => ({ ...current, [result.id]: { ...current[result.id], [field]: value } }))
    if (field === 'seconds' && durationErrors[result.id]) {
      setDurationErrors((current) => {
        const { [result.id]: _cleared, ...rest } = current
        return rest
      })
    }
  }

  const locked = Boolean(run?.locked_at)
  const unsavedCount = run ? run.results.filter(isDirty).length : 0
  const unalertedFailures = run ? run.results.filter((r) => r.result === 'failed' && !r.alert_sent).length : 0

  // Another tab or person may have changed the run. Show what the server has now.
  async function reloadAfterConflict() {
    try {
      setRun(await getTestRun(id))
    } catch {
      // The message from the failed request is already on screen.
    }
  }

  async function confirmComplete() {
    await runOnce(async () => {
      setCompleting(true)
      setCompleteError('')
      try {
        const done = await completeTestRun(run.id, {
          passed: run.pass_count,
          failed: run.fail_count,
          skipped: run.skip_count,
        })
        setRun(done)
        setDrafts({})
        setError('')
        setShowComplete(false)
        setNotice('Run completed. The results are now locked.')
      } catch (err) {
        setCompleteError(err.message)
        await reloadAfterConflict()
      } finally {
        setCompleting(false)
      }
    })
  }

  async function handleGenerateReport() {
    await runOnce(async () => {
      setGeneratingReport(true)
      setError('')
      try {
        const report = await createReport(run.id)
        navigate(`/reports/${report.id}`)
      } catch (err) {
        setError(`Could not generate a report: ${err.message}`)
      } finally {
        setGeneratingReport(false)
      }
    })
  }

  // result is undefined when only the notes and duration are being saved.
  async function save(result, newResult) {
    const seconds = parseSeconds(draftSeconds(result))
    if (!seconds.ok) {
      setDurationErrors((current) => ({
        ...current,
        [result.id]: `Must be a number of seconds from 0 to ${RUN_LIMITS.maxSeconds}.`,
      }))
      return
    }

    await runOnce(async () => {
      setBusy(true)
      setError('')
      setNotice('')
      try {
        const payload = { notes: draftNotes(result), duration_ms: seconds.ms }
        if (newResult) payload.result = newResult

        const { alert, ...updated } = await updateTestRunResult(run.id, result.id, payload)
        setRun(updated)
        setDrafts((current) => {
          const { [result.id]: _saved, ...rest } = current
          return rest
        })
        setDurationErrors((current) => {
          const { [result.id]: _cleared, ...rest } = current
          return rest
        })

        if (newResult !== 'failed') {
          setNotice(newResult ? `Marked "${result.case_title}" as ${RESULT_LABELS[newResult].toLowerCase()}.` : `Saved details for "${result.case_title}".`)
        } else if (alert.status === 'sent') {
          setNotice(`Marked "${result.case_title}" as failed. Discord alert sent.`)
        } else if (alert.status === 'already_sent') {
          setNotice(`"${result.case_title}" is already failed, and a Discord alert was already sent for this failure.`)
        } else if (alert.status === 'in_flight') {
          setNotice(`Marked "${result.case_title}" as failed. A Discord alert is already being sent.`)
        } else {
          setError(`Marked "${result.case_title}" as failed, but the Discord alert was not sent: ${alert.error} Press Fail again to retry.`)
        }
      } catch (err) {
        setError(err.message)
        await reloadAfterConflict()
      } finally {
        setBusy(false)
      }
    })
  }

  if (loading) {
    return (
      <div className="test-cases-page">
        <p>Loading...</p>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="test-cases-page">
        <Link to="/test-runs" className="back-link">
          ← All runs
        </Link>
        <p className="form-error" role="alert">
          {loadError || 'Test run not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="test-cases-page">
      <Link to="/test-runs" className="back-link">
        ← All runs
      </Link>

      <div className="suite-detail-header">
        <div>
          <h1>
            {run.suite_name} <span className="run-number-title">Run #{run.id}</span>
          </h1>
          <p className="suite-meta run-summary">
            <span className={`status-pill status-pill-${run.status}`}>{run.status}</span>
            <span>
              <strong>{run.pass_count}</strong> passed
            </span>
            <span>
              <strong>{run.fail_count}</strong> failed
            </span>
            <span>
              <strong>{run.skip_count}</strong> skipped
            </span>
            <span>
              <strong>{run.pending_count}</strong> pending
            </span>
          </p>
          <p className="suite-meta">
            Started {formatDate(run.start_time)}
            {locked ? ` · Completed and locked ${formatDate(run.locked_at)}` : ' · Not completed'} · By {run.created_by}
            {run.suite_id && (
              <>
                {' · '}
                <Link to={`/test-suites/${run.suite_id}`}>Open suite</Link>
              </>
            )}
          </p>
        </div>
        <div className="suite-actions">
          <button type="button" className="btn-secondary" disabled={generatingReport} onClick={handleGenerateReport}>
            {generatingReport ? 'Generating...' : 'Generate report'}
          </button>
        </div>
      </div>

      {locked ? (
        <p className="run-banner run-locked">This run is completed and locked. Its results can no longer be changed.</p>
      ) : (
        <div className={`run-banner ${run.pending_count === 0 ? 'run-ready' : 'run-hint'}`}>
          <p>
            {run.pending_count === 0
              ? 'Every case has an outcome. Complete the run to lock the results.'
              : `${run.pending_count} case${run.pending_count === 1 ? '' : 's'} still need${run.pending_count === 1 ? 's' : ''} an outcome before you can complete this run.`}
          </p>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || run.pending_count > 0}
            onClick={() => {
              setCompleteError('')
              setShowComplete(true)
            }}
          >
            Complete run
          </button>
        </div>
      )}

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

      <ol className="run-case-list">
        {run.results.map((result, index) => {
          const dirty = isDirty(result)
          return (
            <li key={result.id} className={`run-case${locked ? ' run-case-locked' : ''}`}>
              <div className="run-case-head">
                <span className="case-position">{index + 1}.</span>
                <span className="case-title">{result.case_title}</span>
                <span className={`result-pill result-${result.result ?? 'pending'}`}>
                  {result.result ? RESULT_LABELS[result.result] : 'Pending'}
                </span>
              </div>

              <div className="result-buttons" role="group" aria-label={`Result for ${result.case_title}`}>
                {RESULT_BUTTONS.map(({ result: value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`result-button result-button-${value}`}
                    aria-pressed={result.result === value}
                    disabled={busy || locked}
                    onClick={() => save(result, value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="run-case-fields">
                <div className="field run-notes">
                  <label htmlFor={`${uid}-notes-${result.id}`}>Notes</label>
                  <textarea
                    id={`${uid}-notes-${result.id}`}
                    rows={2}
                    maxLength={RUN_LIMITS.notes}
                    value={draftNotes(result)}
                    readOnly={locked}
                    disabled={busy}
                    onChange={(e) => setDraft(result, 'notes', e.target.value)}
                  />
                </div>
                <div className="field run-seconds">
                  <label htmlFor={`${uid}-seconds-${result.id}`}>Time (seconds)</label>
                  <input
                    id={`${uid}-seconds-${result.id}`}
                    type="text"
                    inputMode="decimal"
                    value={draftSeconds(result)}
                    readOnly={locked}
                    disabled={busy}
                    aria-invalid={Boolean(durationErrors[result.id])}
                    aria-describedby={durationErrors[result.id] ? `${uid}-seconds-error-${result.id}` : undefined}
                    onChange={(e) => setDraft(result, 'seconds', e.target.value)}
                  />
                  {durationErrors[result.id] && (
                    <span id={`${uid}-seconds-error-${result.id}`} className="field-error" role="alert">
                      {durationErrors[result.id]}
                    </span>
                  )}
                </div>
                {!locked && (
                  <button type="button" className="btn-secondary" disabled={busy || !dirty} onClick={() => save(result)}>
                    Save details
                  </button>
                )}
              </div>

              <p className="alert-line">
                {locked ? (
                  result.result === 'failed' ? (
                    result.alert_sent ? (
                      <>Discord alert sent {formatDate(result.alert_sent_at)}.</>
                    ) : (
                      <>No Discord alert was sent for this failure.</>
                    )
                  ) : null
                ) : result.result === 'failed' ? (
                  result.alert_sent ? (
                    <>Discord alert sent {formatDate(result.alert_sent_at)}.</>
                  ) : result.alert_error ? (
                    <>
                      Discord alert not sent: {result.alert_error} Press <strong>Fail</strong> to retry.
                    </>
                  ) : (
                    <>
                      No Discord alert sent for this failure. Press <strong>Fail</strong> to send one.
                    </>
                  )
                ) : (
                  <>Notes go into the Discord alert if you mark this case as failed, so write them before pressing Fail.</>
                )}
              </p>
            </li>
          )
        })}
      </ol>

      {showComplete && (
        <ConfirmDialog
          title="Complete this run?"
          confirmLabel="Complete run"
          busyLabel="Completing..."
          danger={false}
          busy={completing}
          error={completeError}
          onConfirm={confirmComplete}
          onCancel={() => setShowComplete(false)}
        >
          <p>
            {run.pass_count} passed, {run.fail_count} failed, {run.skip_count} skipped.
          </p>
          <p>
            <strong>Completing locks the results permanently.</strong> After this, no result, note or time can be changed.
          </p>
          {unalertedFailures > 0 && (
            <p>
              {unalertedFailures} failed case{unalertedFailures === 1 ? ' has' : 's have'} no Discord alert sent. Cancel and press Fail
              again on {unalertedFailures === 1 ? 'it' : 'them'} to retry before locking.
            </p>
          )}
          {unsavedCount > 0 && (
            <p>
              {unsavedCount} case{unsavedCount === 1 ? ' has' : 's have'} unsaved notes or time. They will be discarded. Cancel and press
              Save details to keep them.
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}

export default TestRunDetailPage
