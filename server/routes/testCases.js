const express = require('express')
const db = require('../db')
const { resequenceSuite, touchSuite } = require('../suite-ordering')

const router = express.Router()

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped']
const SORTS = ['updated_at', 'severity']
const ORDERS = ['asc', 'desc']
const PAGE_SIZE = 20

const LIMITS = {
  title: 200,
  listItem: 500,
  preconditions: 20,
  steps: 50,
  expectedResult: 2000,
  search: 200,
}

// Ranked so ORDER BY puts Critical first regardless of alphabetical order.
const SEVERITY_RANK_SQL = `CASE severity
  WHEN 'Critical' THEN 4
  WHEN 'Major' THEN 3
  WHEN 'Minor' THEN 2
  WHEN 'Trivial' THEN 1
END`

// CLAUDE.md: titles must start with the feature area in brackets, e.g. "[Login] ...".
const TITLE_PATTERN = /^\[[^[\]]+\]\s+\S/

function sendError(res, status, error) {
  return res.status(status).json({ success: false, data: null, error })
}

// Plain digits only. SQLite would otherwise read ids like "1e0" or "1.0" as 1.
router.param('id', (req, res, next, value) => {
  if (/^[1-9]\d{0,14}$/.test(value)) return next()
  return sendError(res, 404, 'Test case not found')
})

function rowToTestCase(row) {
  return { ...row, preconditions: JSON.parse(row.preconditions), steps: JSON.parse(row.steps) }
}

function validateTextList(value, label, maxItems) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return `${label} must be a list of text`
  }
  if (value.length > maxItems) return `${label} can have at most ${maxItems} items`
  if (value.some((item) => item.trim().length > LIMITS.listItem)) {
    return `each item in ${label} can be at most ${LIMITS.listItem} characters`
  }
  return null
}

function validateTestCaseInput(body) {
  const errors = []
  const { title, preconditions, steps, expectedResult, severity, status, version } = body

  if (typeof title !== 'string' || !title.trim()) {
    errors.push('title is required')
  } else if (!TITLE_PATTERN.test(title.trim())) {
    errors.push(
      'title must start with the feature area in brackets, followed by a space and a description, e.g. "[Login] Successful login with valid credentials"'
    )
  } else if (title.trim().length > LIMITS.title) {
    errors.push(`title can be at most ${LIMITS.title} characters`)
  }

  if (preconditions !== undefined) {
    const problem = validateTextList(preconditions, 'preconditions', LIMITS.preconditions)
    if (problem) errors.push(problem)
  }

  const stepsProblem = validateTextList(steps, 'steps', LIMITS.steps)
  if (stepsProblem) {
    errors.push(stepsProblem)
  } else if (!steps.some((step) => step.trim())) {
    errors.push('steps must include at least one step')
  }

  if (typeof expectedResult !== 'string' || !expectedResult.trim()) {
    errors.push('expectedResult is required')
  } else if (expectedResult.trim().length > LIMITS.expectedResult) {
    errors.push(`expectedResult can be at most ${LIMITS.expectedResult} characters`)
  }

  if (!SEVERITIES.includes(severity)) errors.push(`severity must be one of ${SEVERITIES.join(', ')}`)
  if (status !== undefined && !STATUSES.includes(status)) errors.push(`status must be one of ${STATUSES.join(', ')}`)
  if (version !== undefined && !Number.isInteger(version)) errors.push('version must be a whole number')

  return errors
}

function cleanTextList(list = []) {
  return list.map((item) => item.trim()).filter(Boolean)
}

function handleListTestCases(req, res) {
  const { search, status, sort, order, page } = req.query

  for (const [name, value] of Object.entries({ search, status, sort, order, page })) {
    if (value !== undefined && typeof value !== 'string') return sendError(res, 400, `${name} must be a single value`)
  }
  if (status && !STATUSES.includes(status)) return sendError(res, 400, `status must be one of ${STATUSES.join(', ')}`)
  if (sort !== undefined && !SORTS.includes(sort)) return sendError(res, 400, `sort must be one of ${SORTS.join(', ')}`)
  if (order !== undefined && !ORDERS.includes(order)) return sendError(res, 400, `order must be one of ${ORDERS.join(', ')}`)
  if (page !== undefined && !/^[1-9]\d*$/.test(page)) return sendError(res, 400, 'page must be a whole number, 1 or more')
  if (search !== undefined && search.trim().length > LIMITS.search) {
    return sendError(res, 400, `search can be at most ${LIMITS.search} characters`)
  }

  const where = []
  const params = {}

  const searchText = (search || '').trim()
  if (searchText) {
    // Escape LIKE wildcards so "%" and "_" are searched for literally.
    where.push("title LIKE @search ESCAPE '\\'")
    params.search = `%${searchText.replace(/[\\%_]/g, '\\$&')}%`
  }
  if (status) {
    where.push('status = @status')
    params.status = status
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sortSql = sort === 'severity' ? SEVERITY_RANK_SQL : 'updated_at'
  const orderSql = order === 'asc' ? 'ASC' : 'DESC'

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM test_cases ${whereSql}`).get(params)

  // A page past the end (for example after deleting the last row on the last page) returns the last page.
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(Number(page || 1), totalPages)

  // "id" breaks ties so rows with equal sort values keep a stable order between pages.
  const rows = db
    .prepare(
      `SELECT * FROM test_cases ${whereSql}
       ORDER BY ${sortSql} ${orderSql}, id ${orderSql}
       LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE })

  res.json({
    success: true,
    data: { items: rows.map(rowToTestCase), total, page: currentPage, pageSize: PAGE_SIZE },
    error: null,
  })
}

