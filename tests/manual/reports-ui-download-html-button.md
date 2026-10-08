# [Reports] "Download HTML" button downloads the report file

**Severity:** Major
**Status:** draft

## Preconditions
On a report's detail page (/reports/:id).

## Steps
1. Click "Download HTML".
2. Open the downloaded file in a browser.

## Expected Result
A single .html file downloads with no further prompts. Opened offline, it renders the same suite name, counts and results shown on the detail page, with no missing styles or broken layout.
