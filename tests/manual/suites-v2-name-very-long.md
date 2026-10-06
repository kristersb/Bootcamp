# [Test Suites] Name field accepts a very long value

**Severity:** Minor
**Status:** draft

## Preconditions
App is running. Open /test-suites and click "+ New Suite". Prepare a name made of the word "Long" followed by a space, repeated 500 times (2,500 characters), ending with the word "END".

## Steps
1. Paste the prepared text into Name.
2. In Feature, type "login".
3. Click "Create Suite".
4. Open /test-suites and look at the list row.
5. Reload the suite detail page.

## Expected Result
The suite is created (there is no length limit). The full text is stored: the detail page header, after reload, ends with "END". The list and the detail page stay usable and the page layout is not broken beyond wrapping or clipping the long text.
