# [Test Suites] A suite with no cases shows the empty state

**Severity:** Minor
**Status:** draft

## Preconditions
A suite with no cases exists. Open its detail page.

## Steps
1. Read the heading above the case list.
2. Look for arrow buttons and the drag hint.
3. Click "+ Add cases", add one case, click "Done", then remove it with "×".

## Expected Result
The heading reads "Cases (0)" and the page shows `No cases in this suite yet. Use "Add cases" to build the run order.` There are no rows, arrow buttons or drag hint. After step 3 the same empty state shows again, and "+ Add cases" still works.
