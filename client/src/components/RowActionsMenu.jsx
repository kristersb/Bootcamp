import { useEffect, useRef, useState } from 'react'
import './RowActionsMenu.css'

function RowActionsMenu({ label = 'Row actions', onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (open) menuRef.current?.querySelector('[role="menuitem"]')?.focus()
  }, [open])

  function closeAndFocusTrigger() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function runAction(action) {
    // Focus goes back to the trigger first, so a dialog opened by the action can return focus here.
    closeAndFocusTrigger()
    action()
  }

  function handleKeyDown(event) {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeAndFocusTrigger()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
      const current = items.indexOf(document.activeElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      items[(current + step + items.length) % items.length].focus()
    }
  }

  function handleBlur(event) {
    // Close when focus moves to something outside the menu (for example by pressing Tab).
    if (open && event.relatedTarget && !containerRef.current.contains(event.relatedTarget)) setOpen(false)
  }

  return (
    <div className="row-actions" ref={containerRef} onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <button
        type="button"
        ref={triggerRef}
        className="row-actions-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">⋮</span>
      </button>
      {open && (
        <div className="row-actions-menu" role="menu" aria-label={label} ref={menuRef}>
          <button type="button" role="menuitem" onClick={() => runAction(onEdit)}>
            Edit
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => runAction(onDelete)}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default RowActionsMenu
