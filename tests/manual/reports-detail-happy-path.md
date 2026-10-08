# [Reports] Fetch a single report's full detail

**Severity:** Major
**Status:** draft

## Preconditions
A report has been generated from a test run with a mix of passed, failed and skipped cases.

## Steps
1. Send GET /api/reports/<id>.

## Expected Result
HTTP 200 with success true and a data object containing all report fields (id, run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, generated_at) plus a results array listing every test case from the run with its title and outcome, in the same order as the run.
