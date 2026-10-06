# [Username] Rejects a non-string username sent to the API

**Severity:** Major
**Status:** draft

## Preconditions
- The sign-up API endpoint is reachable.
- A REST client (for example curl or Postman) is available.

## Steps
1. Send a sign-up request with the username set to the JSON number 12345 (not the string "12345")
2. Include all other required fields with valid values
3. Read the response

## Expected Result
The request is rejected with a validation error stating the username must be a string. No account is created and the server does not crash.
