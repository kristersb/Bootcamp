# [Test Suites] Picker shows an empty message when the search matches nothing

**Severity:** Minor
**Status:** draft

## Preconditions
Open a suite detail page. No test case title contains "zzzzqqqq".

## Steps
1. Click "+ Add cases".
2. In the search box, type "zzzzqqqq".
3. Wait one second.

## Expected Result
The picker shows "No test cases match your search." and no rows.
