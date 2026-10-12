#!/usr/bin/env node
// Sweeps every currently-flaky test case and sends a Discord alert for any that just crossed the flaky
// threshold since the last check - the same dedup/re-arm rule the live app uses in
// server/routes/test-runs.js's handleUpdateTestRunResult, just applied to every case at once instead of
// the one case a single HTTP request just updated. Reuses the exact same scoring and alert-building code,
// so this can never disagree with what the live API or the /flaky-tests page shows.
//
// Usage: node server/scripts/check-and-alert-flaky.js
// Exit code is always 0 - this is meant to be safe to run from a hook or a cron-style check, never to fail
// or block anything it's attached to.

// Run standalone (not started via server/index.js), so .env isn't loaded automatically the way it is there -
// without this, DISCORD_WEBHOOK_URL would always look unset even when .env has a real one.
const fs = require('fs')
const path = require('path')
const envFile = path.join(__dirname, '..', '..', '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

const db = require('../db')
const { getLeaderboard, FLAKY_ALERT_THRESHOLD } = require('../flakiness')
const { buildFlakyAlert, sendDiscordMessage } = require('../discord')

function sqlNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

async function main() {
  const items = getLeaderboard(50)
  const sentNow = []
  const reArmed = []
  const alreadySent = []
  const failed = []

  for (const item of items) {
    const insight = db.prepare('SELECT flaky_alert_sent FROM flaky_test_insights WHERE test_case_id = ?').get(item.test_case_id)
    const wasSent = insight?.flaky_alert_sent === 1

    if (item.score >= FLAKY_ALERT_THRESHOLD && !wasSent) {
      const sent = await sendDiscordMessage(buildFlakyAlert(item))
      db.prepare('INSERT OR IGNORE INTO flaky_test_insights (test_case_id) VALUES (?)').run(item.test_case_id)
      db.prepare(
        'UPDATE flaky_test_insights SET flaky_alert_sent = ?, flaky_alert_sent_at = ?, flaky_alert_score = ? WHERE test_case_id = ?'
      ).run(sent.sent ? 1 : 0, sent.sent ? sqlNow() : null, item.score, item.test_case_id)
      if (sent.sent) sentNow.push(item)
      else failed.push({ ...item, error: sent.error })
    } else if (item.score >= FLAKY_ALERT_THRESHOLD && wasSent) {
      alreadySent.push(item)
    } else if (item.score < FLAKY_ALERT_THRESHOLD && wasSent) {
      db.prepare('UPDATE flaky_test_insights SET flaky_alert_sent = 0, flaky_alert_sent_at = NULL WHERE test_case_id = ?').run(
        item.test_case_id
      )
      reArmed.push(item)
    }
  }

  const lines = [`Flaky-alert sweep: ${items.length} eligible case(s) checked.`]
  if (sentNow.length) lines.push(`Sent ${sentNow.length} new alert(s): ${sentNow.map((i) => `${i.case_title} (${i.score}%)`).join(', ')}`)
  if (alreadySent.length) lines.push(`${alreadySent.length} case(s) already alerted, no repeat sent.`)
  if (reArmed.length) lines.push(`${reArmed.length} case(s) dropped back below ${FLAKY_ALERT_THRESHOLD}%, re-armed for next crossing.`)
  if (failed.length) lines.push(`${failed.length} alert(s) failed to send: ${failed.map((i) => i.error).join('; ')}`)
  if (!sentNow.length && !alreadySent.length && !reArmed.length && !failed.length) lines.push('No flaky case currently meets the alert threshold.')

  process.stdout.write(lines.join('\n') + '\n')
}

main().catch((err) => {
  // Never exits non-zero: a failure here must not block or fail whatever triggered this check.
  process.stdout.write(`Flaky-alert sweep could not complete: ${err.message}\n`)
})
