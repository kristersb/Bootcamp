# [Test Suites] API rejects a name sent as a number

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send POST /api/test-suites with body `{"name":123,"feature":"login"}`.
2. Send POST /api/test-suites with body `{"name":"A","feature":["login"]}`.

## Expected Result
Both requests return HTTP 400 with success false, data null and an error message that says the field is required. No suite is created.
