# [Reports] API rejects a run_id of the wrong type

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send POST /api/reports with body `{"run_id": true}`.
2. Send POST /api/reports with body `{"run_id": [1]}`.
3. Send POST /api/reports with body `{"run_id": {"id": 1}}`.
4. Send POST /api/reports with body `{"run_id": null}`.

## Expected Result
Each request returns HTTP 400 with success false, data null and an error message that says run_id must be a positive whole number. No report is created.
