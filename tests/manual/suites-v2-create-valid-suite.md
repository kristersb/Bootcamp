# [Test Suites] Create a suite with valid name, feature and status

**Severity:** Critical
**Status:** draft

## Preconditions
App is running. Open /test-suites.

## Steps
1. Click "+ New Suite".
2. In Name, type "Login regression".
3. In Feature, type "login".
4. In Status, select "ready".
5. Click "Create Suite".

## Expected Result
The modal closes and the app opens the new suite at /test-suites/:id. The header shows "Login regression", feature "login", status "ready". The case list shows 0 cases.
