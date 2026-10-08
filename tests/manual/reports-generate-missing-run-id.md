# [Reports] API rejects a request with no run_id

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send POST /api/reports with an empty body `{}`.

## Expected Result
HTTP 400 with success false, data null and an error message that says run_id is required. No report is created.
