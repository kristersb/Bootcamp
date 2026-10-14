import { useEffect, useRef } from 'react'
import './TestCaseFormModal.css'

// A group of text inputs the user can add to and remove from, such as the steps to reproduce a bug.
function TextListField({
  id,
  label,
  itemLabel,
  values,
  onChange,
  maxItems,
  maxItemLength,
  numbered = false,
  error,
}) {
  const pendingFocus = useRef(null)

  useEffect(() => {
    if (pendingFocus.current !== null) {
      document.getElementById(`${id}-${pendingFocus.current}`)?.focus()
      pendingFocus.current = null
    }
  })

  function update(index, value) {
    onChange(values.map((item, i) => (i === index ? value : item)))
  }

  function add() {
    pendingFocus.current = values.length
    onChange([...values, ''])
  }

  function remove(index) {
    if (values.length === 1) return
    pendingFocus.current = Math.max(0, index - 1)
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div className="field" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="field-label">
        {label}
      </span>
      {values.map((value, index) => (
        <div className="list-row" key={index}>
          {numbered && (
            <span className="step-number" aria-hidden="true">
              {index + 1}.
            </span>
          )}
          <input
            id={`${id}-${index}`}
            type="text"
            value={value}
            maxLength={maxItemLength}
            aria-label={`${itemLabel} ${index + 1}`}
            onChange={(e) => update(index, e.target.value)}
            {...(error && !value.trim() ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {})}
          />
          <button
            type="button"
            className="list-remove"
            aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
            onClick={() => remove(index)}
            disabled={values.length === 1}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="add-list-item"
        onClick={add}
        disabled={values.length >= maxItems}
        title={values.length >= maxItems ? `You can add up to ${maxItems} ${itemLabel.toLowerCase()}s.` : undefined}
        aria-describedby={values.length >= maxItems ? `${id}-limit` : undefined}
      >
        + Add {itemLabel.toLowerCase()}
      </button>
      {values.length >= maxItems && (
        <span id={`${id}-limit`} className="field-hint" role="status">
          You've reached the limit of {maxItems} {itemLabel.toLowerCase()}s.
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export default TextListField
