# [Test Suites] Picker shows only the first 20 matches

**Severity:** Minor
**Status:** draft

## Preconditions
- At least 21 test cases exist (for example 25).
- Open a suite detail page.

## Steps
1. Click "+ Add cases".
2. Count the rows in the picker.
3. Read the note under the list.
4. Type a search term that matches only 1 case.

## Expected Result
The picker shows 20 rows. A note says that only the first 20 of the total matches are shown and to refine the search. After step 4 one row shows and the note is gone.
