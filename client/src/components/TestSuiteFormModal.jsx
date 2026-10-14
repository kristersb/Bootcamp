import { useRef, useState } from 'react'
import { SUITE_STATUSES, TEST_SUITE_LIMITS as LIMITS } from '../constants/test-suite'
import { createTestSuite, updateTestSuite } from '../api/test-suites'
import { useSingleFlight } from '../hooks/use-single-flight'
import { useDialog } from '../hooks/use-dialog'
import './TestCaseFormModal.css'

function TestSuiteFormModal({ suite, onClose, onSaved, onStale }) {
  const isEdit = Boolean(suite)
  const [name, setName] = useState(suite?.name ?? '')
  const [feature, setFeature] = useState(suite?.feature ?? '')
  const [status, setStatus] = useState(suite?.status ?? 'draft')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const runOnce = useSingleFlight()

  const dialogRef = useRef(null)
  const nameInputRef = useRef(null)

  // Same focus trap, initial focus and Escape-to-close every other modal in this app gets; this one had only
  // a bare Escape listener, so Tab could previously walk focus out of the dialog and into the page behind it.
  useDialog({ dialogRef, initialFocusRef: nameInputRef, onRequestClose: onClose })

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')

    const errors = {}
    if (!name.trim()) errors.name = 'Name is required.'
    if (!feature.trim()) errors.feature = 'Feature is required.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload = { name: name.trim(), feature: feature.trim(), status }
    if (isEdit) payload.version = suite.version

    await runOnce(async () => {
      setSaving(true)
      try {
        const saved = isEdit ? await updateTestSuite(suite.id, payload) : await createTestSuite(payload)
        onSaved(saved)
        onClose()
      } catch (err) {
        if (err.status === 404) {
          setSubmitError(
            'This test suite no longer exists. It was probably deleted in another tab or window. Close this form to see the latest list.'
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
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="suite-form-title">
        <div className="modal-header">
          <h2 id="suite-form-title">{isEdit ? 'Edit Test Suite' : 'New Test Suite'}</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Name *</span>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              maxLength={LIMITS.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Login regression"
            />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </label>

          <label className="field">
            <span>Feature *</span>
            <input
              type="text"
              value={feature}
              maxLength={LIMITS.feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="What this suite tests, e.g. login"
            />
            {fieldErrors.feature && <span className="field-error">{fieldErrors.feature}</span>}
          </label>

          <label className="field">
            <span>Status *</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {SUITE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Suite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TestSuiteFormModal
