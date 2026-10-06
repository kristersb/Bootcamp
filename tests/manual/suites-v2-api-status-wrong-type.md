# [Test Suites] API rejects a status sent as a number

**Severity:** Minor
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send POST /api/test-suites with body `{"name":"A","feature":"b","status":1}`.

## Expected Result
HTTP 400 with success false, data null and an error message that says the status must be one of the allowed values. No suite is created.