function handleGetTestCase(req, res) {
  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id)
  if (!row) return sendError(res, 404, 'Test case not found')
  res.json({ success: true, data: rowToTestCase(row), error: null })
}

function handleCreateTestCase(req, res) {
  const errors = validateTestCaseInput(req.body)
  if (errors.length) return sendError(res, 400, errors.join('; '))

  const { title, preconditions, steps, expectedResult, severity, status = 'draft' } = req.body

  const result = db
    .prepare(
      `INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
       VALUES (@title, @preconditions, @steps, @expectedResult, @severity, @status)`
    )
    .run({
      title: title.trim(),
      preconditions: JSON.stringify(cleanTextList(preconditions)),
      steps: JSON.stringify(cleanTextList(steps)),
      expectedResult: expectedResult.trim(),
      severity,
      status,
    })

  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ success: true, data: rowToTestCase(row), error: null })
}

function handleUpdateTestCase(req, res) {
  const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id)
  if (!existing) return sendError(res, 404, 'Test case not found')

  const errors = validateTestCaseInput(req.body)
  if (errors.length) return sendError(res, 400, errors.join('; '))

  const { title, preconditions, steps, expectedResult, severity, status = existing.status, version } = req.body

  // Editors send the version they loaded. If it changed, someone else saved first, so do not overwrite.
  if (version !== undefined && version !== existing.version) {
    return sendError(
      res,
      409,
      'This test case was changed after you opened it. Close the form and open it again to see the latest version.'
    )
  }

  db.prepare(
    `UPDATE test_cases
     SET title = @title, preconditions = @preconditions, steps = @steps, expected_result = @expectedResult,
         severity = @severity, status = @status, updated_at = datetime('now'), version = version + 1
     WHERE id = @id`
  ).run({
    id: req.params.id,
    title: title.trim(),
    preconditions: JSON.stringify(cleanTextList(preconditions)),
    steps: JSON.stringify(cleanTextList(steps)),
    expectedResult: expectedResult.trim(),
    severity,
    status,
  })

  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: rowToTestCase(row), error: null })
}

function handleListTestCaseSuites(req, res) {
  const existing = db.prepare('SELECT id FROM test_cases WHERE id = ?').get(req.params.id)
  if (!existing) return sendError(res, 404, 'Test case not found')

  const items = db
    .prepare(
      `SELECT s.id, s.name
       FROM test_suite_cases c
       JOIN test_suites s ON s.id = c.suite_id
       WHERE c.test_case_id = ?
       ORDER BY s.name COLLATE NOCASE ASC, s.id ASC`
    )
    .all(req.params.id)
  res.json({ success: true, data: { items }, error: null })
}

function handleDeleteTestCase(req, res) {
  const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id)
  if (!existing) return sendError(res, 404, 'Test case not found')

  // Suites lose this case through the foreign-key cascade, so renumber and re-stamp them in the same transaction.
  const removedFromSuites = db.transaction(() => {
    const suiteIds = db
      .prepare('SELECT suite_id FROM test_suite_cases WHERE test_case_id = ?')
      .all(req.params.id)
      .map((row) => row.suite_id)

    db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id)

    suiteIds.forEach((suiteId) => {
      resequenceSuite(suiteId)
      touchSuite(suiteId)
    })
    return suiteIds.length
  })()

  res.json({ success: true, data: { id: Number(req.params.id), removedFromSuites }, error: null })
}

router.get('/', handleListTestCases)
router.get('/:id', handleGetTestCase)
router.get('/:id/suites', handleListTestCaseSuites)
router.post('/', handleCreateTestCase)
router.put('/:id', handleUpdateTestCase)
router.delete('/:id', handleDeleteTestCase)

module.exports = router
