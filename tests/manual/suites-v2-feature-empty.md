# [Test Suites] Feature field rejects an empty value

**Severity:** Major
**Status:** draft

## Preconditions
App is running. Open /test-suites and click "+ New Suite".

## Steps
1. In Name, type "Login regression".
2. Leave Feature empty.
3. Click "Create Suite".

## Expected Result
No suite is created and the modal stays open. An error "Feature is required." shows under the Feature field.
