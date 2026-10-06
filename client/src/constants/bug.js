import { SEVERITIES } from './testCase'

// Severity values come from CLAUDE.md and are shared with test cases.
export const BUG_SEVERITIES = SEVERITIES
export const BUG_STATUSES = ['open', 'in-progress', 'resolved', 'closed', 'reopened']
export const BUG_PRIORITIES = ['low', 'medium', 'high']

// Keep in sync with LIMITS in server/routes/bugs.js.
export const BUG_LIMITS = {
  title: 200,
  description: 5000,
  listItem: 500,
  steps: 50,
  expected: 2000,
  actual: 2000,
  environment: 300,
  message: 2000,
}
