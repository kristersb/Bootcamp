# [Test Suites] API rejects whitespace-only and empty name and feature

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send POST /api/test-suites with body `{"name":"   ","feature":"login"}`.
2. Send POST /api/test-suites with body `{"name":"A","feature":"   "}`.
3. Send POST /api/test-suites with body `{"name":"","feature":""}`.

## Expected Result
Each request returns HTTP 400 with success false, data null and an error message that says the field (or fields) are required. No suite is created.
