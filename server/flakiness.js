const db = require('./db')

// The smallest sample that can produce a graded score rather than a 0%-or-100% coin flip: with 2 qualifying
// results there's only one transition slot, so a single flip is indistinguishable from a one-off fluke.
const MIN_QUALIFYING_RESULTS = 3
const MIN_RUNS = 2
// Score (0-100) a case must reach before it's considered "flaky" for the Discord alert - see server/routes/test-runs.js.
const FLAKY_ALERT_THRESHOLD = 50
const LEADERBOARD_LIMIT = 10

// Only passed/failed count toward the flakiness signal: a skip or a still-pending result says nothing about
// pass/fail stability. They're still kept in the raw history below so the UI timeline can show them.
function isQualifying(result) {
  return result === 'passed' || result === 'failed'
}

// Every result this case has ever recorded, oldest first, across every run - including skipped/pending.
function getCaseHistory(testCaseId) {
  return db
    .prepare(
      `SELECT rr.id AS result_id, rr.run_id, rr.result, r.start_time AS run_start_time
       FROM test_run_results rr
       JOIN test_runs_v2 r ON r.id = rr.run_id
       WHERE rr.test_case_id = ?
       ORDER BY r.start_time ASC, rr.sort_order ASC, rr.id ASC`
    )
    .all(testCaseId)
}

function scoreHistory(history) {
  const qualifying = history.filter((h) => isQualifying(h.result))
  const runCount = new Set(qualifying.map((h) => h.run_id)).size
  let transitions = 0
  for (let i = 1; i < qualifying.length; i++) {
    if (qualifying[i].result !== qualifying[i - 1].result) transitions++
  }
  const score = qualifying.length > 1 ? Math.round((transitions / (qualifying.length - 1)) * 100) : 0
  const eligible = qualifying.length >= MIN_QUALIFYING_RESULTS && runCount >= MIN_RUNS

  return { qualifyingCount: qualifying.length, runCount, transitions, score, eligible }
}

// Every test case id that has at least one recorded result, so the leaderboard doesn't have to scan every
// test case in the library - only ones that have actually been run.
function getAllCaseIdsWithResults() {
  return db
    .prepare('SELECT DISTINCT test_case_id FROM test_run_results WHERE test_case_id IS NOT NULL')
    .all()
    .map((row) => row.test_case_id)
}

// Full picture for one case: its score, history, and whatever root-cause hypothesis the flake-analyzer agent
// has cached for it (see .claude/agents/flake-analyzer.md) - null if the case no longer exists.
function getCaseFlakiness(testCaseId) {
  const testCase = db.prepare('SELECT id, title, severity FROM test_cases WHERE id = ?').get(testCaseId)
  if (!testCase) return null

  const history = getCaseHistory(testCaseId)
  const scored = scoreHistory(history)
  const insight = db
    .prepare('SELECT hypothesis, hypothesis_computed_at FROM flaky_test_insights WHERE test_case_id = ?')
    .get(testCaseId)

  return {
    test_case_id: testCase.id,
    case_title: testCase.title,
    severity: testCase.severity,
    ...scored,
    hypothesis: insight?.hypothesis ?? null,
    hypothesis_computed_at: insight?.hypothesis_computed_at ?? null,
    history: history.map((h) => ({ run_id: h.run_id, result: h.result, run_start_time: h.run_start_time })),
  }
}

function getLeaderboard(limit = LEADERBOARD_LIMIT) {
  return getAllCaseIdsWithResults()
    .map((id) => getCaseFlakiness(id))
    .filter((entry) => entry && entry.eligible)
    .sort((a, b) => b.score - a.score || b.transitions - a.transitions || a.case_title.localeCompare(b.case_title))
    .slice(0, limit)
}

module.exports = {
  MIN_QUALIFYING_RESULTS,
  MIN_RUNS,
  FLAKY_ALERT_THRESHOLD,
  LEADERBOARD_LIMIT,
  getCaseHistory,
  scoreHistory,
  getCaseFlakiness,
  getLeaderboard,
  getAllCaseIdsWithResults,
}
