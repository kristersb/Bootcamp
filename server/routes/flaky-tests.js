const express = require('express')
const { getLeaderboard, getCaseFlakiness, MIN_QUALIFYING_RESULTS, MIN_RUNS } = require('../flakiness')

const router = express.Router()

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

function handleGetFlakyLeaderboard(req, res) {
  const { limit } = req.query
  if (limit !== undefined && (typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit))) {
    return sendError(res, 400, 'limit must be a whole number, 1 or more')
  }

  const items = getLeaderboard(limit ? Math.min(Number(limit), 50) : undefined)
  return sendSuccess(res, {
    items,
    min_qualifying_results: MIN_QUALIFYING_RESULTS,
    min_runs: MIN_RUNS,
    generated_at: new Date().toISOString(),
  })
}

function handleGetCaseFlakiness(req, res) {
  const testCaseId = parseId(req.params.testCaseId)
  const data = testCaseId ? getCaseFlakiness(testCaseId) : null
  if (!data || !data.eligible) {
    return sendError(res, 404, 'Test case not found, or does not have enough recorded results to be scored yet')
  }
  return sendSuccess(res, data)
}

router.get('/leaderboard', handleGetFlakyLeaderboard)
router.get('/:testCaseId', handleGetCaseFlakiness)

module.exports = router
