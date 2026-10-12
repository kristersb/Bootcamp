const express = require('express')
const db = require('../db')
const { asyncHandler } = require('../async-handler')
const { buildFailureAlert, buildFlakyAlert, sendDiscordMessage } = require('../discord')
const { getCaseFlakiness, FLAKY_ALERT_THRESHOLD } = require('../flakiness')

const router = express.Router()

const RUN_STATUSES = ['in-progress', 'passed', 'failed']
const RESULTS = ['passed', 'failed', 'skipped']
const PAGE_SIZE = 20

const LOCKED_MESSAGE = 'This run is completed and locked. Its results can no longer be changed.'

const LIMITS = {
  notes: 2000,
  createdBy: 100,
  durationMs: 24 * 60 * 60 * 1000,
}

// Results whose Discord alert is being sent right now, so two overlapping requests cannot send it twice.
const alertsInFlight = new Set()
// Same purpose as alertsInFlight, but keyed by test_case_id instead of result_id: flakiness is a property of
// the case across all its runs, not of one result row.
const flakyAlertsInFlight = new Set()

const RUN_WITH_TOTAL_SQL = `
  SELECT r.*, (SELECT COUNT(*) FROM test_run_results WHERE run_id = r.id) AS total_count
  FROM test_runs_v2 r`

function sendSuccess(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null })
}

function sendError(res, status, error) {
  return res.status(status).json({ success: false, data: null, error })
}

// Plain digits only. Number() would also accept forms like "1e0", "0x1", "1.0" and " 1" as ids.
function parseId(value) {
  return /^[1-9]\d{0,14}$/.test(String(value)) ? Number(value) : null
}

// Same format as datetime('now'): UTC, "YYYY-MM-DD HH:MM:SS".
function sqlNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

function withPending(run) {
  return { ...run, pending_count: run.total_count - run.pass_count - run.fail_count - run.skip_count }
}

function findRun(id) {
  const row = id ? db.prepare(`${RUN_WITH_TOTAL_SQL} WHERE r.id = ?`).get(id) : undefined
  return row ? withPending(row) : undefined
}

function buildRunDetail(id) {
  const run = findRun(id)
  if (!run) return null
  const results = db
    .prepare('SELECT * FROM test_run_results WHERE run_id = ? ORDER BY sort_order ASC, id ASC')
    .all(id)
    .map((row) => ({ ...row, alert_sent: row.alert_sent === 1 }))
  return { ...run, results }
}

// The counts are always derived from the results, never edited directly. The status and end time are not touched
// here: a run stays "in-progress" until someone completes it (see handleCompleteTestRun).
function recomputeRun(runId) {
  const counts = db
    .prepare(
      `SELECT COALESCE(SUM(result = 'passed'), 0) AS passed,
              COALESCE(SUM(result = 'failed'), 0) AS failed,
              COALESCE(SUM(result = 'skipped'), 0) AS skipped
       FROM test_run_results WHERE run_id = ?`
    )
    .get(runId)

  db.prepare('UPDATE test_runs_v2 SET pass_count = @passed, fail_count = @failed, skip_count = @skipped WHERE id = @runId').run({
    runId,
    passed: counts.passed,
    failed: counts.failed,
    skipped: counts.skipped,
  })
}

function handleListTestRuns(req, res) {
  const { status, suite_id: suiteId, page } = req.query

  for (const [name, value] of Object.entries({ status, suite_id: suiteId, page })) {
    if (value !== undefined && typeof value !== 'string') return sendError(res, 400, `${name} must be a single value`)
  }
  if (status && !RUN_STATUSES.includes(status)) return sendError(res, 400, `status must be one of ${RUN_STATUSES.join(', ')}`)
  if (suiteId !== undefined && !parseId(suiteId)) return sendError(res, 400, 'suite_id must be a positive whole number')
  if (page !== undefined && !/^[1-9]\d*$/.test(page)) return sendError(res, 400, 'page must be a whole number, 1 or more')

  const where = []
  const params = {}
  if (status) {
    where.push('r.status = @status')
    params.status = status
  }
  if (suiteId) {
    where.push('r.suite_id = @suiteId')
    params.suiteId = Number(suiteId)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM test_runs_v2 r ${whereSql}`).get(params)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(Number(page || 1), totalPages)

  const items = db
    .prepare(
      `${RUN_WITH_TOTAL_SQL} ${whereSql}
       ORDER BY r.start_time DESC, r.id DESC
       LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE })
    .map(withPending)

  return sendSuccess(res, { items, total, page: currentPage, pageSize: PAGE_SIZE })
}

