---
description: Create a new manual test case through a short Q&A and save it under tests/manual/
---

Walk the user through creating a manual test case. Ask the following questions one at a time, in order, and wait for an answer before asking the next one:

1. What feature does this test cover?
2. What preconditions (if any) must be true before running this test? (allow "none")
3. What steps does the user take?
4. What is the expected result?
5. What severity should this test case have? (Critical / Major / Minor / Trivial)

Once all answers are in:

- Derive a short, clear title from the feature and scenario described.
- Number the steps as a numbered list, one action per line.
- Set status to `draft` (this is a freshly written test case, not yet reviewed or run).
- Create the `tests/manual/` directory if it doesn't already exist.
- Save the test case as a new file at `tests/manual/<kebab-case-title>.md`. If that filename already exists, append `-2`, `-3`, etc. to keep it unique.
- Follow the test case fields, severity values, and voice defined in this project's `CLAUDE.md`.
- Use exactly this structure for the file contents:

# <Title>

**Severity:** <Critical|Major|Minor|Trivial>
**Status:** draft

## Preconditions
<preconditions, or "None">

## Steps
1. <step one>
2. <step two>
...

## Expected Result
<expected result>

After saving, tell the user the path of the file you created.
