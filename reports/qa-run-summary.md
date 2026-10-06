# QA Run Summary

Summarized: `qa-review-test-cases.md` (QA review of Test Cases feature). The 59 `suites-v2-*` drafted cases were NOT read (see Gaps).

**tl;dr** — Test Cases feature review found **0 Critical, 7 Major, 10 Minor, 3 Trivial** (20 findings). Biggest risk: no API error handling, so server errors return HTML and the UI shows a JSON parse error. Nothing was run.

## Pass/fail metrics
- No run results in the source. Review was static; nothing executed.
- Findings: **0 Critical**, **7 Major**, **10 Minor**, **3 Trivial** = **20**.
- Suites cases: **59 files reported by caller, all `draft`**. Severity breakdown not available (files unread).

## Key risks
- **Major** — No error middleware or try/catch; malformed JSON, body over 100 KB, or any throw returns HTML, not `{success, data, error}`. Unknown `/api/...` returns `index.html` with 200. `server/index.js:9, 15-22`; `client/src/api/testCases.js:3-10`.
- **Major** — Non-string `steps` or `preconditions` items throw TypeError, giving HTML 500. `server/routes/testCases.js:36-38, 103-104, 131-132`.
- **Major** — Delete last row on a page: list shows "No test cases found." and "Page 2 of 1" though 20 cases exist. `TestCasesPage.jsx:92-104, 185-193`; `testCases.js:48, 75`.
- **Major** — Paging with no ORDER BY tiebreaker may duplicate or skip cases (not verified at runtime). `testCases.js:65-75`.

## Issues by severity

**Critical** — none.

**Major (7)**
- No error handling, HTML responses (above). `server/index.js:9, 15-22`
- Validation gaps cause TypeError/500 (above). `testCases.js:36-38, 103-104, 131-132`
- Page not clamped after delete (above). `TestCasesPage.jsx:92-104, 185-193`
- ORDER BY has no tiebreaker. `testCases.js:65-75`
- Sortable `<th onClick>` unusable by keyboard; no `aria-sort`. `TestCasesPage.jsx:146, 150`
- Form modal lacks dialog role, focus handling, Escape. `TestCaseFormModal.jsx:93-94`
- Overlay mousedown closes form and discards input with no warning. `TestCaseFormModal.jsx:93`

**Minor (10)**
- Search `LIKE` does not escape `%`, `_`, `\`. `testCases.js:53-55`
- Bad `sort`/`order` silently defaulted; `page` uncapped. `testCases.js:47-48, 66-67`
- No length limits on title, steps, etc. `testCases.js:30-40, 94-108`
- Update overwrites with no version check; missing `status` resets to `draft`. `testCases.js:114-137`
- "Test case not found" on stale edit/delete; list not refreshed. `TestCaseFormModal.jsx:85-87`
- Failed fetch leaves old rows; no retry or loading indicator. `TestCasesPage.jsx:43-55, 157-163`
- Row actions menu lacks ARIA, Escape, focus management. `RowActionsMenu.jsx:19-49`
- Focus not restored after delete dialog. `ConfirmDialog.jsx:9-17`
- Form field errors and inputs lack accessible names and announcements. `TestCaseFormModal.jsx:104-157`
- Search, filter, table, pagination unlabeled; no live announcements. `TestCasesPage.jsx:118-195`

**Trivial (3)**
- No success confirmation; `removedFromSuites` ignored. `TestCasesPage.jsx:92-104`
- Error text contrast about 2.5:1 in dark mode (not verified visually). `TestCaseFormModal.css:117,122`; `TestCasesPage.css:110`
- Search term not trimmed. `TestCasesPage.jsx:30-36`

## Held up
- SQL parameterised; no injection.
- Title rules match on client and server.
- Delete flow fix holds; `ConfirmDialog` is accessible.

## Actionable takeaways
- Add error-handling middleware, JSON 404 for `/api/*`, and try/catch in handlers. **Unassigned**
- Type-check `steps` and `preconditions` items; return 400. **Unassigned**
- Clamp `page` on server and reset it on client after delete. **Unassigned**
- Add a unique tiebreaker (e.g. id) to ORDER BY. **Unassigned**
- Fix keyboard and screen-reader access: sortable headers, form modal dialog semantics. **Unassigned**
- Stop overlay click from discarding form input. **Unassigned**
- Run the 59 `suites-v2-*` cases and verify unverified findings 4, 9, 10, 15, 19. **Unassigned**

## Gaps
- **Suites cases not summarized.** No directory listing tool was available and filenames could not be guessed, so counts per severity and coverage are missing.
- Review scope skipped suite routes, suite pages, `AddCasesModal`; `server/routes/test-suites.js` unread.
