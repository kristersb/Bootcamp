# [Reports] "Generate report" button on the run detail page creates a report

**Severity:** Major
**Status:** draft

## Preconditions
On a test run's detail page, for a run with at least one recorded result.

## Steps
1. Click "Generate report".
2. Wait for the action to complete.
3. Click "Generate report" again from the same run page.

## Expected Result
Step 1-2 create a new report from the current run and take the user to (or link them to) its detail page at /reports/:id, with counts matching the run at the moment the button was clicked. Step 3 creates a second, separate report rather than failing or overwriting the first.
