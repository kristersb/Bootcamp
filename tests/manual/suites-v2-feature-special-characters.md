# [Test Suites] Feature field stores special characters as plain text

**Severity:** Major
**Status:** draft

## Preconditions
App is running. Open /test-suites and click "+ New Suite".

## Steps
1. In Name, type "Special feature suite".
2. In Feature, type `<script>alert(1)</script> & "quotes" 'x' ; -- ü 😀`.
3. Click "Create Suite".
4. Open /test-suites and find the suite.

## Expected Result
The suite is created. The detail page and the list show the exact text typed, as plain text. No alert appears and no formatting is applied.
