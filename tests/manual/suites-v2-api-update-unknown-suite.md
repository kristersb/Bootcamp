# [Test Suites] API returns 404 when updating a suite that does not exist

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. No suite has id 999999.

## Steps
1. Send PUT /api/test-suites/999999 with body `{"name":"A","feature":"b","status":"draft"}`.

## Expected Result
HTTP 404 with success false, data null and an error message that says the suite was not found. No suite is created.
