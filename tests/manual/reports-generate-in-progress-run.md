# [Reports] Generate a report from a run that is still in progress

**Severity:** Minor
**Status:** draft

## Preconditions
A test run exists with status "in-progress" (not completed/locked) and at least one case still pending.

## Steps
1. Send POST /api/reports with body `{"run_id": <id of the in-progress run>}`.

## Expected Result
The request succeeds (HTTP 201) and creates a report using the run's current counts, with any not-yet-run cases shown as pending in the results array. Confirm this is the intended behavior with the developer — if snapshots of incomplete runs should be blocked instead, this should return an error explaining the run must be completed first, not silently save partial data as final.
