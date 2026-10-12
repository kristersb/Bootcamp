import { useEffect, useState } from 'react'
import { SEVERITIES } from '../constants/testCase'
import { useSettings } from '../context/SettingsContext'
import { useSingleFlight } from '../hooks/use-single-flight'
import './TestCasesPage.css'
import './SettingsPage.css'

const THEMES = ['light', 'dark', 'system']
const PAGE_SIZES = [10, 20, 50, 100]

const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone
// Not supported on every browser (notably older Safari); fall back to a free-text field rather than an empty list.
const TIMEZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : null

function SettingsPage() {
  const { settings, loadError, save } = useSettings()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const runOnce = useSingleFlight()

  // Seeds the editable form from the loaded settings. Re-runs only if the settings identity changes (a save
  // replaces it), so typing in the form between loads never gets clobbered by this effect.
  useEffect(() => {
    if (settings) {
      setForm({
        theme: settings.theme,
        default_severity_for_new_bugs: settings.default_severity_for_new_bugs,
        default_page_size: settings.default_page_size,
        timezone: settings.timezone ?? BROWSER_TIMEZONE,
        auto_generate_report_after_run: settings.auto_generate_report_after_run,
      })
    }
  }, [settings])

  function update(field, value) {
    setSaved(false)
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaveError('')
    await runOnce(async () => {
      setSaving(true)
      try {
        await save({
          theme: form.theme,
          defaultSeverityForNewBugs: form.default_severity_for_new_bugs,
          defaultPageSize: Number(form.default_page_size),
          timezone: form.timezone,
          autoGenerateReportAfterRun: form.auto_generate_report_after_run,
        })
        setSaved(true)
      } catch (err) {
        setSaveError(err.message)
      } finally {
        setSaving(false)
      }
    })
  }

  return (
    <div className="test-cases-page settings-page">
      <div className="test-cases-header">
        <h1>Settings</h1>
      </div>

      {loadError && (
        <p className="form-error" role="alert">
          Could not load settings: {loadError}
        </p>
      )}

      {form && (
        <form onSubmit={handleSubmit}>
          <fieldset className="settings-group">
            <legend>Appearance</legend>
            <div className="field">
              <label htmlFor="theme">Theme</label>
              <select id="theme" value={form.theme} onChange={(e) => update('theme', e.target.value)}>
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'system' ? 'Match system' : t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="settings-group">
            <legend>Bugs</legend>
            <div className="field">
              <label htmlFor="default-severity">Default severity for new bugs</label>
              <select
                id="default-severity"
                value={form.default_severity_for_new_bugs}
                onChange={(e) => update('default_severity_for_new_bugs', e.target.value)}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="settings-group">
            <legend>Test cases</legend>
            <div className="field">
              <label htmlFor="default-page-size">Default page size</label>
              <select
                id="default-page-size"
                value={form.default_page_size}
                onChange={(e) => update('default_page_size', e.target.value)}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="settings-group">
            <legend>Locale</legend>
            <div className="field">
              <label htmlFor="timezone">Timezone</label>
              {TIMEZONES ? (
                <select id="timezone" value={form.timezone} onChange={(e) => update('timezone', e.target.value)}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="timezone"
                  type="text"
                  value={form.timezone}
                  maxLength={100}
                  onChange={(e) => update('timezone', e.target.value)}
                />
              )}
            </div>
          </fieldset>

          <fieldset className="settings-group">
            <legend>Automation</legend>
            <div className="field field-checkbox">
              <label htmlFor="auto-report">
                <input
                  id="auto-report"
                  type="checkbox"
                  checked={form.auto_generate_report_after_run}
                  onChange={(e) => update('auto_generate_report_after_run', e.target.checked)}
                />
                Automatically generate a report when a run completes
              </label>
            </div>
          </fieldset>

          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}

          <div className="settings-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saved && !saving && (
              <span className="notice settings-saved" role="status">
                Saved.
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

export default SettingsPage
