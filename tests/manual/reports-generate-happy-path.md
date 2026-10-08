# [Reports] Generate a report snapshot from a completed test run

**Severity:** Critical
**Status:** draft

## Preconditions
A test run exists in test_runs_v2 with a mix of passed, failed and skipped results, and has been completed (status "passed" or "failed", locked_at set).

## Steps
1. Send POST /api/reports with body `{"run_id": <id of the completed run>}`.
2. Inspect the response.
3. Send GET /api/reports/<id returned in step 1>.

## Expected Result
Step 1 returns HTTP 201 with success true and a data object containing: a new report id, run_id matching the input, suite_name copied from the run, run_date set from the run's start time, total_count/passed_count/failed_count/skipped_count matching the run's final counts, a results array with one entry per test case (title and outcome), and a generated_at timestamp set to the current time. Step 3 returns the same data.
