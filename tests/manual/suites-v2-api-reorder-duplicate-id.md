# [Test Suites] API rejects a reorder list with a repeated id

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Suite S contains test cases 11, 12, 13 in that order.

## Steps
1. Send PUT /api/test-suites/S/cases/order with body `{"caseIds":[11,11,12]}`.
2. Send PUT /api/test-suites/S/cases/order with body `{"caseIds":[11,12,13,13]}`.
3. Send GET /api/test-suites/S.

## Expected Result
Steps 1 and 2 return HTTP 400 with success false, data null and an error message that says caseIds must list every case exactly once. In step 3 the order is still 11, 12, 13.
