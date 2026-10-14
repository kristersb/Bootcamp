# Plan and build the Flaky Test Tracker, including the flake-analyzer agent

## Prompt I typed

```
Please draft a step-by-step implementation plan for the new "Flaky Test Tracker" feature (/flaky-tests route).

Before drafting the plan, drop a Git checkpoint labeled "before-flaky-test-tracker".

### Architectural & Stack Requirements
Your plan must explicitly incorporate all four of the following stack components:

1. Modular Execution: Draft the step-by-step plan first. Do NOT write or modify application files until I review the plan and click "Implement".
2. Seed Data Enhancement: Check if our existing test run history has enough intermittent pass/fail transitions. If not, include a step to extend seed data with realistic intermittent patterns so flakiness is immediately observable.
3. Dedicated Agent (`.claude/agents/flake-analyzer.md`): Define or utilize the `flake-analyzer` subagent to calculate flakiness scores based on execution history and generate realistic AI root-cause hypotheses (e.g., race conditions, unhandled async states, network timeouts) for the Top 10 flaky leaderboard.
4. Discord Webhook & Event Hook Integration:
   - Configure a `PostToolUse` hook triggered on `test_run_results` updates.
   - Send rich Discord notifications via `DISCORD_WEBHOOK_URL` (loaded securely from `.env`) whenever a test transitions into a flaky state, including the test title, flakiness score, and AI root-cause hypothesis.
```

## What Claude did

1. Dropped the requested git checkpoint (`before-flaky-test-tracker`) before touching anything, then entered plan mode instead of writing code.
2. Flagged that two parts of the request named mechanisms that don't work the way described, and got explicit sign-off via `AskUserQuestion` before planning around the corrected versions:
   - A `PostToolUse` hook can't observe a row changing in the live database from a real user's HTTP request — hooks only fire on Claude Code's own tool calls during a coding session. The Discord alert was planned as a normal server-side code path instead, extending the pattern the app already used for failure alerts.
   - A Claude Code subagent can't be invoked by the deployed production server at runtime. `flake-analyzer` was planned as a dev-time subagent invoked on demand, writing hypotheses into the database once, which the live page just reads.
3. Checked the existing seed data and confirmed it had no alternating pass/fail pattern for any case, then planned a seed-data extension reusing existing suites so the original demo run stayed byte-for-byte unchanged.
4. Wrote the full staged plan (data layer → API → UI → Discord → agent), each stage behind its own git checkpoint, and saved it to a plan file for review before implementation.
5. On approval, implemented every stage: the scoring module and seed data, the `/api/flaky-tests` routes, the `/flaky-tests` page and nav entry, the Discord alert wiring in `handleUpdateTestRunResult`, and finally the `flake-analyzer` agent plus its companion skill and CLI scripts.
6. Verified each stage end to end (leaderboard scores matching the designed seed pattern, alert dedup/re-arm behavior, and the agent writing case-specific hypotheses that the page picks up without a server restart) before moving to the next.

## Result

- Plan file: `~/.claude/plans/pasted-content-id-a9d4-i-want-polished-wozniak.md`
- `server/flakiness.js`, `server/db.js` (`flaky_test_insights` table + seed block), `server/routes/flaky-tests.js`, `server/discord.js` (`buildFlakyAlert`), `server/routes/test-runs.js` (flaky-alert block)
- `client/src/api/flaky-tests.js`, `client/src/pages/FlakyTestsPage.jsx`/`.css`, `client/src/components/FlakyTimeline.jsx`, `client/src/App.jsx` (nav + route)
- `.claude/agents/flake-analyzer.md`, `.claude/skills/flake-analyzer/SKILL.md`, `server/scripts/flaky-hypothesis-cli.js`
- Live at `/flaky-tests`: a Top-10 flakiness leaderboard with severity badges, scores, timeline pills, and root-cause hypotheses written by the `flake-analyzer` agent.
