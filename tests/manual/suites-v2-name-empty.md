# [Test Suites] Name field rejects an empty value

**Severity:** Major
**Status:** draft

## Preconditions
App is running. Open /test-suites and click "+ New Suite".

## Steps
1. Leave Name empty.
2. In Feature, type "login".
3. Click "Create Suite".

## Expected Result
No suite is created and the modal stays open. An error "Name is required." shows under the Name field.
