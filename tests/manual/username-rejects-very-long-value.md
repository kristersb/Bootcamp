# [Username] Rejects a very long username (500 characters)

**Severity:** Major
**Status:** draft

## Preconditions
User is on the sign-up page.

## Steps
1. Paste 500 "a" characters into the username field
2. Complete the other required fields
3. Submit the form

## Expected Result
The form is not submitted and an error message under the username field states the username must be 3 to 15 characters. The page stays responsive and no account is created.
