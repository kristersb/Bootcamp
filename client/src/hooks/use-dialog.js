import { useEffect } from 'react'

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'

// Keyboard behavior every modal dialog needs: focus moves in on open, Tab stays inside,
// Escape asks to close, and focus returns to what opened it. Set enabled=false while a
// nested dialog is open so the two do not fight over the keys.
export function useDialog({ dialogRef, initialFocusRef, onRequestClose, enabled = true }) {
  useEffect(() => {
    const previouslyFocused = document.activeElement
    initialFocusRef?.current?.focus()
    return () => {
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [initialFocusRef])

  useEffect(() => {
    if (!enabled) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onRequestClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll(FOCUSABLE)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, dialogRef, onRequestClose])
}
