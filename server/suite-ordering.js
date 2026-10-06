const db = require('./db')

function touchSuite(suiteId) {
  db.prepare("UPDATE test_suites SET updated_at = datetime('now') WHERE id = ?").run(suiteId)
}

function resequenceSuite(suiteId) {
  const rows = db
    .prepare('SELECT test_case_id FROM test_suite_cases WHERE suite_id = ? ORDER BY sort_order ASC')
    .all(suiteId)
  const setOrder = db.prepare('UPDATE test_suite_cases SET sort_order = ? WHERE suite_id = ? AND test_case_id = ?')
  rows.forEach((row, index) => setOrder.run(index + 1, suiteId, row.test_case_id))
}

module.exports = { touchSuite, resequenceSuite }
