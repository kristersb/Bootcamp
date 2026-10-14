# Dispatch qa-reviewer on the bug tracker, then fix the top 3 findings

## Prompt I typed

```
Please dispatch the qa-reviewer subagent to perform a QA review on the bug tracker feature we just built.

Have qa-reviewer look at it through the lens of a senior QA engineer—focusing on critical validation gaps, state machine edge cases, unhandled backend errors, and fragile UI flows.

Once qa-reviewer outputs its prioritized list of findings, take the top 3 highest-severity issues from that review and fix them directly in the codebase. Skip any lower-severity findings for now.

When you are finished, provide a concise summary outlining what the top 3 issues were and the exact code fixes you applied to resolve each one.
```

## What Claude did

1. Dispatched the `qa-reviewer` subagent (read-only, `.claude/agents/qa-reviewer.md`) against the bug tracker (`/bugs`, `/bugs/:id`, `/api/bugs`), briefing it on what had already been fixed so it wouldn't repeat known findings.
2. Waited for the report: 0 Critical, 2 Major, 12 Minor, 4 Trivial findings.
3. Reproduced the top three findings against the running app before touching any code, rather than trusting the reviewer's description at face value.
4. Fixed each one directly in the codebase:
   - A retry after a stale-edit 409 conflict silently overwrote another user's change — fixed by having the edit form remember the version it was opened with (`openedVersion`) and always submit that one, instead of the version picked up by the post-conflict refresh.
   - A status change made from a stale page could silently overwrite someone else's concurrent status change — fixed by having the status request say which status the user was looking at (`from`), with the server returning a 409 if the bug has since moved.
   - `GET /api/bugs?sort=constructor` (and `toString`, `__proto__`, `hasOwnProperty`) crashed the list endpoint with a 500 — fixed by switching the sort-field check from a plain object lookup to `Object.hasOwn`, so inherited property names are rejected with the normal 400 instead of reaching the query.
5. Re-ran the exact reproduction steps for all three after the fixes, plus a regression check that normal (non-stale, non-malicious) requests still worked.
6. Reported back the three root causes and the exact fix location for each, and explicitly listed what was left alone (the other 15 lower-severity findings).

## Result

- `client/src/components/BugFormModal.jsx` — tracks `openedVersion` and sends it on every save, including retries.
- `server/routes/bugs.js` — status-change endpoint now validates the caller's `from` status inside the same transaction as the write; sort-field validation uses `Object.hasOwn`.
- `client/src/api/bugs.js`, `client/src/pages/BugDetailPage.jsx` — updated to send the `from` status alongside a status change.
- Verified live: a stale edit retry is rejected instead of overwriting; a stale status change is rejected with a 409 and the page self-corrects; `sort=constructor`/`__proto__`/`toString`/`hasOwnProperty` all return 400 instead of 500, while the six real sort values still return 200.
