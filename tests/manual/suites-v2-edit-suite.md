# [Test Suites] Edit a suite's name, feature and status

**Severity:** Major
**Status:** draft

## Preconditions
A suite exists with name "Old name", feature "old feature", status "draft" and at least 2 cases. Open its detail page.

## Steps
1. Click "Edit".
2. Check that the form is titled "Edit Test Suite" and shows the current values.
3. Change Name to "New name".
4. Change Feature to "new feature".
5. Change Status to "in-progress".
6. Click "Save Changes".
7. Reload the page.

## Expected Result
The modal closes and the header shows "New name", feature "new feature", status "in-progress". The Updated time changes. The cases and their order are unchanged. After reload the new values are still shown.
