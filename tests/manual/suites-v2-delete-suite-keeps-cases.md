# [Test Suites] Deleting a suite keeps its test cases

**Severity:** Critical
**Status:** draft

## Preconditions
A suite "Doomed suite" contains 2 cases, "Case A" and "Case B". Open its detail page.

## Steps
1. Click "Delete".
2. Read the dialog text.
3. Click "Delete suite".
4. Open /test-cases and search for "Case A" and "Case B".

## Expected Result
The dialog is titled "Delete test suite?", names "Doomed suite" and says the 2 test cases will be kept. After confirming, the app opens /test-suites and "Doomed suite" is not listed. "Case A" and "Case B" are still on /test-cases.
