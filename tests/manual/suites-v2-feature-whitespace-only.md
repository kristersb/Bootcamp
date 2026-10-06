# [Test Suites] Feature field rejects a whitespace-only value

**Severity:** Major
**Status:** draft

## Preconditions
App is running. Open /test-suites and click "+ New Suite".

## Steps
1. In Name, type "Login regression".
2. In Feature, type 3 spaces.
3. Click "Create Suite".

## Expected Result
No suite is created and the modal stays open. An error "Feature is required." shows under the Feature field.
