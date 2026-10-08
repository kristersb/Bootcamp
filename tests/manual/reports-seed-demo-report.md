# [Reports] Demo report is seeded on a fresh database

**Severity:** Minor
**Status:** draft

## Preconditions
Fresh database created from the project's seed script.

## Steps
1. Run the seed script.
2. Send GET /api/reports.
3. Navigate to /reports in the browser.

## Expected Result
At least one report is present, with realistic data (non-zero counts, a real suite name, a results array matching its total_count). It displays correctly on both the list and detail pages with no console errors.
