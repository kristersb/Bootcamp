# [Username] Rejects a username 1 character above the maximum (16 characters)

**Severity:** Major
**Status:** draft

## Preconditions
User is on the sign-up page.

## Steps
1. Enter "abcdefghij123456" (16 characters) in the username field
2. Complete the other required fields
3. Submit the form

## Expected Result
The form is not submitted and an error message under the username field states the username must be 3 to 15 characters. No account is created.
