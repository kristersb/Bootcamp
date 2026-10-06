# [Test Suites] New suite form defaults status to draft

**Severity:** Major
**Status:** draft

## Preconditions
App is running. Open /test-suites.

## Steps
1. Click "+ New Suite".
2. Check the value shown in the Status dropdown.
3. In Name, type "Default status suite".
4. In Feature, type "checkout".
5. Click "Create Suite" without changing Status.

## Expected Result
The Status dropdown shows "draft" when the form opens. The suite is created and its detail page shows status "draft".
