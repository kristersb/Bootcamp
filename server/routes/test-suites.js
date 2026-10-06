const express = require('express')
const db = require('../db')
const { resequenceSuite, touchSuite } = require('../suite-ordering')

const router = express.Router()

const STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed']

const SUITE_WITH_COUNT_SQL = `
  SELECT s.*, (SELECT COUNT(*) FROM test_suite_cases WHERE suite_id = s.id) AS case_count
  FROM test_suites s`

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

function findSuite(id) {
  return db.prepare(`${SUITE_WITH_COUNT_SQL} WHERE s.id = ?`).get(id)
}

function buildSuiteDetail(id) {
  const suite = findSuite(id)
  if (!suite) return null
  const cases = db
    .prepare(
      `SELECT t.id, t.title, t.severity, t.status, t.updated_at, c.sort_order
       FROM test_suite_cases c
       JOIN test_cases t ON t.id = c.test_case_id
       WHERE c.suite_id = ?
       ORDER BY c.sort_order ASC`
    )
    .all(id)
  return { ...suite, cases }
}

function validateSuiteInput(body) {
  const errors = []
  const { name, feature, status } = body

  if (typeof name !== 'string' || !name.trim()) errors.push('name is required')
  if (typeof feature !== 'string' || !feature.trim()) errors.push('feature is required')
  if (status !== undefined && !STATUSES.includes(status)) errors.push(`status must be one of ${STATUSES.join(', ')}`)

  return errors
}

function handleListTestSuites(req, res) {
  const { status = '' } = req.query

  if (status && !STATUSES.includes(status)) {
    return sendError(res, 400, `status must be one of ${STATUSES.join(', ')}`)
  }

  const whereSql = status ? 'WHERE s.status = @status' : ''
  const items = db
    .prepare(`${SUITE_WITH_COUNT_SQL} ${whereSql} ORDER BY s.updated_at DESC, s.id DESC`)
    .all(status ? { status } : {})

  return sendSuccess(res, { items, total: items.length })
}

function handleGetTestSuite(req, res) {
  const suite = buildSuiteDetail(parseId(req.params.id))
  if (!suite) return sendError(res, 404, 'Test suite not found')
  return sendSuccess(res, suite)
}

function handleCreateTestSuite(req, res) {
  const errors = validateSuiteInput(req.body)
  if (errors.length) return sendError(res, 400, errors.join('; '))

  const { name, feature, status = 'draft' } = req.body
  const result = db
    .prepare('INSERT INTO test_suites (name, feature, status) VALUES (@name, @feature, @status)')
    .run({ name: name.trim(), feature: feature.trim(), status })

  return sendSuccess(res, buildSuiteDetail(result.lastInsertRowid), 201)
}

function handleUpdateTestSuite(req, res) {
  const id = parseId(req.params.id)
  if (!id || !findSuite(id)) return sendError(res, 404, 'Test suite not found')

  const errors = validateSuiteInput(req.body)
  if (errors.length) return sendError(res, 400, errors.join('; '))

  const { name, feature, status = 'draft' } = req.body
  db.prepare(
    `UPDATE test_suites
     SET name = @name, feature = @feature, status = @status, updated_at = datetime('now')
     WHERE id = @id`
  ).run({ id, name: name.trim(), feature: feature.trim(), status })

  return sendSuccess(res, buildSuiteDetail(id))
}

function handleDeleteTestSuite(req, res) {
  const id = parseId(req.params.id)
  if (!id || !findSuite(id)) return sendError(res, 404, 'Test suite not found')

  db.prepare('DELETE FROM test_suites WHERE id = ?').run(id)
  return sendSuccess(res, { id })
}

function handleAddTestSuiteCase(req, res) {
  const suiteId = parseId(req.params.id)
  if (!suiteId || !findSuite(suiteId)) return sendError(res, 404, 'Test suite not found')

  const testCaseId = parseId(req.body.testCaseId)
  if (!testCaseId) return sendError(res, 400, 'testCaseId must be a positive integer')
  if (!db.prepare('SELECT id FROM test_cases WHERE id = ?').get(testCaseId)) {
    return sendError(res, 404, 'Test case not found')
  }
  if (db.prepare('SELECT 1 FROM test_suite_cases WHERE suite_id = ? AND test_case_id = ?').get(suiteId, testCaseId)) {
    return sendError(res, 409, 'Test case is already in this suite')
  }

  db.transaction(() => {
    const { nextOrder } = db
      .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextOrder FROM test_suite_cases WHERE suite_id = ?')
      .get(suiteId)
    db.prepare('INSERT INTO test_suite_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)').run(
      suiteId,
      testCaseId,
      nextOrder
    )
    touchSuite(suiteId)
  })()

  return sendSuccess(res, buildSuiteDetail(suiteId), 201)
}

function handleRemoveTestSuiteCase(req, res) {
  const suiteId = parseId(req.params.id)
  if (!suiteId || !findSuite(suiteId)) return sendError(res, 404, 'Test suite not found')

  const testCaseId = parseId(req.params.testCaseId)
  const link = testCaseId
    ? db.prepare('SELECT 1 FROM test_suite_cases WHERE suite_id = ? AND test_case_id = ?').get(suiteId, testCaseId)
    : null
  if (!link) return sendError(res, 404, 'Test case is not in this suite')

  db.transaction(() => {
    db.prepare('DELETE FROM test_suite_cases WHERE suite_id = ? AND test_case_id = ?').run(suiteId, testCaseId)
    resequenceSuite(suiteId)
    touchSuite(suiteId)
  })()

  return sendSuccess(res, buildSuiteDetail(suiteId))
}

function handleReorderTestSuiteCases(req, res) {
  const suiteId = parseId(req.params.id)
  if (!suiteId || !findSuite(suiteId)) return sendError(res, 404, 'Test suite not found')

  const { caseIds } = req.body
  if (!Array.isArray(caseIds) || !caseIds.every((id) => parseId(id))) {
    return sendError(res, 400, 'caseIds must be a list of positive integers')
  }

  const currentIds = db
    .prepare('SELECT test_case_id FROM test_suite_cases WHERE suite_id = ?')
    .all(suiteId)
    .map((row) => row.test_case_id)
  const sameCases =
    new Set(caseIds).size === caseIds.length &&
    caseIds.length === currentIds.length &&
    caseIds.every((id) => currentIds.includes(id))
  if (!sameCases) {
    return sendError(res, 400, 'caseIds must list every case in the suite exactly once')
  }

  db.transaction(() => {
    const setOrder = db.prepare('UPDATE test_suite_cases SET sort_order = ? WHERE suite_id = ? AND test_case_id = ?')
    caseIds.forEach((id, index) => setOrder.run(index + 1, suiteId, id))
    touchSuite(suiteId)
  })()

  return sendSuccess(res, buildSuiteDetail(suiteId))
}

router.get('/', handleListTestSuites)
router.post('/', handleCreateTestSuite)
router.get('/:id', handleGetTestSuite)
router.put('/:id', handleUpdateTestSuite)
router.delete('/:id', handleDeleteTestSuite)
router.post('/:id/cases', handleAddTestSuiteCase)
router.put('/:id/cases/order', handleReorderTestSuiteCases)
router.delete('/:id/cases/:testCaseId', handleRemoveTestSuiteCase)

module.exports = router
