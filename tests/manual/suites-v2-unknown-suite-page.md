# [Test Suites] Detail page for an unknown suite shows a not-found message

**Severity:** Minor
**Status:** draft

## Preconditions
App is running. No suite has id 999999.

## Steps
1. Open /test-suites/999999 in the browser.
2. Click "← All suites".

## Expected Result
The page shows an error message that the suite was not found, with no case list and no Edit or Delete buttons. The link returns to /test-suites.