function handleGetTestRun(req, res) {
  const run = buildRunDetail(parseId(req.params.id))
  if (!run) return sendError(res, 404, 'Test run not found')
  return sendSuccess(res, run)
}

function handleCreateTestRun(req, res) {
  const { suite_id: rawSuiteId, created_by: createdBy } = req.body

  const suiteId = parseId(rawSuiteId)
  if (!suiteId) return sendError(res, 400, 'suite_id must be a positive whole number')
  if (createdBy !== undefined && (typeof createdBy !== 'string' || createdBy.trim().length > LIMITS.createdBy)) {
    return sendError(res, 400, `created_by must be text of at most ${LIMITS.createdBy} characters`)
  }

  const suite = db.prepare('SELECT id, name FROM test_suites WHERE id = ?').get(suiteId)
  if (!suite) return sendError(res, 404, 'Test suite not found')

  // The cases are copied inside the same transaction, so the run holds exactly the suite's cases at this moment.
  const runId = db.transaction(() => {
    const cases = db
      .prepare(
        `SELECT t.id, t.title
         FROM test_suite_cases c JOIN test_cases t ON t.id = c.test_case_id
         WHERE c.suite_id = ? ORDER BY c.sort_order ASC`
      )
      .all(suiteId)
    if (cases.length === 0) return null

    const id = db
      .prepare('INSERT INTO test_runs_v2 (suite_id, suite_name, start_time, created_by) VALUES (?, ?, ?, ?)')
      .run(suite.id, suite.name, sqlNow(), (createdBy || '').trim() || 'anonymous').lastInsertRowid

    const insertResult = db.prepare(
      'INSERT INTO test_run_results (run_id, test_case_id, case_title, sort_order) VALUES (?, ?, ?, ?)'
    )
    cases.forEach((testCase, index) => insertResult.run(id, testCase.id, testCase.title, index + 1))
    return id
  })()

  if (runId === null) return sendError(res, 400, 'This suite has no test cases to run. Add cases to the suite first.')
  return sendSuccess(res, buildRunDetail(runId), 201)
}

function validateResultUpdate(body) {
  const errors = []
  const { result, notes, duration_ms: durationMs } = body

  if (result === undefined && notes === undefined && durationMs === undefined) {
    errors.push('provide at least one of result, notes or duration_ms')
  }
  if (result !== undefined && !RESULTS.includes(result)) errors.push(`result must be one of ${RESULTS.join(', ')}`)
  if (notes !== undefined && (typeof notes !== 'string' || notes.trim().length > LIMITS.notes)) {
    errors.push(`notes must be text of at most ${LIMITS.notes} characters`)
  }
  if (durationMs !== undefined && durationMs !== null) {
    if (!Number.isInteger(durationMs) || durationMs < 0 || durationMs > LIMITS.durationMs) {
      errors.push(`duration_ms must be a whole number from 0 to ${LIMITS.durationMs}, or null to clear it`)
    }
  }
  return errors
}

