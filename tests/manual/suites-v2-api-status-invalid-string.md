# [Test Suites] API rejects a status that is not one of the five allowed values

**Severity:** Major
**Status:** draft

## Preconditions
API-only test. Use any HTTP client. Suite S exists with status "draft".

## Steps
1. Send POST /api/test-suites with body `{"name":"A","feature":"b","status":"archived"}`.
2. Send PUT /api/test-suites/S with body `{"name":"A","feature":"b","status":"archived"}`.
3. Send GET /api/test-suites/S.

## Expected Result
Steps 1 and 2 return HTTP 400 with success false, data null and an error message that says the status must be one of the allowed values. No suite is created. In step 3 the suite still has status "draft".
