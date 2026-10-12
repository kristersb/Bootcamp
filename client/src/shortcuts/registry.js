// Single source of truth for every keyboard shortcut in the app: the global key handler (useShortcutKeys)
// and the "?" help modal both read this same array, so a shortcut can never drift out of sync with its
// own documentation. Add a shortcut here first; the handler and the help modal pick it up automatically.

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || '')

export const MOD_KEY_LABEL = isMac ? 'Cmd' : 'Ctrl'

export const SHORTCUTS = [
  {
    id: 'quick-search',
    display: `${MOD_KEY_LABEL}+K`,
    description: 'Open quick search',
    category: 'Global',
  },
  {
    id: 'help',
    display: '?',
    description: 'Show keyboard shortcuts',
    category: 'Global',
  },
  {
    id: 'nav-dashboard',
    display: 'G then D',
    description: 'Go to Dashboard',
    category: 'Navigation',
    sequenceKey: 'd',
    to: '/',
  },
  {
    id: 'nav-test-cases',
    display: 'G then T',
    description: 'Go to Test Cases',
    category: 'Navigation',
    sequenceKey: 't',
    to: '/test-cases',
  },
  {
    id: 'nav-bugs',
    display: 'G then B',
    description: 'Go to Bugs',
    category: 'Navigation',
    sequenceKey: 'b',
    to: '/bugs',
  },
  {
    id: 'nav-test-runs',
    display: 'G then R',
    description: 'Go to Test Runs',
    category: 'Navigation',
    sequenceKey: 'r',
    to: '/test-runs',
  },
]

// Derived, not hand-maintained: a second "d -> /" map here would be the exact drift this registry exists to prevent.
export const SEQUENCE_DESTINATIONS = Object.fromEntries(
  SHORTCUTS.filter((s) => s.sequenceKey).map((s) => [s.sequenceKey, s.to])
)
