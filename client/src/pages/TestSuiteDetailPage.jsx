import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  addCaseToTestSuite,
  deleteTestSuite,
  getTestSuite,
  removeCaseFromTestSuite,
  reorderTestSuiteCases,
} from '../api/test-suites'
import { createTestRun } from '../api/test-runs'
import { useSingleFlight } from '../hooks/use-single-flight'
import { formatDate } from '../utils/format-date'
import ConfirmDialog from '../components/ConfirmDialog'
import SeverityBadge from '../components/SeverityBadge'
import TestSuiteFormModal from '../components/TestSuiteFormModal'
import AddCasesModal from '../components/AddCasesModal'
import './TestCasesPage.css'
import './TestSuiteDetailPage.css'

const BUSY_MESSAGE = 'Another change is still saving. Try again in a moment.'

function TestSuiteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [suite, setSuite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const [saving, setSaving] = useState(false)
  const [startingRun, setStartingRun] = useState(false)
  const runOnce = useSingleFlight()
  const savingRef = useRef(false)

  const load = useCallback(() => {
    return getTestSuite(id)
      .then(setSuite)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setLoading(true)
    setError('')
    load()
  }, [load])

  // One change at a time: each response is the full server state, so overlapping requests could
  // land out of order and overwrite newer changes on screen.
  async function withSaveLock(task) {
    if (savingRef.current) throw new Error(BUSY_MESSAGE)
    savingRef.current = true
    setSaving(true)
    try {
      return await task()
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function moveCase(from, to) {
    if (savingRef.current || from === to || to < 0 || to >= suite.cases.length) return
    const next = [...suite.cases]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setSuite({ ...suite, cases: next })
    setError('')

    withSaveLock(async () => {
      setSuite(
        await reorderTestSuiteCases(
          suite.id,
          next.map((testCase) => testCase.id)
        )
      )
    }).catch(async (err) => {
      await load()
      setError(`Could not save the new order: ${err.message}`)
    })
  }

  function clearDrag() {
    setDragIndex(null)
    setOverIndex(null)
  }

  async function handleRemove(testCase) {
    setError('')
    try {
      setSuite(await withSaveLock(() => removeCaseFromTestSuite(suite.id, testCase.id)))
    } catch (err) {
      setError(`Could not remove the case: ${err.message}`)
    }
  }

  async function handleAdd(testCaseId) {
    try {
      setSuite(await withSaveLock(() => addCaseToTestSuite(suite.id, testCaseId)))
    } catch (err) {
      if (err.status === 409) {
        // Someone else (another tab, another person) already added this case. Refresh so existingIds
        // picks that up and the picker's button flips to "Added" instead of repeating the same 409.
        try {
          setSuite(await getTestSuite(suite.id))
        } catch {
          // The message from the failed add is already shown to the user.
        }
      }
      throw err
    }
  }

  // The server copies the suite's cases at this moment, so the run is correct even if this page is out of date.
  async function handleNewRun() {
    await runOnce(async () => {
      setStartingRun(true)
      setError('')
      try {
        const run = await createTestRun({ suite_id: suite.id })
        navigate(`/test-runs/${run.id}`)
      } catch (err) {
        setError(`Could not start a run: ${err.message}`)
        setStartingRun(false)
      }
    })
  }

  async function confirmDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteTestSuite(suite.id)
      navigate('/test-suites')
    } catch (err) {
      setDeleteError(`Could not delete the suite: ${err.message}`)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="test-cases-page">
        <p>Loading...</p>
      </div>
    )
  }

  if (!suite) {
    return (
      <div className="test-cases-page">
        <Link to="/test-suites" className="back-link">
          ← All suites
        </Link>
        <p className="form-error" role="alert">
          {error || 'Test suite not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="test-cases-page">
      <Link to="/test-suites" className="back-link">
        ← All suites
      </Link>

      <div className="suite-detail-header">
        <div>
          <h1>{suite.name}</h1>
          <p className="suite-meta">
            Feature: <strong>{suite.feature}</strong> ·{' '}
            <span className={`status-pill status-pill-${suite.status}`}>{suite.status}</span> · Updated{' '}
            {formatDate(suite.updated_at)}
          </p>
        </div>
        <div className="suite-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={startingRun || suite.cases.length === 0}
            title={suite.cases.length === 0 ? 'Add test cases to this suite before starting a run' : undefined}
            onClick={handleNewRun}
          >
            {startingRun ? 'Starting...' : 'New Run'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowEdit(true)}>
            Edit
          </button>
          <button
            type="button"
            className="btn-secondary btn-danger"
            onClick={() => {
              setDeleteError('')
              setShowDeleteConfirm(true)
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="suite-cases-header">
        <h2>Cases ({suite.cases.length})</h2>
        <button type="button" className="btn-primary" onClick={() => setShowPicker(true)}>
          + Add cases
        </button>
      </div>

      {suite.cases.length === 0 ? (
        <p className="empty-row suite-empty">No cases in this suite yet. Use "Add cases" to build the run order.</p>
      ) : (
        <>
          <ol className="suite-case-list">
            {suite.cases.map((testCase, index) => (
              <li
                key={testCase.id}
                className={[
                  'suite-case-item',
                  dragIndex === index ? 'dragging' : '',
                  overIndex === index && dragIndex !== null && dragIndex !== index ? 'drag-over' : '',
                ].join(' ')}
                draggable={!saving}
                onDragStart={(e) => {
                  setDragIndex(index)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', String(index))
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setOverIndex(index)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIndex !== null) moveCase(dragIndex, index)
                  clearDrag()
                }}
                onDragEnd={clearDrag}
              >
                <span className="drag-handle" aria-hidden="true">
                  ⠿
                </span>
                <span className="case-position">{index + 1}.</span>
                <span className="case-title">{testCase.title}</span>
                <SeverityBadge severity={testCase.severity} />
                <span className={`status-pill status-pill-${testCase.status}`}>{testCase.status}</span>
                <span className="case-controls">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move "${testCase.title}" up`}
                    disabled={saving || index === 0}
                    onClick={() => moveCase(index, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Move "${testCase.title}" down`}
                    disabled={saving || index === suite.cases.length - 1}
                    onClick={() => moveCase(index, index + 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove "${testCase.title}" from this suite`}
                    disabled={saving}
                    onClick={() => handleRemove(testCase)}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <p className="drag-hint" aria-live="polite">
            {saving ? 'Saving...' : 'Drag a row, or use the arrow buttons, to change the run order.'}
          </p>
        </>
      )}

      {showEdit && (
        <TestSuiteFormModal suite={suite} onClose={() => setShowEdit(false)} onSaved={setSuite} onStale={load} />
      )}

      {showPicker && (
        <AddCasesModal
          existingIds={new Set(suite.cases.map((testCase) => testCase.id))}
          busy={saving}
          onAdd={handleAdd}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete test suite?"
          confirmLabel="Delete suite"
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        >
          <p>
            <strong>{suite.name}</strong> will be deleted. This can't be undone.
          </p>
          <p>The {suite.cases.length} test case{suite.cases.length === 1 ? '' : 's'} in it will be kept.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}

export default TestSuiteDetailPage
