import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEQUENCE_DESTINATIONS } from '../shortcuts/registry'

// How long after a bare "g" press the next letter still counts as part of the "g then <letter>" sequence.
const SEQUENCE_TIMEOUT_MS = 1000

// Input Focus Guard: typing in a field must always write the letter, never trigger a shortcut.
function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

// Wires every global shortcut (Cmd/Ctrl+K, "g then <letter>", "?") to the app in one place. `suspended`
// turns the whole thing off while a shortcut-opened modal is already on screen, since that modal owns the
// keyboard while it's up (its own Escape/Enter/arrow handling would otherwise race this listener).
export function useGlobalShortcuts({ suspended, onOpenSearch, onOpenHelp }) {
  const navigate = useNavigate()
  const pendingG = useRef(0) // timestamp of the last bare "g" press, or 0 when no sequence is pending

  useEffect(() => {
    function handleKeyDown(event) {
      if (isTypingTarget(event.target) || suspended) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        pendingG.current = 0
        onOpenSearch()
        return
      }

      if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        pendingG.current = 0
        onOpenHelp()
        return
      }

      // Any other modifier combo (e.g. Ctrl+R to reload) is left alone and never starts or continues a sequence.
      if (event.metaKey || event.ctrlKey || event.altKey) {
        pendingG.current = 0
        return
      }

      const key = event.key.toLowerCase()

      if (pendingG.current && Date.now() - pendingG.current < SEQUENCE_TIMEOUT_MS) {
        pendingG.current = 0
        const destination = SEQUENCE_DESTINATIONS[key]
        if (destination) {
          event.preventDefault()
          navigate(destination)
        }
        return
      }

      pendingG.current = key === 'g' ? Date.now() : 0
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [suspended, navigate, onOpenSearch, onOpenHelp])
}
