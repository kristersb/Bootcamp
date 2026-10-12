const express = require('express')
const db = require('../db')

const router = express.Router()

const RECENT_LIMIT = 10
// A bug is "open" until someone resolves or closes it. A reopened bug is open again.
const OPEN_BUG_STATUSES = ['open', 'in-progress', 'reopened']

const TREND_RUN_LIMIT = 10
const TREND_WEEKS = 8
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
// Matches the enum order in CLAUDE.md, not alphabetical, so a status always lands in the same chart slot.
const TEST_CASE_STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped']
// A bug counts as "closed" the moment it moves into either of these, including a later reclose after reopening.
const CLOSED_BUG_STATUSES = ['resolved', 'closed']

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

// Same format as datetime('now'): UTC, "YYYY-MM-DD HH:MM:SS". Lets a JS Date boundary be compared against the
// stored strings directly, since both sort and compare correctly as plain text in this format.
function toSqlUtc(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

// One pass rate per run (passed / judged, skipped excluded), oldest to newest so the line reads left to right.
// null when nothing in the run has been judged yet, so the chart can show a gap instead of a false 0%.
function getPassRateTrend() {
  const runs = db
    .prepare(
      `SELECT r.id AS run_id, r.suite_name, r.start_time,
              COALESCE(SUM(res.result = 'passed'), 0) AS passed,
              COALESCE(SUM(res.result = 'failed'), 0) AS failed
       FROM test_runs_v2 r LEFT JOIN test_run_results res ON res.run_id = r.id
       GROUP BY r.id
       ORDER BY r.start_time DESC, r.id DESC
       LIMIT ?`
    )
    .all(TREND_RUN_LIMIT)

  return runs.reverse().map((run) => {
    const judged = run.passed + run.failed
    return {
      run_id: run.run_id,
      suite_name: run.suite_name,
      date: run.start_time,
      pass_rate: judged === 0 ? null : Math.round((run.passed / judged) * 1000) / 10,
    }
  })
}

// Rolling 7-day windows ending now, not calendar weeks - avoids ISO week-numbering edge cases at a year
// boundary and still reads as "the last 8 weeks." Oldest window first, so the chart reads left to right.
function getBugsPerWeek() {
  const now = Date.now()
  const openedStmt = db.prepare('SELECT COUNT(*) AS count FROM bugs WHERE created_at >= ? AND created_at < ?')
  const closedStmt = db.prepare(
    `SELECT COUNT(*) AS count FROM bug_activity
     WHERE action = 'status_changed' AND new_value IN (${CLOSED_BUG_STATUSES.map(() => '?').join(', ')})
       AND created_at >= ? AND created_at < ?`
  )

  const weeks = []
  for (let i = TREND_WEEKS - 1; i >= 0; i--) {
    const end = toSqlUtc(new Date(now - i * MS_PER_WEEK))
    const start = toSqlUtc(new Date(now - (i + 1) * MS_PER_WEEK))
    weeks.push({
      week_start: start.slice(0, 10),
      opened: openedStmt.get(start, end).count,
      closed: closedStmt.get(...CLOSED_BUG_STATUSES, start, end).count,
    })
  }
  return weeks
}

// Every known status is always present, even at 0, so the chart's segments never shift order or go missing.
function getTestCaseStatusBreakdown() {
  const rows = db.prepare('SELECT status, COUNT(*) AS count FROM test_cases GROUP BY status').all()
  const counts = Object.fromEntries(rows.map((row) => [row.status, row.count]))
  return TEST_CASE_STATUSES.map((status) => ({ status, count: counts[status] || 0 }))
}

function handleGetDashboardTrends(req, res) {
  return sendSuccess(res, {
    pass_rate_trend: getPassRateTrend(),
    bugs_per_week: getBugsPerWeek(),
    test_case_status_breakdown: getTestCaseStatusBreakdown(),
    generated_at: new Date().toISOString(),
  })
}

router.get('/metrics', handleGetDashboardMetrics)
router.get('/trends', handleGetDashboardTrends)

module.exports = router
