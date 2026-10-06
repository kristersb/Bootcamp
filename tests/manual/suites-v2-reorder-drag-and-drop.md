# [Test Suites] Reorder cases by drag and drop

**Severity:** Major
**Status:** draft

## Preconditions
A suite contains "Case A" (1), "Case B" (2), "Case C" (3). Open its detail page in a desktop browser with a mouse.

## Steps
1. Drag the "Case C" row and drop it on the "Case A" row.
2. Drag the "Case A" row (now second) and drop it on the last row.
3. Drag a row and drop it on itself.

## Expected Result
After step 1 the list reads 1. Case C, 2. Case A, 3. Case B. After step 2 it reads 1. Case C, 2. Case B, 3. Case A. Step 3 changes nothing. During a drag the dragged row and the target row are visually marked.
