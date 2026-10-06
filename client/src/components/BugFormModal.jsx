import { useId, useRef, useState } from 'react'
import { BUG_LIMITS as LIMITS, BUG_PRIORITIES, BUG_SEVERITIES } from '../constants/bug'
import { createBug, updateBug } from '../api/bugs'
import { useDialog } from '../hooks/use-dialog'
import { useSingleFlight } from '../hooks/use-single-flight'
import ConfirmDialog from './ConfirmDialog'
import TextListField from './TextListField'
import './TestCaseFormModal.css'

function BugFormModal({ bug, onClose, onSaved, onStale }) {
  const isEdit = Boolean(bug)
  const uid = useId()
  const id = (name) => `${uid}-${name}`

  const [title, setTitle] = useState(bug?.title ?? '')
  const [description, setDescription] = useState(bug?.description ?? '')
  const [severity, setSeverity] = useState(bug?.severity ?? '')
  const [priority, setPriority] = useState(bug?.priority ?? 'medium')
  const [steps, setSteps] = useState(bug?.steps_to_reproduce?.length ? bug.steps_to_reproduce : [''])
  const [expected, setExpected] = useState(bug?.expected ?? '')
  const [actual, setActual] = useState(bug?.actual ?? '')
  const [environment, setEnvironment] = useState(bug?.environment ?? '')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const runOnce = useSingleFlight()
  // The version this form was opened with. The page reloads `bug` after a conflict, so reading bug.version
  // at save time would let a second Save succeed with the new version and overwrite the other person's edit.
  const openedVersion = useRef(bug?.version)
  const dialogRef = useRef(null)
  const titleInputRef = useRef(null)
  const initialSnapshot = useRef(null)

  const currentSnapshot = JSON.stringify({ title, description, severity, priority, steps, expected, actual, environment })
  if (initialSnapshot.current === null) initialSnapshot.current = currentSnapshot
  const dirty = currentSnapshot !== initialSnapshot.current

  function requestClose() {
    if (saving) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }

  useDialog({
    dialogRef,
    initialFocusRef: titleInputRef,
    onRequestClose: requestClose,
    enabled: !confirmDiscard,
  })

  function errorProps(name) {
    return fieldErrors[name]
      ? { 'aria-invalid': true, 'aria-describedby': id(`${name}-error`) }
      : { 'aria-invalid': false }
  }

  function renderError(name) {
    return (
      fieldErrors[name] && (
        <span id={id(`${name}-error`)} className="field-error" role="alert">
          {fieldErrors[name]}
        </span>
      )
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')

    const errors = {}
    if (!title.trim()) errors.title = 'Title is required.'
    if (!severity) errors.severity = 'Severity is required.'
    if (!steps.some((step) => step.trim())) errors.steps = 'At least one step to reproduce is required.'
    if (!expected.trim()) errors.expected = 'Expected result is required.'
    if (!actual.trim()) errors.actual = 'Actual result is required.'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const firstInvalid = errors.title
        ? id('title')
        : errors.severity
          ? id('severity')
          : errors.steps
            ? id(`steps-${Math.max(0, steps.findIndex((step) => !step.trim()))}`)
            : errors.expected
              ? id('expected')
              : id('actual')
      document.getElementById(firstInvalid)?.focus()
      return
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      severity,
      priority,
      steps_to_reproduce: steps.map((step) => step.trim()).filter(Boolean),
      expected: expected.trim(),
      actual: actual.trim(),
      environment: environment.trim(),
    }
    if (isEdit) payload.version = openedVersion.current

    await runOnce(async () => {
      setSaving(true)
      try {
        const saved = isEdit ? await updateBug(bug.id, payload) : await createBug(payload)
        onSaved(saved, { created: !isEdit })
        onClose()
      } catch (err) {
        if (err.status === 404) {
          setSubmitError('This bug no longer exists. It was probably deleted in another tab or window. Close this form and go back to the list.')
          onStale?.()
        } else {
          setSubmitError(err.message)
          if (err.status === 409) onStale?.()
        }
      } finally {
        setSaving(false)
      }
    })
  }

  return (
    <>
      <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && requestClose()}>
        <div className="modal-card" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={id('heading')}>
          <div className="modal-header">
            <h2 id={id('heading')}>{isEdit ? 'Edit Bug' : 'New Bug'}</h2>
            <button type="button" className="modal-close" aria-label="Close" disabled={saving} onClick={requestClose}>
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor={id('title')}>Title *</label>
              <input
                id={id('title')}
                ref={titleInputRef}
                type="text"
                value={title}
                maxLength={LIMITS.title}
                aria-required="true"
                placeholder="Short summary of the problem"
                onChange={(e) => setTitle(e.target.value)}
                {...errorProps('title')}
              />
              {renderError('title')}
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor={id('severity')}>Severity *</label>
                <select
                  id={id('severity')}
                  value={severity}
                  aria-required="true"
                  onChange={(e) => setSeverity(e.target.value)}
                  {...errorProps('severity')}
                >
                  <option value="" disabled>
                    Select severity
                  </option>
                  {BUG_SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {renderError('severity')}
              </div>

              <div className="field">
                <label htmlFor={id('priority')}>Priority</label>
                <select id={id('priority')} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {BUG_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor={id('description')}>Description</label>
              <textarea
                id={id('description')}
                value={description}
                maxLength={LIMITS.description}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <TextListField
              id={id('steps')}
              label="Steps to reproduce *"
              itemLabel="Step"
              values={steps}
              onChange={setSteps}
              maxItems={LIMITS.steps}
              maxItemLength={LIMITS.listItem}
              numbered
              error={fieldErrors.steps}
            />

            <div className="field">
              <label htmlFor={id('expected')}>Expected result *</label>
              <textarea
                id={id('expected')}
                value={expected}
                maxLength={LIMITS.expected}
                rows={2}
                aria-required="true"
                onChange={(e) => setExpected(e.target.value)}
                {...errorProps('expected')}
              />
              {renderError('expected')}
            </div>

            <div className="field">
              <label htmlFor={id('actual')}>Actual result *</label>
              <textarea
                id={id('actual')}
                value={actual}
                maxLength={LIMITS.actual}
                rows={2}
                aria-required="true"
                onChange={(e) => setActual(e.target.value)}
                {...errorProps('actual')}
              />
              {renderError('actual')}
            </div>

            <div className="field">
              <label htmlFor={id('environment')}>Environment</label>
              <input
                id={id('environment')}
                type="text"
                value={environment}
                maxLength={LIMITS.environment}
                placeholder="Browser, operating system, build, for example Chrome 126 on macOS 14"
                onChange={(e) => setEnvironment(e.target.value)}
              />
            </div>

            {submitError && (
              <p className="form-error" role="alert">
                {submitError}
              </p>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" disabled={saving} onClick={requestClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Report Bug'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {confirmDiscard && (
        <ConfirmDialog
          title="Discard your changes?"
          confirmLabel="Discard changes"
          onConfirm={onClose}
          onCancel={() => setConfirmDiscard(false)}
        >
          <p>You have unsaved changes. If you close now, they will be lost.</p>
        </ConfirmDialog>
      )}
    </>
  )
}

export default BugFormModal
