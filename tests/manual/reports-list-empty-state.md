# [Reports] List reports when none have been generated

**Severity:** Minor
**Status:** draft

## Preconditions
No rows exist in the reports table (fresh database, or all reports deleted).

## Steps
1. Send GET /api/reports.

## Expected Result
HTTP 200 with success true and an empty data array. No error.
