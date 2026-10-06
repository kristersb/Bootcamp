# [Username] Rejects a sign-up request with no username field

**Severity:** Major
**Status:** draft

## Preconditions
- The sign-up API endpoint is reachable.
- A REST client (for example curl or Postman) is available.

## Steps
1. Send a sign-up request that leaves out the username field entirely
2. Include all other required fields with valid values
3. Read the response

## Expected Result
The request is rejected with a validation error stating the username is required. No account is created.
