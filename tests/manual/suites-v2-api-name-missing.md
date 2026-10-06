# [Test Suites] API rejects a request with no name

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send POST /api/test-suites with body `{"feature":"login"}`.

## Expected Result
HTTP 400 with success false, data null and an error message that says the name is required. No suite is created.
