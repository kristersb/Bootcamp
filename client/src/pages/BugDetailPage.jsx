import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addBugComment, changeBugStatus, deleteBug, getBug } from '../api/bugs'
import { BUG_LIMITS } from '../constants/bug'
import { useSingleFlight } from '../hooks/use-single-flight'
import { formatDate } from '../utils/format-date'
import BugFormModal from '../components/BugFormModal'
import ConfirmDialog from '../components/ConfirmDialog'
import SeverityBadge from '../components/SeverityBadge'
import './TestCasesPage.css'
import './TestSuiteDetailPage.css'
import './BugDetailPage.css'

function describeActivity(entry) {
  if (entry.action === 'created') return 'Bug reported'
  if (entry.action === 'status_changed') {
    return (
      <>
        Status changed from <strong>{entry.old_value}</strong> to <strong>{entry.new_value}</strong>
      </>
    )
  }
  return 'Comment'
}

const GONE_MESSAGE = 'This bug no longer exists. It was probably deleted in another tab or window.'

function BugDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const uid = useId()
  const runOnce = useSingleFlight()

  const [bug, setBug] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // The bug was deleted elsewhere: drop the stale copy so the page stops offering actions on it.
  function markGone() {
    setBug(null)
    setLoadError(GONE_MESSAGE)
  }

  // refresh = true when reloading a bug that was already on screen, so a 404 means it was deleted meanwhile.
  const load = useCallback(
    (refresh = false) =>
      getBug(id)
        .then(setBug)
        .catch((err) => {
          if (err.status === 404) {
            setBug(null)
            setLoadError(refresh ? GONE_MESSAGE : err.message)
          } else {
            setLoadError(err.message)
            setError(err.message)
          }
        })
        .finally(() => setLoading(false)),
    [id]
  )

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    load()
  }, [load])

  async function handleChangeStatus(e) {
    e.preventDefault()
    if (!nextStatus) return
    await runOnce(async () => {
      setBusy(true)
      setError('')
      try {
        setBug(await changeBugStatus(bug.id, nextStatus, statusNote, bug.status))
        setNotice(`Status changed to ${nextStatus}.`)
        setNextStatus('')
        setStatusNote('')
      } catch (err) {
        if (err.status === 404) {
          markGone()
          return
        }
        setError(err.message)
        // Someone else may have moved the bug; refresh so the dropdown shows the real options.
        if (err.status === 409) await load(true)
        setNextStatus('')
      } finally {
        setBusy(false)
      }
    })
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    await runOnce(async () => {
      setBusy(true)
      setError('')
      try {
        setBug(await addBugComment(bug.id, comment))
        setNotice('Comment added.')
        setComment('')
      } catch (err) {
        if (err.status === 404) {
          markGone()
          return
        }
        setError(err.message)
      } finally {
        setBusy(false)
      }
    })
  }

  async function confirmDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteBug(bug.id)
      navigate('/bugs')
    } catch (err) {
      if (err.status === 404) {
        navigate('/bugs')
      } else {
        setDeleteError(`Could not delete: ${err.message}`)
        setDeleting(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="test-cases-page">
        <p>Loading...</p>
      </div>
    )
  }

  if (!bug) {
    return (
      <div className="test-cases-page">
        <Link to="/bugs" className="back-link">
          ← All bugs
        </Link>
        <p className="form-error" role="alert">
          {loadError || 'Bug not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="test-cases-page bug-detail">
      <Link to="/bugs" className="back-link">
        ← All bugs
      </Link>

      <div className="suite-detail-header">
        <div>
          <h1>{bug.title}</h1>
          <p className="suite-meta bug-meta">
            <SeverityBadge severity={bug.severity} />
            <span className="status-pill">{bug.status}</span>
            <span>
              Priority: <strong>{bug.priority}</strong>
            </span>
          </p>
          <p className="suite-meta">
            Reported {formatDate(bug.created_at)} · Updated {formatDate(bug.updated_at)}
          </p>
        </div>
        <div className="suite-actions">
          <button type="button" className="btn-secondary" onClick={() => setShowEdit(true)}>
            Edit
          </button>
          <button
            type="button"
            className="btn-secondary btn-danger"
            onClick={() => {
              setDeleteError('')
              setShowDelete(true)
            }}
          >
            Delete
          </button>
        </div>
      </div>

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

      <section className="bug-section" aria-labelledby={`${uid}-status`}>
        <h2 id={`${uid}-status`}>Change status</h2>
        <form className="status-form" onSubmit={handleChangeStatus}>
          <div className="field">
            <label htmlFor={`${uid}-next-status`}>Move to</label>
            <select
              id={`${uid}-next-status`}
              value={nextStatus}
              disabled={busy}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              <option value="">Select new status...</option>
              {bug.allowed_transitions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field status-note">
            <label htmlFor={`${uid}-note`}>Note (optional)</label>
            <input
              id={`${uid}-note`}
              type="text"
              value={statusNote}
              maxLength={BUG_LIMITS.message}
              disabled={busy}
              placeholder="Why is the status changing?"
              onChange={(e) => setStatusNote(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!nextStatus || busy}>
            {busy ? 'Saving...' : 'Change status'}
          </button>
        </form>
        <p className="hint">
          From <strong>{bug.status}</strong> this bug can move to: {bug.allowed_transitions.join(', ')}.
        </p>
      </section>

      {bug.description && (
        <section className="bug-section" aria-labelledby={`${uid}-description`}>
          <h2 id={`${uid}-description`}>Description</h2>
          <p className="bug-text">{bug.description}</p>
        </section>
      )}

      <section className="bug-section" aria-labelledby={`${uid}-steps`}>
        <h2 id={`${uid}-steps`}>Steps to reproduce</h2>
        <ol className="bug-steps">
          {bug.steps_to_reproduce.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="bug-compare">
        <section className="bug-section" aria-labelledby={`${uid}-expected`}>
          <h2 id={`${uid}-expected`}>Expected</h2>
          <p className="bug-text">{bug.expected}</p>
        </section>
        <section className="bug-section" aria-labelledby={`${uid}-actual`}>
          <h2 id={`${uid}-actual`}>Actual</h2>
          <p className="bug-text">{bug.actual}</p>
        </section>
      </div>

      {bug.environment && (
        <section className="bug-section" aria-labelledby={`${uid}-environment`}>
          <h2 id={`${uid}-environment`}>Environment</h2>
          <p className="bug-text">{bug.environment}</p>
        </section>
      )}

      <section className="bug-section" aria-labelledby={`${uid}-activity`}>
        <h2 id={`${uid}-activity`}>Activity</h2>

        <form className="comment-form" onSubmit={handleAddComment}>
          <label htmlFor={`${uid}-comment`}>Add a comment</label>
          <textarea
            id={`${uid}-comment`}
            value={comment}
            rows={2}
            maxLength={BUG_LIMITS.message}
            disabled={busy}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" className="btn-secondary" disabled={!comment.trim() || busy}>
            Add comment
          </button>
        </form>

        <ol className="timeline">
          {bug.activity.map((entry) => (
            <li key={entry.id} className={`timeline-item timeline-${entry.action}`}>
              <div className="timeline-head">
                <span className="timeline-title">{describeActivity(entry)}</span>
                <time className="timeline-time" dateTime={entry.created_at.replace(' ', 'T') + 'Z'}>
                  {formatDate(entry.created_at)}
                </time>
              </div>
              {entry.message && <p className="timeline-message">{entry.message}</p>}
            </li>
          ))}
        </ol>
      </section>

      {showEdit && (
        <BugFormModal
          bug={bug}
          onClose={() => setShowEdit(false)}
          onSaved={(saved) => {
            setBug(saved)
            setNotice('Bug saved.')
          }}
          onStale={() => load(true)}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete bug?"
          confirmLabel="Delete bug"
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setShowDelete(false)}
        >
          <p>
            <strong>{bug.title}</strong> will be deleted, along with its {bug.activity.length} activity{' '}
            {bug.activity.length === 1 ? 'entry' : 'entries'}. This can't be undone.
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}

export default BugDetailPage
