# [Test Suites] API removing a case renumbers the remaining cases

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. A suite with id S contains test cases with ids 11 (sort_order 1), 12 (2), 13 (3). Use any HTTP client.

## Steps
1. Send DELETE /api/test-suites/S/cases/12.
2. Read the response body.
3. Send GET /api/test-suites/S.

## Expected Result
Both responses have success true and error null. The data.cases list is ids 11 and 13 with sort_order 1 and 2, with no gap. The test case 12 still exists in GET /api/test-cases.
