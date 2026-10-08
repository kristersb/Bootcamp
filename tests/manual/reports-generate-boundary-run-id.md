# [Reports] API rejects invalid run_id formats when generating a report

**Severity:** Minor
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send POST /api/reports with body `{"run_id": 0}`.
2. Send POST /api/reports with body `{"run_id": -1}`.
3. Send POST /api/reports with body `{"run_id": "abc"}`.
4. Send POST /api/reports with body `{"run_id": ""}`.
5. Send POST /api/reports with body `{"run_id": "   "}`.
6. Send POST /api/reports with body `{"run_id": "11111111111111111111111111111111111111111111111111"}` (a 50-digit number).

## Expected Result
Each request returns HTTP 400 with success false, data null and an error message that says run_id must be a positive whole number. No report is created for any of them.
