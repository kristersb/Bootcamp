# [Test Suites] API rejects a reorder list that leaves out a case

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Suite S contains test cases 11, 12, 13 in that order.

## Steps
1. Send PUT /api/test-suites/S/cases/order with body `{"caseIds":[13,11]}`.
2. Send GET /api/test-suites/S.

## Expected Result
Step 1 returns HTTP 400 with success false, data null and an error message that says caseIds must list every case exactly once. In step 2 the order is still 11, 12, 13.
