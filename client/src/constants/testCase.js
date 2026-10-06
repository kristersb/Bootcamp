export const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
export const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped']

// Keep in sync with LIMITS in server/routes/testCases.js.
export const TEST_CASE_LIMITS = {
  title: 200,
  listItem: 500,
  preconditions: 20,
  steps: 50,
  expectedResult: 2000,
}
