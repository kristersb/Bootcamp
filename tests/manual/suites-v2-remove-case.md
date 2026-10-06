# [Test Suites] Remove a case from the middle of a suite

**Severity:** Major
**Status:** draft

## Preconditions
A suite contains "Case A" (1), "Case B" (2), "Case C" (3). Open its detail page.

## Steps
1. Click the "×" button on the "Case B" row.
2. Reload the page.
3. Open /test-cases and search for "Case B".

## Expected Result
After step 1 the list reads 1. Case A, 2. Case C and the heading reads "Cases (2)". The order holds after reload. "Case B" still exists on /test-cases.
