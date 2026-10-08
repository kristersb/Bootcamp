# [Reports] /reports/:id detail page shows the full report

**Severity:** Major
**Status:** draft

## Preconditions
A report exists with a mix of passed, failed and skipped cases.

## Steps
1. Navigate to /reports/<id>.

## Expected Result
The page shows the suite name, run date, total/passed/failed/skipped counts, the full list of test case results with their outcomes, and both a "Download HTML" and a "Print / Save as PDF" button.