// Async, so it is wrapped with asyncHandler where it is registered (Express 4 would not catch a rejection).
async function handleUpdateTestRunResult(req, res) {
  const runId = parseId(req.params.id)
  const resultId = parseId(req.params.resultId)
  const run = findRun(runId)
  if (!run) return sendError(res, 404, 'Test run not found')
  if (run.locked_at) return sendError(res, 409, LOCKED_MESSAGE)

  const errors = validateResultUpdate(req.body)
  if (errors.length) return sendError(res, 400, errors.join('; '))

  const fields = {
    result: req.body.result,
    notes: req.body.notes === undefined ? undefined : req.body.notes.trim(),
    duration_ms: req.body.duration_ms,
  }

  const outcome = db.transaction(() => {
    // Checked again inside the transaction: the run may have been completed since the check above.
    if (db.prepare('SELECT locked_at FROM test_runs_v2 WHERE id = ?').get(runId).locked_at) return { locked: true }

    const row = resultId ? db.prepare('SELECT * FROM test_run_results WHERE id = ? AND run_id = ?').get(resultId, runId) : undefined
    if (!row) return { notFound: true }

    const nextResult = fields.result !== undefined ? fields.result : row.result
    const resultChanged = fields.result !== undefined && fields.result !== row.result
    const movedToFailed = resultChanged && fields.result === 'failed'
    const now = sqlNow()

    // A new result starts a fresh alert state, because any earlier alert was about a different outcome.
    const alertSent = resultChanged ? 0 : row.alert_sent
    const alertSentAt = resultChanged ? null : row.alert_sent_at
    const alertError = resultChanged ? null : row.alert_error

    db.prepare(
      `UPDATE test_run_results
       SET result = @result, notes = @notes, duration_ms = @duration, failed_at = @failedAt, recorded_at = @recordedAt,
           alert_sent = @alertSent, alert_sent_at = @alertSentAt, alert_error = @alertError
       WHERE id = @id`
    ).run({
      id: row.id,
      result: nextResult,
      notes: fields.notes !== undefined ? fields.notes : row.notes,
      duration: fields.duration_ms !== undefined ? fields.duration_ms : row.duration_ms,
      failedAt: nextResult === 'failed' ? (movedToFailed ? now : row.failed_at || now) : null,
      recordedAt: resultChanged || !row.recorded_at ? now : row.recorded_at,
      alertSent,
      alertSentAt,
      alertError,
    })
    recomputeRun(runId)

    // An alert goes out only when this request sets the result to failed and none was sent for this failure yet.
    // Clicking Fail again therefore retries a failed alert, while saving notes alone never sends one.
    return {
      row: db.prepare('SELECT * FROM test_run_results WHERE id = ?').get(row.id),
      needsAlert: fields.result === 'failed' && alertSent === 0,
      alreadySent: fields.result === 'failed' && alertSent === 1,
      resultChanged,
    }
  })()

  if (outcome.locked) return sendError(res, 409, LOCKED_MESSAGE)
  if (outcome.notFound) return sendError(res, 404, 'Test case result not found in this run')

  let alert = { status: outcome.alreadySent ? 'already_sent' : 'not_needed' }

  if (outcome.needsAlert) {
    if (alertsInFlight.has(resultId)) {
      alert = { status: 'in_flight' }
    } else {
      alertsInFlight.add(resultId)
      try {
        const run = findRun(runId)
        const sent = await sendDiscordMessage(
          buildFailureAlert({ runId, suiteName: run.suite_name, caseTitle: outcome.row.case_title, notes: outcome.row.notes })
        )

        // Record the outcome only if the case is still failed; if it was changed while Discord was answering,
        // that failure no longer exists and its alert state was already reset.
        const stillFailed = db.prepare('SELECT result FROM test_run_results WHERE id = ?').get(resultId)?.result === 'failed'
        if (stillFailed) {
          db.prepare('UPDATE test_run_results SET alert_sent = ?, alert_sent_at = ?, alert_error = ? WHERE id = ?').run(
            sent.sent ? 1 : 0,
            sent.sent ? sqlNow() : null,
            sent.sent ? null : sent.error,
            resultId
          )
        }
        alert = sent.sent ? { status: 'sent' } : { status: 'failed', error: sent.error }
      } finally {
        alertsInFlight.delete(resultId)
      }
    }
  }

  // The flaky-test alert is independent of the failure alert above - both can fire off the same update (a 4th
  // failure can be both a fresh "test failed" alert and the one that flips the case to 100% flaky).
  let flakyAlert = { status: 'not_applicable' }
  const testCaseId = outcome.row.test_case_id

  if (outcome.resultChanged && testCaseId) {
    const flakiness = getCaseFlakiness(testCaseId)

    if (flakiness?.eligible) {
      const insight = db.prepare('SELECT flaky_alert_sent FROM flaky_test_insights WHERE test_case_id = ?').get(testCaseId)
      const alreadySent = insight?.flaky_alert_sent === 1

      if (flakiness.score >= FLAKY_ALERT_THRESHOLD && alreadySent) {
        flakyAlert = { status: 'already_sent' }
      } else if (flakiness.score >= FLAKY_ALERT_THRESHOLD && !alreadySent) {
        if (flakyAlertsInFlight.has(testCaseId)) {
          flakyAlert = { status: 'in_flight' }
        } else {
          flakyAlertsInFlight.add(testCaseId)
          try {
            const sent = await sendDiscordMessage(buildFlakyAlert(flakiness))
            db.prepare('INSERT OR IGNORE INTO flaky_test_insights (test_case_id) VALUES (?)').run(testCaseId)
            db.prepare(
              'UPDATE flaky_test_insights SET flaky_alert_sent = ?, flaky_alert_sent_at = ?, flaky_alert_score = ? WHERE test_case_id = ?'
            ).run(sent.sent ? 1 : 0, sent.sent ? sqlNow() : null, flakiness.score, testCaseId)
            flakyAlert = sent.sent ? { status: 'sent' } : { status: 'failed', error: sent.error }
          } finally {
            flakyAlertsInFlight.delete(testCaseId)
          }
        }
      } else if (flakiness.score < FLAKY_ALERT_THRESHOLD && alreadySent) {
        // Score dropped back below the threshold: re-arm, so a future re-crossing alerts again.
        db.prepare('UPDATE flaky_test_insights SET flaky_alert_sent = 0, flaky_alert_sent_at = NULL WHERE test_case_id = ?').run(
          testCaseId
        )
      }
    }
  }

  return sendSuccess(res, { ...buildRunDetail(runId), alert: { result_id: resultId, ...alert }, flaky_alert: flakyAlert })
}

