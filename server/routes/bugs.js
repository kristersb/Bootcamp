const express = require('express')
const db = require('../db')

const router = express.Router()

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
const STATUSES = ['open', 'in-progress', 'resolved', 'closed', 'reopened']
const PRIORITIES = ['low', 'medium', 'high']
const ORDERS = ['asc', 'desc']
const PAGE_SIZE = 20

// The only allowed status moves. Everything else is rejected.
const TRANSITIONS = {
  open: ['in-progress', 'closed'],
  'in-progress': ['resolved', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['in-progress', 'closed'],
}

const LIMITS = {
  title: 200,
  description: 5000,
  listItem: 500,
  steps: 50,
  expected: 2000,
  actual: 2000,
  environment: 300,
  message: 2000,
  search: 200,
}

const SORT_SQL = {
  updated_at: 'updated_at',
  created_at: 'created_at',
  title: 'title COLLATE NOCASE',
  severity: `CASE severity WHEN 'Critical' THEN 4 WHEN 'Major' THEN 3 WHEN 'Minor' THEN 2 WHEN 'Trivial' THEN 1 END`,
  priority: `CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 END`,
  status: `CASE status WHEN 'open' THEN 1 WHEN 'in-progress' THEN 2 WHEN 'resolved' THEN 3 WHEN 'closed' THEN 4 WHEN 'reopened' THEN 5 END`,
}

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

function rowToBug(row) {
  const { steps_to_reproduce: steps, ...rest } = row
  return { ...rest, steps_to_reproduce: JSON.parse(steps) }
}

function findBug(id) {
  const row = id ? db.prepare('SELECT * FROM bugs WHERE id = ?').get(id) : undefined
  return row ? rowToBug(row) : undefined
}

function buildBugDetail(id) {
  const bug = findBug(id)
  if (!bug) return null
  const activity = db.prepare('SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY id DESC').all(id)
  return { ...bug, allowed_transitions: TRANSITIONS[bug.status], activity }
}

function validateOptionalText(value, label, max) {
  if (value === undefined) return null
  if (typeof value !== 'string') return `${label} must be text`
  if (value.trim().length > max) return `${label} can be at most ${max} characters`
  return null
}

function validateRequiredText(value, label, max) {
  if (typeof value !== 'string' || !value.trim()) return `${label} is required`
  if (value.trim().length > max) return `${label} can be at most ${max} characters`
  return null
}

function validateBugInput(body) {
  const errors = []
  const { title, description, severity, priority, steps_to_reproduce: steps, expected, actual, environment, version } = body

  const checks = [
    validateRequiredText(title, 'title', LIMITS.title),
    validateOptionalText(description, 'description', LIMITS.description),
    validateRequiredText(expected, 'expected', LIMITS.expected),
    validateRequiredText(actual, 'actual', LIMITS.actual),
    validateOptionalText(environment, 'environment', LIMITS.environment),
  ]
  checks.forEach((problem) => problem && errors.push(problem))

  if (!SEVERITIES.includes(severity)) errors.push(`severity must be one of ${SEVERITIES.join(', ')}`)
  if (priority !== undefined && !PRIORITIES.includes(priority)) errors.push(`priority must be one of ${PRIORITIES.join(', ')}`)

  if (!Array.isArray(steps) || !steps.every((step) => typeof step === 'string')) {
    errors.push('steps_to_reproduce must be a list of text')
  } else if (steps.length > LIMITS.steps) {
    errors.push(`steps_to_reproduce can have at most ${LIMITS.steps} steps`)
  } else if (steps.some((step) => step.trim().length > LIMITS.listItem)) {
    errors.push(`each step can be at most ${LIMITS.listItem} characters`)
  } else if (!steps.some((step) => step.trim())) {
    errors.push('steps_to_reproduce must include at least one step')
  }

  if (version !== undefined && !Number.isInteger(version)) errors.push('version must be a whole number')

  return errors
}

function cleanBugFields(body) {
  return {
    title: body.title.trim(),
    description: (body.description || '').trim(),
    severity: body.severity,
    priority: body.priority || 'medium',
    steps: JSON.stringify(body.steps_to_reproduce.map((step) => step.trim()).filter(Boolean)),
    expected: body.expected.trim(),
    actual: body.actual.trim(),
    environment: (body.environment || '').trim(),
  }
}

function handleListBugs(req, res) {
  const { status, severity, priority, search, sort, order, page } = req.query

  for (const [name, value] of Object.entries({ status, severity, priority, search, sort, order, page })) {
    if (value !== undefined && typeof value !== 'string') return sendError(res, 400, `${name} must be a single value`)
  }
  if (status && !STATUSES.includes(status)) return sendError(res, 400, `status must be one of ${STATUSES.join(', ')}`)
  if (severity && !SEVERITIES.includes(severity)) return sendError(res, 400, `severity must be one of ${SEVERITIES.join(', ')}`)
  if (priority && !PRIORITIES.includes(priority)) return sendError(res, 400, `priority must be one of ${PRIORITIES.join(', ')}`)
  // hasOwn, not a plain lookup: SORT_SQL["constructor"] and similar inherited names are truthy functions.
  if (sort !== undefined && !Object.hasOwn(SORT_SQL, sort)) {
    return sendError(res, 400, `sort must be one of ${Object.keys(SORT_SQL).join(', ')}`)
  }
  if (order !== undefined && !ORDERS.includes(order)) return sendError(res, 400, `order must be one of ${ORDERS.join(', ')}`)
  if (page !== undefined && !/^[1-9]\d*$/.test(page)) return sendError(res, 400, 'page must be a whole number, 1 or more')
  if (search !== undefined && search.trim().length > LIMITS.search) {
    return sendError(res, 400, `search can be at most ${LIMITS.search} characters`)
  }

  const where = []
  const params = {}

  for (const [column, value] of Object.entries({ status, severity, priority })) {
    if (value) {
      where.push(`${column} = @${column}`)
      params[column] = value
    }
  }

  const searchText = (search || '').trim()
  if (searchText) {
    // Escape LIKE wildcards so "%" and "_" are searched for literally.
    where.push("(title LIKE @search ESCAPE '\\' OR description LIKE @search ESCAPE '\\')")
    params.search = `%${searchText.replace(/[\\%_]/g, '\\$&')}%`
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sortSql = SORT_SQL[sort || 'updated_at']
  const orderSql = order === 'asc' ? 'ASC' : 'DESC'

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM bugs ${whereSql}`).get(params)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(Number(page || 1), totalPages)

  // "id" breaks ties so rows with equal sort values keep a stable order between pages.
  const rows = db
    .prepare(
      `SELECT * FROM bugs ${whereSql}
       ORDER BY ${sortSql} ${orderSql}, id ${orderSql}
       LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE })

  return sendSuccess(res, { items: rows.map(rowToBug), total, page: currentPage, pageSize: PAGE_SIZE })
}

