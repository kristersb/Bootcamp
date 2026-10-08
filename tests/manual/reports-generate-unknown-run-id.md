# [Reports] API returns 404 for a run_id that doesn't exist

**Severity:** Minor
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Note an id with correct format but no matching test run (e.g. the highest existing run id plus 1000).

## Steps
1. Send POST /api/reports with body `{"run_id": <id that doesn't exist>}`.

## Expected Result
HTTP 404 with success false, data null and an error message that says the test run was not found. No report row is created.
