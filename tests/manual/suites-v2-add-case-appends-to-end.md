# [Test Suites] A newly added case goes to the end of the order

**Severity:** Major
**Status:** draft

## Preconditions
- A suite contains "Case A" (1) and "Case B" (2).
- A test case "Case C" exists and is not in the suite.

## Steps
1. Open the suite detail page.
2. Click "+ Add cases".
3. Click "Add" next to "Case C".
4. Click "Done".

## Expected Result
The list reads 1. Case A, 2. Case B, 3. Case C. The heading reads "Cases (3)".
