# [Test Suites] Filter the suite list by status

**Severity:** Major
**Status:** draft

## Preconditions
Suites exist: "S1" with status draft, "S2" with status ready, "S3" with status ready, "S4" with status failed. Open /test-suites.

## Steps
1. In the status filter, select "ready".
2. Select "failed".
3. Select "draft".

## Expected Result
Step 1 lists only S2 and S3. Step 2 lists only S4. Step 3 lists only S1. The dropdown offers "All statuses" plus the five statuses.
