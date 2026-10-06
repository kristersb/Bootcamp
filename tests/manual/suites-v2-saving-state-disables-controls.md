# [Test Suites] Controls are disabled and the hint reads "Saving..." while a change saves

**Severity:** Major
**Status:** draft

## Preconditions
- A suite contains "Case A" (1), "Case B" (2), "Case C" (3). Open its detail page.
- Browser dev tools are open with network throttling set to a slow profile (for example 3 seconds of latency) so the saving state is visible.

## Steps
1. Click "↓" on the "Case A" row.
2. While the request is pending, look at the hint under the list.
3. While the request is pending, try to click any "↑", "↓" and "×" button, and try to drag a row.
4. Wait for the request to finish.

## Expected Result
While saving, the hint reads "Saving..." and all "↑", "↓" and "×" buttons are disabled; the rows cannot be dragged. When the request finishes the buttons are enabled again (except the ends' disabled arrows) and the hint returns to the drag instructions.
