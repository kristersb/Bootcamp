# [Test Suites] API rejects a testCaseId that is not a positive integer

**Severity:** Minor
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Suite S exists.

## Steps
1. Send POST /api/test-suites/S/cases with body `{"testCaseId":"abc"}`.
2. Send POST /api/test-suites/S/cases with body `{"testCaseId":0}`.
3. Send POST /api/test-suites/S/cases with body `{}`.

## Expected Result
Each request returns HTTP 400 with success false, data null and an error message that says testCaseId must be a positive integer. The suite is unchanged.
