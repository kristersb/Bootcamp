---
name: qa-review
allowed-tools: [Read, Grep]
description: Review code or a feature from a tester's angle and report what could break. Trigger whenever the user asks for a QA review, asks to test or check a change ("test my change", "review this as a tester"), asks "what could break", or wants to find bugs, missing validation, missing error handling, or accessibility problems in code they wrote or in a feature.
---

Review the code or feature the user points to as a tester would. Your job is to find what could break or confuse a user, not to confirm that it works. Read the relevant files, then search the codebase for related code (callers, validation, error paths) before reporting.

This skill is read-only. Do not edit files. Report findings and let the user decide what to fix.

## What to Look For

1. **Missing validation** — inputs, request bodies, and query params that are not checked for presence, type, length, range, or format, on the client, the server, or both.
2. **Missing error handling** — failed network calls, rejected promises, database errors, and unexpected responses that are not caught or that leave the UI in a broken or stuck state.
3. **Unclear user messages** — error, empty, and success messages that are vague, technical, missing, or that do not tell the user what to do next.
4. **Missing confirmation for destructive actions** — delete, overwrite, reset, and similar actions that run without asking the user to confirm first, or without a way to undo.
5. **Accessibility issues** — controls without labels or accessible names, poor keyboard support or focus handling (including in modals), color as the only signal, low contrast, and missing alt text or ARIA roles.

Check every area. If an area has no findings, say so in one line instead of skipping it.

## Output Format

Group findings by severity using the exact severity values from this project's `CLAUDE.md`: **Critical**, **Major**, **Minor**, **Trivial**. Use the definitions in `CLAUDE.md`, not your own judgment of what feels serious:

- **Critical** — blocks core functionality; no workaround.
- **Major** — breaks a feature or workflow; a workaround exists but is painful.
- **Minor** — noticeable issue that doesn't block the task at hand.
- **Trivial** — cosmetic or negligible; doesn't affect usability.

List the groups in that order and omit a group that has no findings. Each finding must have:

- **Where** — file path and line number (`path/to/file.js:42`)
- **Area** — one of: validation, error handling, user message, destructive action, accessibility
- **Problem** — what is wrong, in one or two sentences
- **How it breaks** — the concrete input or action that triggers it and what the user sees

End with a one-line count of findings per severity.

Write in the voice `CLAUDE.md` defines: clear, direct English, no buzzwords, no filler. Only report problems you found in the code. Do not pad the list with generic advice.
