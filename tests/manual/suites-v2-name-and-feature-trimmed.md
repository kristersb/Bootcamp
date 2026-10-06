# [Test Suites] Leading and trailing spaces in name and feature are removed

**Severity:** Minor
**Status:** draft

## Preconditions
App is running. Open /test-suites and click "+ New Suite".

## Steps
1. In Name, type 2 spaces, then "Padded name", then 2 spaces.
2. In Feature, type 2 spaces, then "padded feature", then 2 spaces.
3. Click "Create Suite".
4. Click "Edit" and look at the values in Name and Feature.

## Expected Result
The suite is created. The Edit form shows "Padded name" and "padded feature" with no leading or trailing spaces.
