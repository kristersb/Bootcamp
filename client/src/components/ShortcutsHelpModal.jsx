import { useRef } from 'react'
import { SHORTCUTS } from '../shortcuts/registry'
import { useDialog } from '../hooks/use-dialog'
import './ShortcutsHelpModal.css'

// Grouped, in registry order, by the category each shortcut declares. This reads the registry directly -
// it never hand-lists a shortcut, so a new entry in registry.js shows up here automatically.
function groupByCategory(shortcuts) {
  const groups = new Map()
  for (const shortcut of shortcuts) {
    if (!groups.has(shortcut.category)) groups.set(shortcut.category, [])
    groups.get(shortcut.category).push(shortcut)
  }
  return groups
}

function ShortcutsHelpModal({ onClose }) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)

  useDialog({ dialogRef, initialFocusRef: closeButtonRef, onRequestClose: onClose })

  const groups = groupByCategory(SHORTCUTS)

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-card shortcuts-help-card"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-help-heading"
      >
        <div className="modal-header">
          <h2 id="shortcuts-help-heading">Keyboard Shortcuts</h2>
          <button type="button" className="modal-close" aria-label="Close" ref={closeButtonRef} onClick={onClose}>
            ×
          </button>
        </div>

        {[...groups.entries()].map(([category, shortcuts]) => (
          <div className="shortcuts-help-group" key={category}>
            <h3>{category}</h3>
            <dl className="shortcuts-help-list">
              {shortcuts.map((shortcut) => (
                <div className="shortcuts-help-row" key={shortcut.id}>
                  <dt>
                    <kbd>{shortcut.display}</kbd>
                  </dt>
                  <dd>{shortcut.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ShortcutsHelpModal
