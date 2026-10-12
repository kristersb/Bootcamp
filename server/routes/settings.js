const express = require('express')
const db = require('../db')

const router = express.Router()

const THEMES = ['light', 'dark', 'system']
const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
const PAGE_SIZES = [10, 20, 50, 100]
const LIMITS = { timezone: 100 }

function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null })
}

function sendError(res, status, error) {
  return res.status(status).json({ success: false, data: null, error })
}

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value })
    return true
  } catch {
    return false
  }
}

function serialize(row) {
  return { ...row, auto_generate_report_after_run: row.auto_generate_report_after_run === 1 }
}

function getPreferences() {
  return db.prepare('SELECT * FROM user_preferences WHERE id = 1').get()
}

function handleGetSettings(req, res) {
  return sendSuccess(res, serialize(getPreferences()))
}

// A full-form save: the client's Settings page submits every field together, so a partial body is rejected
// rather than silently leaving old values in place.
function handleUpdateSettings(req, res) {
  const { theme, defaultSeverityForNewBugs, defaultPageSize, timezone, autoGenerateReportAfterRun } = req.body

  const errors = []
  if (!THEMES.includes(theme)) errors.push(`theme must be one of ${THEMES.join(', ')}`)
  if (!SEVERITIES.includes(defaultSeverityForNewBugs)) errors.push(`defaultSeverityForNewBugs must be one of ${SEVERITIES.join(', ')}`)
  if (!PAGE_SIZES.includes(defaultPageSize)) errors.push(`defaultPageSize must be one of ${PAGE_SIZES.join(', ')}`)
  if (typeof autoGenerateReportAfterRun !== 'boolean') errors.push('autoGenerateReportAfterRun must be true or false')
  if (timezone !== null && typeof timezone !== 'string') {
    errors.push('timezone must be a string or null')
  } else if (typeof timezone === 'string') {
    if (!timezone.trim()) errors.push('timezone must not be blank')
    else if (timezone.length > LIMITS.timezone) errors.push(`timezone can be at most ${LIMITS.timezone} characters`)
    else if (!isValidTimeZone(timezone)) errors.push('timezone is not a recognized time zone')
  }
  if (errors.length) return sendError(res, 400, errors.join('; '))

  db.prepare(
    `UPDATE user_preferences
     SET theme = @theme, default_severity_for_new_bugs = @severity, default_page_size = @pageSize,
         timezone = @timezone, auto_generate_report_after_run = @autoReport, updated_at = datetime('now')
     WHERE id = 1`
  ).run({
    theme,
    severity: defaultSeverityForNewBugs,
    pageSize: defaultPageSize,
    timezone: timezone === null ? null : timezone.trim(),
    autoReport: autoGenerateReportAfterRun ? 1 : 0,
  })

  return sendSuccess(res, serialize(getPreferences()))
}

router.get('/', handleGetSettings)
router.put('/', handleUpdateSettings)

module.exports = router