// Completing a run locks its results for good. Allowed only once every case has an outcome. The caller may send the
// counts it showed the person ("expected"); if the results changed since, the run is not locked on stale information.
function handleCompleteTestRun(req, res) {
  const runId = parseId(req.params.id)
  if (!findRun(runId)) return sendError(res, 404, 'Test run not found')

  const { expected } = req.body
  if (expected !== undefined) {
    const valid =
      expected !== null &&
      typeof expected === 'object' &&
      ['passed', 'failed', 'skipped'].every((key) => Number.isInteger(expected[key]) && expected[key] >= 0)
    if (!valid) return sendError(res, 400, 'expected must be an object with whole-number passed, failed and skipped counts')
  }

  const outcome = db.transaction(() => {
    const run = findRun(runId)
    if (run.locked_at) return { error: 'This run is already completed and locked.' }
    if (run.pending_count > 0) {
      return {
        error: `${run.pending_count} test case${run.pending_count === 1 ? ' still needs' : 's still need'} an outcome. Record a result for every case before completing the run.`,
      }
    }
    if (expected && (expected.passed !== run.pass_count || expected.failed !== run.fail_count || expected.skipped !== run.skip_count)) {
      return { error: 'The results changed after you opened this page. Review them and try again.' }
    }

    const now = sqlNow()
    db.prepare('UPDATE test_runs_v2 SET status = @status, end_time = @now, locked_at = @now WHERE id = @runId').run({
      runId,
      now,
      status: run.fail_count > 0 ? 'failed' : 'passed',
    })
    return {}
  })()

  if (outcome.error) return sendError(res, 409, outcome.error)
  return sendSuccess(res, buildRunDetail(runId))
}

router.get('/', handleListTestRuns)
router.post('/', handleCreateTestRun)
router.get('/:id', handleGetTestRun)
router.patch('/:id/results/:resultId', asyncHandler(handleUpdateTestRunResult))
router.post('/:id/complete', handleCompleteTestRun)

module.exports = router
