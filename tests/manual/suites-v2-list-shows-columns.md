# [Test Suites] List shows name, feature, status, case count and updated date

**Severity:** Major
**Status:** draft

## Preconditions
A suite "Login regression" exists with feature "login", status "ready" and exactly 3 cases.

## Steps
1. Open /test-suites.
2. Find the row for "Login regression".
3. Click the name "Login regression".

## Expected Result
The table has the columns Name, Feature, Status, Cases, Updated. The row shows "login", "ready", "3" and a date. Clicking the name opens /test-suites/:id for that suite.
