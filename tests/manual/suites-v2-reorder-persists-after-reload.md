# [Test Suites] New case order is kept after a page reload

**Severity:** Critical
**Status:** draft

## Preconditions
A suite contains "Case A" (1), "Case B" (2), "Case C" (3). Open its detail page.

## Steps
1. Click "↓" on "Case A" so the order is Case B, Case A, Case C.
2. Wait until the hint no longer reads "Saving...".
3. Reload the page.
4. Open /test-suites, then open the suite again.

## Expected Result
After the reload and after reopening the suite, the order is still 1. Case B, 2. Case A, 3. Case C.
