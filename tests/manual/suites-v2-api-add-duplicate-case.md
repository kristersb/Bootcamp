# [Test Suites] API returns 409 when adding a test case that is already in the suite

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Suite S contains test case 11 only.

## Steps
1. Send POST /api/test-suites/S/cases with body `{"testCaseId":11}`.
2. Send GET /api/test-suites/S.

## Expected Result
Step 1 returns HTTP 409 with success false, data null and an error message that says the case is already in the suite. In step 2 the suite still holds case 11 exactly once.
