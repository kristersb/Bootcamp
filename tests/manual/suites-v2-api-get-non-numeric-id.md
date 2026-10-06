# [Test Suites] API returns 404 for non-numeric, zero and negative suite ids

**Severity:** Minor
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send GET /api/test-suites/abc.
2. Send GET /api/test-suites/0.
3. Send GET /api/test-suites/-1.

## Expected Result
Each request returns HTTP 404 with success false, data null and an error message that says the suite was not found. The server does not return a 500 error.
