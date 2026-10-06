# [Test Suites] Feature field accepts a very long value

**Severity:** Minor
**Status:** draft

## Preconditions
App is running. Open /test-suites and click "+ New Suite". Prepare a feature made of the word "feat" followed by a space, repeated 500 times (2,500 characters), ending with the word "END".

## Steps
1. In Name, type "Long feature suite".
2. Paste the prepared text into Feature.
3. Click "Create Suite".
4. Open /test-suites and look at the list row.
5. Reload the suite detail page.

## Expected Result
The suite is created (there is no length limit). The full text is stored: after reload the feature ends with "END". The list and the detail page stay usable.
