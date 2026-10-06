# [Test Suites] Cancelling the new suite form creates nothing

**Severity:** Minor
**Status:** draft

## Preconditions
App is running. Note the number of rows on /test-suites.

## Steps
1. Open /test-suites and click "+ New Suite".
2. In Name, type "Should not exist".
3. In Feature, type "nothing".
4. Click "Cancel".
5. Click "+ New Suite" again, then press Escape.

## Expected Result
Each time the modal closes and the app stays on /test-suites. The row count is unchanged and no suite named "Should not exist" is listed.
