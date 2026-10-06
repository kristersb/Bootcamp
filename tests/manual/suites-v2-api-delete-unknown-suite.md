# [Test Suites] API returns 404 when deleting a suite that does not exist

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. No suite has id 999999. At least one other suite exists.

## Steps
1. Send DELETE /api/test-suites/999999.
2. Send GET /api/test-suites.

## Expected Result
Step 1 returns HTTP 404 with success false, data null and an error message that says the suite was not found. The list in step 2 is unchanged.
