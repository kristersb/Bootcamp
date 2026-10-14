export const SUITE_STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed']

// Same convention as TEST_CASE_LIMITS: enforced both here (maxLength) and server-side (validateSuiteInput).
export const TEST_SUITE_LIMITS = {
  name: 200,
  feature: 100,
}
