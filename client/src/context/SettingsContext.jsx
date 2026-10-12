import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getSettings, updateSettings } from '../api/settings'

const SettingsContext = createContext(null)

// `color-scheme` is what this app's `light-dark()` CSS already keys off (see index.css's `:root`). Setting it
// as an inline style on <html> overrides that stylesheet rule, so "light"/"dark" force one mode and "system"
// restores following the OS, without touching any of the existing light-dark() declarations.
function applyTheme(theme) {
  document.documentElement.style.colorScheme = theme === 'system' ? 'light dark' : theme
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    getSettings()
      .then((data) => {
        if (cancelled) return
        setSettings(data)
        applyTheme(data.theme)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async (payload) => {
    const saved = await updateSettings(payload)
    setSettings(saved)
    applyTheme(saved.theme)
    return saved
  }, [])

  return <SettingsContext.Provider value={{ settings, loadError, save }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
