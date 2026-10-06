# [Test Suites] API returns 404 when removing a case that is not in the suite

**Severity:** Minor
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Suite S contains test case 11. Test case 12 exists but is not in S.

## Steps
1. Send DELETE /api/test-suites/S/cases/12.
2. Send DELETE /api/test-suites/S/cases/abc.
3. Send GET /api/test-suites/S.

## Expected Result
Steps 1 and 2 return HTTP 404 with success false, data null and an error message that says the case is not in this suite. In step 3 the suite still holds case 11.
