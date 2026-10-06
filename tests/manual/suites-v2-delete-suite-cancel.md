# [Test Suites] Cancelling the delete dialog keeps the suite

**Severity:** Major
**Status:** draft

## Preconditions
A suite with at least 1 case exists. Open its detail page.

## Steps
1. Click "Delete".
2. Click "Cancel".
3. Click "Delete" again and press Escape.

## Expected Result
Each time the dialog closes and the page stays on the suite detail page. The suite and its cases are unchanged, and the suite is still listed on /test-suites.
