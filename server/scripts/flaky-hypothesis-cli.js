#!/usr/bin/env node
// CLI used by the .claude/agents/flake-analyzer.md agent. It never computes a flakiness score itself - all
// scoring goes through server/flakiness.js, so the agent and the live API can never disagree on a case's score.
//
// Usage:
//   node server/scripts/flaky-hypothesis-cli.js list
//   node server/scripts/flaky-hypothesis-cli.js save <testCaseId> "<hypothesis text>"

const db = require('../db')
const { getLeaderboard } = require('../flakiness')

function cmdList() {
  // getLeaderboard includes eligible-but-never-flipped cases (score 0) too, kept for leaderboard contrast -
  // but there's no root cause to hypothesize about for a case that has never actually flipped, so only
  // genuinely flaky cases (score > 0) are handed to the agent.
  const cases = getLeaderboard(50)
    .filter((entry) => entry.score > 0)
    .map((entry) => {
      const testCase = db
        .prepare('SELECT preconditions, steps, expected_result FROM test_cases WHERE id = ?')
        .get(entry.test_case_id)
      return {
        ...entry,
        preconditions: testCase ? JSON.parse(testCase.preconditions) : [],
        steps: testCase ? JSON.parse(testCase.steps) : [],
        expected_result: testCase ? testCase.expected_result : null,
      }
    })
  process.stdout.write(JSON.stringify(cases, null, 2) + '\n')
}

function cmdSave(testCaseIdArg, hypothesis) {
  const testCaseId = Number(testCaseIdArg)
  if (!Number.isInteger(testCaseId) || testCaseId <= 0) {
    console.error('Error: <testCaseId> must be a positive whole number.')
    process.exit(1)
  }
  if (!hypothesis || !hypothesis.trim()) {
    console.error('Error: hypothesis text must not be blank.')
    process.exit(1)
  }

  const testCase = db.prepare('SELECT id FROM test_cases WHERE id = ?').get(testCaseId)
  if (!testCase) {
    console.error(`Error: no test case with id ${testCaseId}.`)
    process.exit(1)
  }

  db.prepare('INSERT OR IGNORE INTO flaky_test_insights (test_case_id) VALUES (?)').run(testCaseId)
  db.prepare(
    `UPDATE flaky_test_insights
     SET hypothesis = ?, hypothesis_computed_at = datetime('now'), hypothesis_computed_by = 'flake-analyzer'
     WHERE test_case_id = ?`
  ).run(hypothesis.trim(), testCaseId)

  process.stdout.write(`Saved hypothesis for test case ${testCaseId}.\n`)
}

const [, , command, ...args] = process.argv

if (command === 'list') {
  cmdList()
} else if (command === 'save') {
  cmdSave(args[0], args[1])
} else {
  console.error('Usage:\n  node server/scripts/flaky-hypothesis-cli.js list\n  node server/scripts/flaky-hypothesis-cli.js save <testCaseId> "<hypothesis text>"')
  process.exit(1)
}
