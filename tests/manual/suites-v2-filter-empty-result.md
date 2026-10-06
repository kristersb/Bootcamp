# [Test Suites] Filter with no matching suites shows an empty message

**Severity:** Minor
**Status:** draft

## Preconditions
At least one suite exists, and none has status "passed". Open /test-suites.

## Steps
1. In the status filter, select "passed".

## Expected Result
The table shows one row with the message `No suites with status "passed".` and no suite rows. No error is shown.
