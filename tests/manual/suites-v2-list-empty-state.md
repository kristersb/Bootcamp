# [Test Suites] List shows an empty message when no suites exist

**Severity:** Minor
**Status:** draft

## Preconditions
No test suites exist (empty database or all suites deleted).

## Steps
1. Open /test-suites.
2. Leave the status filter on "All statuses".

## Expected Result
The table body shows one row with the message "No test suites yet. Create one to get started." No error is shown.
