# [Test Suites] Name field stores special characters as plain text

**Severity:** Major
**Status:** draft

## Preconditions
App is running. Open /test-suites and click "+ New Suite".

## Steps
1. In Name, type `<b>Q&A</b> "quoted" 'single' ; DROP TABLE test_suites; -- ñ 日本語`.
2. In Feature, type "login".
3. Click "Create Suite".
4. Open /test-suites and find the suite.

## Expected Result
The suite is created. The detail page and the list show the exact text typed, as plain text: no bold formatting, no script runs, and the suites table still works.