function handleGetBug(req, res) {
  const bug = buildBugDetail(parseId(req.params.id))
  if (!bug) return sendError(res, 404, 'Bug not found')
  return sendSuccess(res, bug)
}

function handleCreateBug(req, res) {
  const errors = validateBugInput(req.body)
  if (req.body.status !== undefined && req.body.status !== 'open') errors.push('a new bug always starts as open')
  if (errors.length) return sendError(res, 400, errors.join('; '))

  const fields = cleanBugFields(req.body)

  const id = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO bugs (title, description, severity, priority, steps_to_reproduce, expected, actual, environment)
         VALUES (@title, @description, @severity, @priority, @steps, @expected, @actual, @environment)`
      )
      .run(fields)
    db.prepare("INSERT INTO bug_activity (bug_id, action, new_value) VALUES (?, 'created', 'open')").run(
      result.lastInsertRowid
    )
    return result.lastInsertRowid
  })()

  return sendSuccess(res, buildBugDetail(id), 201)
}

function handleUpdateBug(req, res) {
  const id = parseId(req.params.id)
  const existing = findBug(id)
  if (!existing) return sendError(res, 404, 'Bug not found')

  const errors = validateBugInput(req.body)
  if (req.body.status !== undefined && req.body.status !== existing.status) {
    errors.push('status cannot be changed here; use PATCH /api/bugs/:id/status')
  }
  if (errors.length) return sendError(res, 400, errors.join('; '))

  // Editors send the version they loaded. If it changed, someone else saved or moved the bug first.
  if (req.body.version !== undefined && req.body.version !== existing.version) {
    return sendError(
      res,
      409,
      'This bug was changed after you opened it. Close the form and open it again to see the latest version.'
    )
  }

  db.prepare(
    `UPDATE bugs
     SET title = @title, description = @description, severity = @severity, priority = @priority,
         steps_to_reproduce = @steps, expected = @expected, actual = @actual, environment = @environment,
         updated_at = datetime('now'), version = version + 1
     WHERE id = @id`
  ).run({ ...cleanBugFields(req.body), id })

  return sendSuccess(res, buildBugDetail(id))
}

function handleDeleteBug(req, res) {
  const id = parseId(req.params.id)
  if (!findBug(id)) return sendError(res, 404, 'Bug not found')

  db.prepare('DELETE FROM bugs WHERE id = ?').run(id)
  return sendSuccess(res, { id })
}

function handleChangeBugStatus(req, res) {
  const id = parseId(req.params.id)
  if (!findBug(id)) return sendError(res, 404, 'Bug not found')

  const { status, message, from } = req.body
  if (!STATUSES.includes(status)) return sendError(res, 400, `status must be one of ${STATUSES.join(', ')}`)
  if (from !== undefined && !STATUSES.includes(from)) return sendError(res, 400, `from must be one of ${STATUSES.join(', ')}`)
  const messageProblem = validateOptionalText(message, 'message', LIMITS.message)
  if (messageProblem) return sendError(res, 400, messageProblem)

  // The check and the write share one transaction, so a bug cannot be moved twice from the same old status.
  const outcome = db.transaction(() => {
    const current = db.prepare('SELECT status FROM bugs WHERE id = ?').get(id).status

    // "from" is the status the person was looking at. If the bug has moved since, their choice was made on
    // out-of-date information, so refuse even when the move would be legal from the new status.
    if (from !== undefined && from !== current) {
      return { error: `This bug is no longer ${from}; it is now ${current}. Check its current status and try again.` }
    }

    if (current === status) return { error: `This bug is already ${status}.` }
    if (!TRANSITIONS[current].includes(status)) {
      const article = /^[aeiou]/.test(current) ? 'An' : 'A'
      return {
        error: `${article} ${current} bug cannot move to ${status}. From ${current} it can move to: ${TRANSITIONS[current].join(', ')}.`,
      }
    }

    db.prepare(
      "UPDATE bugs SET status = @status, updated_at = datetime('now'), version = version + 1 WHERE id = @id"
    ).run({ id, status })
    db.prepare(
      "INSERT INTO bug_activity (bug_id, action, old_value, new_value, message) VALUES (?, 'status_changed', ?, ?, ?)"
    ).run(id, current, status, (message || '').trim() || null)
    return {}
  })()

  if (outcome.error) return sendError(res, 409, outcome.error)
  return sendSuccess(res, buildBugDetail(id))
}

function handleAddBugComment(req, res) {
  const id = parseId(req.params.id)
  if (!findBug(id)) return sendError(res, 404, 'Bug not found')

  const problem = validateRequiredText(req.body.message, 'message', LIMITS.message)
  if (problem) return sendError(res, 400, problem)

  db.prepare("INSERT INTO bug_activity (bug_id, action, message) VALUES (?, 'comment', ?)").run(
    id,
    req.body.message.trim()
  )
  return sendSuccess(res, buildBugDetail(id), 201)
}

router.get('/', handleListBugs)
router.post('/', handleCreateBug)
router.get('/:id', handleGetBug)
router.put('/:id', handleUpdateBug)
router.delete('/:id', handleDeleteBug)
router.patch('/:id/status', handleChangeBugStatus)
router.post('/:id/comments', handleAddBugComment)

module.exports = router
