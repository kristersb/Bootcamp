# [Reports] API returns 404 when exporting a report that doesn't exist

**Severity:** Minor
**Status:** draft

## Preconditions
API-only test. Use any HTTP client.

## Steps
1. Send GET /api/reports/abc/export/html.
2. Send GET /api/reports/999999/export/html (an id with correct format but no matching report).

## Expected Result
Each request returns HTTP 404 with success false, data null and an error message that says the report was not found. No file is returned.
