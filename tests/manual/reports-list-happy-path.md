# [Reports] List all generated reports

**Severity:** Major
**Status:** draft

## Preconditions
At least 3 reports have been generated from different test runs, at different times.

## Steps
1. Send GET /api/reports.

## Expected Result
HTTP 200 with success true and a data array containing all 3 reports, each with id, run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count and generated_at. The reports are ordered most recently generated first.
