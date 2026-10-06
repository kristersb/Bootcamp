# [Test Suites] Add a test case to a suite with the picker

**Severity:** Critical
**Status:** draft

## Preconditions
- An empty suite exists. Open its detail page.
- A test case titled "Case A" exists.

## Steps
1. Click "+ Add cases".
2. In the picker, find "Case A" and click "Add" next to it.
3. Click "Done".
4. Reload the page.

## Expected Result
After step 2 the button next to "Case A" reads "Added" and is disabled. After "Done" the suite list shows "1. Case A" and the heading reads "Cases (1)". After reload the case is still there.
