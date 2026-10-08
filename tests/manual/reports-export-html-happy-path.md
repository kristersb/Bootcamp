# [Reports] Export a report as a self-contained HTML file

**Severity:** Major
**Status:** draft

## Preconditions
A report has been generated from a test run with a mix of passed, failed and skipped cases.

## Steps
1. Send GET /api/reports/<id>/export/html.
2. Save the response body as a .html file and open it directly in a browser with no network connection.
3. Inspect the file's `<head>` and `<style>` content.

## Expected Result
The response downloads as an HTML file (Content-Disposition attachment, a sensible filename) and renders correctly offline in step 2. Every style rule is inline in a `<style>` tag or style attributes — no `<link>` to an external stylesheet and no reference to a CDN. The page shows the suite name, run date, pass/fail/skipped counts and the full list of test case results.
