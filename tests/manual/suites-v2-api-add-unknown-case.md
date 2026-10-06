# [Test Suites] API returns 404 when adding a test case that does not exist

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Suite S exists. No test case has id 999999.

## Steps
1. Send POST /api/test-suites/S/cases with body `{"testCaseId":999999}`.
2. Send GET /api/test-suites/S.

## Expected Result
Step 1 returns HTTP 404 with success false, data null and an error message that says the test case was not found. The suite in step 2 is unchanged.
