# [Test Suites] Picker shows "Added" for cases already in the suite

**Severity:** Major
**Status:** draft

## Preconditions
A suite contains "Case A". A test case "Case B" exists and is not in the suite. Open the suite detail page.

## Steps
1. Click "+ Add cases".
2. Look at the buttons next to "Case A" and "Case B".
3. Click the button next to "Case A".

## Expected Result
"Case A" shows a disabled button labelled "Added". "Case B" shows an enabled "Add" button. Clicking the "Added" button does nothing and "Case A" stays in the suite once.
