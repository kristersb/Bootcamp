const express = require('express')
const db = require('../db')

const router = express.Router()

const RECENT_LIMIT = 10
// A bug is "open" until someone resolves or closes it. A reopened bug is open again.
const OPEN_BUG_STATUSES = ['open', 'in-progress', 'reopened']

function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null })
}

// Passed / (passed + failed) over every recorded result. Skipped cases say nothing about quality, so they are left out.
// null (not 0) when nothing has been judged yet, so the page can say "no data" instead of "0% passing".
function getPassRate() {
  const { passed, failed } = db
    .prepare(
      `SELECT COALESCE(SUM(result = 'passed'), 0) AS passed, COALESCE(SUM(result = 'failed'), 0) AS failed
       FROM test_run_results`
    )
    .get()
  const judged = passed + failed
  return judged === 0 ? null : Math.round((passed / judged) * 1000) / 10
}

// Average of the time testers recorded per run (sum of each case's duration). Runs with no recorded time are left out:
// start-to-complete would mostly measure how long a run sat open.
function getAverageRunDurationMs() {
  const row = db
    .prepare(
      `SELECT AVG(total_ms) AS average FROM (
         SELECT SUM(duration_ms) AS total_ms FROM test_run_results
         WHERE duration_ms IS NOT NULL GROUP BY run_id
       )`
    )
    .get()
  return row.average === null ? null : Math.round(row.average)
}

function handleGetDashboardMetrics(req, res) {
  const openBugs = db
    .prepare(`SELECT COUNT(*) AS count FROM bugs WHERE status IN (${OPEN_BUG_STATUSES.map(() => '?').join(', ')})`)
    .get(...OPEN_BUG_STATUSES).count

  const recentRuns = db
    .prepare(
      `SELECT id, suite_id, suite_name, status, pass_count, fail_count, skip_count, start_time, locked_at,
              (SELECT COUNT(*) FROM test_run_results WHERE run_id = test_runs_v2.id AND result IS NULL) AS pending_count
       FROM test_runs_v2 ORDER BY start_time DESC, id DESC LIMIT ?`
    )
    .all(RECENT_LIMIT)

  const recentActivity = db
    .prepare(
      `SELECT a.id, a.bug_id, b.title AS bug_title, a.action, a.old_value, a.new_value, a.created_at
       FROM bug_activity a JOIN bugs b ON b.id = a.bug_id
       ORDER BY a.created_at DESC, a.id DESC LIMIT ?`
    )
    .all(RECENT_LIMIT)

  return sendSuccess(res, {
    metrics: {
      total_test_cases: db.prepare('SELECT COUNT(*) AS count FROM test_cases').get().count,
      pass_rate: getPassRate(),
      open_bugs: openBugs,
      total_bugs: db.prepare('SELECT COUNT(*) AS count FROM bugs').get().count, // lets the page tell "no bugs yet" from "all resolved"
      average_run_duration_ms: getAverageRunDurationMs(),
    },
    recent_runs: recentRuns,
    recent_activity: recentActivity,
    generated_at: new Date().toISOString(),
  })
}

router.get('/metrics', handleGetDashboardMetrics)

module.exports = router
