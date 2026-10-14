import { useEffect, useId, useRef, useState } from 'react'
import { SEVERITIES, STATUSES, TEST_CASE_LIMITS as LIMITS } from '../constants/testCase'
import { createTestCase, updateTestCase } from '../api/testCases'
import { useDialog } from '../hooks/use-dialog'
import { useSingleFlight } from '../hooks/use-single-flight'
import ConfirmDialog from './ConfirmDialog'
import './TestCaseFormModal.css'

function blankList(list) {
  return list && list.length ? list : ['']
}

// CLAUDE.md: titles must start with the feature area in brackets, e.g. "[Login] ...".
const TITLE_PATTERN = /^\[[^[\]]+\]\s+\S/
const TITLE_HELP =
  'Title must start with the feature area in brackets, followed by a space and a short description, e.g. "[Login] Successful login with valid credentials".'

function TestCaseFormModal({ testCase, onClose, onSaved, onStale }) {
  const isEdit = Boolean(testCase)
  const uid = useId()
  const id = (name) => `${uid}-${name}`

  const [title, setTitle] = useState(testCase?.title ?? '')
  const [preconditions, setPreconditions] = useState(blankList(testCase?.preconditions))
  const [steps, setSteps] = useState(blankList(testCase?.steps))
  const [expectedResult, setExpectedResult] = useState(testCase?.expected_result ?? '')
  const [severity, setSeverity] = useState(testCase?.severity ?? '')
  const [status, setStatus] = useState(testCase?.status ?? 'draft')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const runOnce = useSingleFlight()
  const dialogRef = useRef(null)
  const titleInputRef = useRef(null)
  const pendingFocusId = useRef(null)
  const initialSnapshot = useRef(null)

  const currentSnapshot = JSON.stringify({ title, preconditions, steps, expectedResult, severity, status })
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

  useEffect(() => {
    if (pendingFocusId.current) {
      document.getElementById(pendingFocusId.current)?.focus()
      pendingFocusId.current = null
    }
  })

  function updatePrecondition(index, value) {
    setPreconditions((prev) => prev.map((p, i) => (i === index ? value : p)))
  }

  function addPrecondition() {
    pendingFocusId.current = id(`pre-${preconditions.length}`)
    setPreconditions((prev) => [...prev, ''])
  }

  function removePrecondition(index) {
    if (preconditions.length === 1) return
    pendingFocusId.current = id(`pre-${Math.max(0, index - 1)}`)
    setPreconditions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateStep(index, value) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)))
  }

  function addStep() {
    pendingFocusId.current = id(`step-${steps.length}`)
    setSteps((prev) => [...prev, ''])
  }

  function removeStep(index) {
    if (steps.length === 1) return
    pendingFocusId.current = id(`step-${Math.max(0, index - 1)}`)
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

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

    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean)
    const errors = {}
    if (!title.trim()) {
      errors.title = 'Title is required.'
    } else if (!TITLE_PATTERN.test(title.trim())) {
      errors.title = TITLE_HELP
    }
    if (cleanSteps.length === 0) errors.steps = 'At least one step is required.'
    if (!expectedResult.trim()) errors.expectedResult = 'Expected result is required.'
    if (!severity) errors.severity = 'Severity is required.'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const firstInvalid = errors.title
        ? id('title')
        : errors.steps
          ? id(`step-${Math.max(0, steps.findIndex((s) => !s.trim()))}`)
          : errors.expectedResult
            ? id('expectedResult')
            : id('severity')
      document.getElementById(firstInvalid)?.focus()
      return
    }

    const payload = {
      title: title.trim(),
      preconditions: preconditions.map((p) => p.trim()).filter(Boolean),
      steps: cleanSteps,
      expectedResult: expectedResult.trim(),
      severity,
      status,
    }
    if (isEdit) payload.version = testCase.version

    await runOnce(async () => {
      setSaving(true)
      try {
        if (isEdit) {
          await updateTestCase(testCase.id, payload)
        } else {
          await createTestCase(payload)
        }
        onSaved({ created: !isEdit })
        onClose()
      } catch (err) {
        if (err.status === 404) {
          setSubmitError(
            'This test case no longer exists. It was probably deleted in another tab or window. Close this form; the list has been refreshed.'
          )
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
            <h2 id={id('heading')}>{isEdit ? 'Edit Test Case' : 'Add Test Case'}</h2>
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
                onChange={(e) => setTitle(e.target.value)}
                placeholder="[Feature area] Short description"
                {...errorProps('title')}
              />
              {renderError('title')}
            </div>

            <div className="field" role="group" aria-labelledby={id('pre-label')}>
              <span id={id('pre-label')} className="field-label">
                Preconditions
              </span>
              {preconditions.map((precondition, index) => (
                <div className="list-row" key={index}>
                  <input
                    id={id(`pre-${index}`)}
                    type="text"
                    value={precondition}
                    maxLength={LIMITS.listItem}
                    aria-label={`Precondition ${index + 1}`}
                    onChange={(e) => updatePrecondition(index, e.target.value)}
                  />
                  <button
                    type="button"
                    className="list-remove"
                    aria-label={`Remove precondition ${index + 1}`}
                    onClick={() => removePrecondition(index)}
                    disabled={preconditions.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-list-item"
                onClick={addPrecondition}
                disabled={preconditions.length >= LIMITS.preconditions}
                title={
                  preconditions.length >= LIMITS.preconditions
                    ? `You can add up to ${LIMITS.preconditions} preconditions.`
                    : undefined
                }
                aria-describedby={preconditions.length >= LIMITS.preconditions ? id('pre-limit') : undefined}
              >
                + Add precondition
              </button>
              {preconditions.length >= LIMITS.preconditions && (
                <span id={id('pre-limit')} className="field-hint" role="status">
                  You've reached the limit of {LIMITS.preconditions} preconditions.
                </span>
              )}
            </div>

            <div className="field" role="group" aria-labelledby={id('steps-label')}>
              <span id={id('steps-label')} className="field-label">
                Steps *
              </span>
              {steps.map((step, index) => (
                <div className="list-row" key={index}>
                  <span className="step-number" aria-hidden="true">
                    {index + 1}.
                  </span>
                  <input
                    id={id(`step-${index}`)}
                    type="text"
                    value={step}
                    maxLength={LIMITS.listItem}
                    aria-label={`Step ${index + 1}`}
                    onChange={(e) => updateStep(index, e.target.value)}
                    {...(fieldErrors.steps && !step.trim()
                      ? { 'aria-invalid': true, 'aria-describedby': id('steps-error') }
                      : {})}
                  />
                  <button
                    type="button"
                    className="list-remove"
                    aria-label={`Remove step ${index + 1}`}
                    onClick={() => removeStep(index)}
                    disabled={steps.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-list-item"
                onClick={addStep}
                disabled={steps.length >= LIMITS.steps}
                title={steps.length >= LIMITS.steps ? `You can add up to ${LIMITS.steps} steps.` : undefined}
                aria-describedby={steps.length >= LIMITS.steps ? id('steps-limit') : undefined}
              >
                + Add step
              </button>
              {steps.length >= LIMITS.steps && (
                <span id={id('steps-limit')} className="field-hint" role="status">
                  You've reached the limit of {LIMITS.steps} steps.
                </span>
              )}
              {renderError('steps')}
            </div>

            <div className="field">
              <label htmlFor={id('expectedResult')}>Expected Result *</label>
              <textarea
                id={id('expectedResult')}
                value={expectedResult}
                maxLength={LIMITS.expectedResult}
                aria-required="true"
                onChange={(e) => setExpectedResult(e.target.value)}
                rows={2}
                {...errorProps('expectedResult')}
              />
              {renderError('expectedResult')}
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
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {renderError('severity')}
              </div>

              <div className="field">
                <label htmlFor={id('status')}>Status *</label>
                <select id={id('status')} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
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
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Test Case'}
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

export default TestCaseFormModal
