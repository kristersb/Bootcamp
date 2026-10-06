---
description: Log a daily work update (date, tasks done, time spent) under daily-updates/
---

Walk the user through logging a daily update.

1. Ask what date this update is for. If the user doesn't give one, use today's date (get it via `date` in the shell).
2. Ask what they worked on and how long it took, one task at a time:
   - "What did you work on?"
   - "How long did that take?"
   After each pair, ask if there's another task to log. Keep looping until the user says there isn't.

Once all tasks are collected:

- Create the `daily-updates/` directory if it doesn't already exist.
- Save the file at `daily-updates/<YYYY-MM-DD>.md`. If that file already exists, append the new tasks to it instead of overwriting.
- Use exactly this structure for the file contents:

# Daily Update - <date>

## Tasks
1. <task one> — <time spent>
2. <task two> — <time spent>
...

After saving, tell the user the path of the file you created or updated.
