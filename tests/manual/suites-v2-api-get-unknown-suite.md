# [Test Suites] API returns 404 for a suite id that does not exist

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. No suite has id 999999.

## Steps
1. Send GET /api/test-suites/999999.

## Expected Result
HTTP 404 with success false, data null and an error message that says the suite was not found.
