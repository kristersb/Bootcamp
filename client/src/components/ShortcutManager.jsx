import { useCallback, useState } from 'react'
import { useGlobalShortcuts } from '../hooks/use-global-shortcuts'
import QuickSearchModal from './QuickSearchModal'
import ShortcutsHelpModal from './ShortcutsHelpModal'

// Mounted once at the app root. Owns which shortcut-triggered modal (if any) is open, and suspends the
// global key handler while one is, so the modal's own keyboard handling doesn't race the global one.
function ShortcutManager() {
  const [open, setOpen] = useState(null) // null | 'search' | 'help'

  const openSearch = useCallback(() => setOpen('search'), [])
  const openHelp = useCallback(() => setOpen('help'), [])
  const close = useCallback(() => setOpen(null), [])

  useGlobalShortcuts({ suspended: open !== null, onOpenSearch: openSearch, onOpenHelp: openHelp })

  return (
    <>
      {open === 'search' && <QuickSearchModal onClose={close} />}
      {open === 'help' && <ShortcutsHelpModal onClose={close} />}
    </>
  )
}

export default ShortcutManager
