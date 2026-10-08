# [Reports] API returns 404 for non-numeric, zero, negative and very long report ids

**Severity:** Minor
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send GET /api/reports/abc.
2. Send GET /api/reports/0.
3. Send GET /api/reports/-1.
4. Send GET /api/reports/11111111111111111111111111111111111111111111111111 (a 50-digit number).

## Expected Result
Each request returns HTTP 404 with success false, data null and an error message that says the report was not found. The server does not return a 500 error.
