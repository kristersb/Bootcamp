# [Reports] Exported HTML report prints cleanly

**Severity:** Minor
**Status:** draft

## Preconditions
A report has been generated and its HTML export downloaded (see [Reports] Export a report as a self-contained HTML file).

## Steps
1. Open the exported HTML file in a browser.
2. Open the browser's print preview (File > Print).
3. Compare the print preview to the on-screen layout.

## Expected Result
The file includes an `@media print` block. In print preview, any navigation chrome, buttons or on-screen-only controls are hidden, the layout fits the page width without being cut off, and the summary counts and results table remain fully readable. Saving as PDF from this dialog produces a clean, readable document.
