# [Test Suites] Deleting a test case removes it from every suite and renumbers them

**Severity:** Critical
**Status:** draft

## Preconditions
- Suite "Suite One" contains "Case A" (1), "Case B" (2), "Case C" (3).
- Suite "Suite Two" contains "Case B" (1), "Case D" (2).
- Suite "Suite Three" does not contain "Case B".

## Steps
1. Open /test-cases and find "Case B".
2. Start deleting "Case B" and read the confirm dialog.
3. Confirm the deletion.
4. Open /test-suites and check the Cases column for each suite.
5. Open "Suite One", then "Suite Two".

## Expected Result
The dialog lists "Suite One" and "Suite Two" and does not list "Suite Three". After confirming, "Case B" is gone. Suite One shows 1. Case A, 2. Case C. Suite Two shows 1. Case D. Suite Three is unchanged. The Cases column shows 2, 1 and the original count for Suite Three.
