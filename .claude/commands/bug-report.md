---
description: File a new bug report through a short Q&A and save it under tests/bugs/
---

Walk the user through filing a bug report. Ask the following questions one at a time, in order, and wait for an answer before asking the next one:

1. What did you do? (the steps you took)
2. What did you expect to happen?
3. What actually happened?
4. Where did this happen? (which page/screen)
5. What severity should this bug have? (Critical / Major / Minor / Trivial)

Once all five answers are in:

- Derive a short, clear title from the location and what actually happened.
- Turn the "what did you do" answer into a numbered list of repro steps, one action per line (split it into individual steps if it describes more than one action).
- Set status to `open` (this is a freshly filed bug).
- Create the `tests/bugs/` directory if it doesn't already exist.
- Get the current date and time (e.g. via `date` in the shell) to use as the timestamp and to build the filename.
- Save the file at `tests/bugs/<YYYY-MM-DD>-<kebab-case-title>.md`. If that filename already exists, append `-2`, `-3`, etc. to keep it unique.
- Follow the bug report fields, severity values, and voice defined in this project's `CLAUDE.md`.
- Use exactly this structure for the file contents:

# <Title>

**Severity:** <Critical|Major|Minor|Trivial>
**Status:** open
**Timestamp:** <timestamp at time of filing, e.g. 2026-10-05 14:32>
**Location:** <page/screen>

## Steps to Reproduce
1. <step one>
2. <step two>
...

## Expected
<expected result>

## Actual
<actual result>

After saving, tell the user the path of the file you created.
