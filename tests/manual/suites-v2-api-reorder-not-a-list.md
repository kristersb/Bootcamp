# [Test Suites] API rejects a reorder body that is not a list of positive integers

**Severity:** Minor
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Suite S contains test cases 11, 12.

## Steps
1. Send PUT /api/test-suites/S/cases/order with body `{"caseIds":"11,12"}`.
2. Send PUT /api/test-suites/S/cases/order with body `{"caseIds":["a","b"]}`.
3. Send PUT /api/test-suites/S/cases/order with body `{}`.
4. Send PUT /api/test-suites/S/cases/order with body `{"caseIds":[0,-1]}`.

## Expected Result
Each request returns HTTP 400 with success false, data null and an error message that says caseIds must be a list of positive integers. The suite order is unchanged.
