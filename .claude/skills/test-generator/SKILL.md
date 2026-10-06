---
name: test-generator
description: Generate thorough test cases using ISTQB boundary-value analysis and equivalence partitioning. Trigger whenever the user asks to write test cases, create tests, generate test scenarios, cover edge cases, or mentions ISTQB, boundary-value analysis, boundary testing, equivalence partitioning, or boundary tests for a feature, field, form, input, or API.
---

Generate test cases for the feature, field, or input the user describes using ISTQB boundary-value analysis and equivalence partitioning. Don't just write one happy-path test — systematically work through every category below.

## Method

For each input or field under test, identify its valid range or format, then derive test cases from it using ISTQB boundary-value analysis (test at and just past the edges of valid ranges) and equivalence partitioning (pick one representative case per distinct valid/invalid partition rather than testing every value in it).

## Required Coverage

Generate test cases for all of the following categories. Skip a category only when it genuinely doesn't apply to the input (e.g. no "duplicate" case for a field with no uniqueness constraint) — never skip a category just to keep the list short.

1. **Happy path** — valid, typical input that should succeed.
2. **Boundary values**:
   - Minimum valid value
   - Maximum valid value
   - Minimum − 1 (just below the valid range)
   - Maximum + 1 (just above the valid range)
   - Empty value
   - Whitespace-only value
   - Very long value (far beyond any expected length)
3. **Equivalence partitions** — one representative case per distinct valid and invalid partition.
4. **Negative cases**:
   - Wrong type (e.g. a number where a string is expected, or vice versa)
   - Missing required field
   - Duplicate (e.g. a value that must be unique but already exists)

## Output Format

Follow the test case shape defined in this project's `CLAUDE.md` exactly. Every test case must have:

- **Title** — start with the feature area in brackets, e.g. `[Login] Password field rejects values under 8 characters`
- **Preconditions**
- **Steps** (numbered)
- **Expected Result**
- **Severity** (Critical / Major / Minor / Trivial — pick per CLAUDE.md's definitions, not arbitrarily)
- **Status** — `draft` unless the user says otherwise

Write in the voice CLAUDE.md defines: clear, direct English, no buzzwords, no filler.

If this project has a `tests/manual/` convention (check for it and for the `/new-test` command), save each generated test case there as its own file, same as `/new-test` does, and tell the user the paths. Otherwise, output the test cases directly in the response.
