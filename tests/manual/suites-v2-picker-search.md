# [Test Suites] Picker search narrows the list by title

**Severity:** Major
**Status:** draft

## Preconditions
- Test cases titled "Login works", "Login fails" and "Checkout works" exist.
- Open a suite detail page.

## Steps
1. Click "+ Add cases".
2. In the search box, type "login".
3. Wait one second.
4. Clear the search box.

## Expected Result
After step 3 the picker lists "Login works" and "Login fails" and does not list "Checkout works". After step 4 all cases are listed again.
