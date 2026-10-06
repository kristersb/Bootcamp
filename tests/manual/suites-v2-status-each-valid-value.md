# [Test Suites] Each valid status can be saved

**Severity:** Major
**Status:** draft

## Preconditions
A suite exists. Open its detail page.

## Steps
1. Click "Edit", set Status to "draft", click "Save Changes". Note the status in the header.
2. Repeat step 1 with "ready".
3. Repeat step 1 with "in-progress".
4. Repeat step 1 with "passed".
5. Repeat step 1 with "failed".
6. Open /test-suites and check the suite's Status column.

## Expected Result
The Status dropdown offers exactly these five values: draft, ready, in-progress, passed, failed. After each save the header shows the chosen status. The list shows "failed" at the end.
