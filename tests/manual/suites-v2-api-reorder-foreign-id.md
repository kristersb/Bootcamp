# [Test Suites] API rejects a reorder list with an id that is not in the suite

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Suite S contains test cases 11, 12, 13. Test case 14 exists but is not in S.

## Steps
1. Send PUT /api/test-suites/S/cases/order with body `{"caseIds":[11,12,14]}`.
2. Send PUT /api/test-suites/S/cases/order with body `{"caseIds":[11,12,13,14]}`.
3. Send GET /api/test-suites/S.

## Expected Result
Steps 1 and 2 return HTTP 400 with success false, data null and an error message that says caseIds must list every case exactly once. Case 14 is not added. In step 3 the order is still 11, 12, 13.
