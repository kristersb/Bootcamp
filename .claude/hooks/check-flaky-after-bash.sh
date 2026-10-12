#!/usr/bin/env bash
# PostToolUse hook: after a Bash command that touches test run results or flaky-test state, sweeps every
# flaky test case and sends a Discord alert for any that just crossed the flaky threshold.
#
# Scope, stated plainly: this can only ever fire when Claude Code itself runs a Bash command (seeding data,
# a verification script, a direct DB check, a curl against the API) during a session. It cannot fire when a
# real visitor records a result through the live deployed app in their browser - that request never goes
# through Claude Code's tool-call loop at all. The equivalent for that path is the server-side code in
# server/routes/test-runs.js's handleUpdateTestRunResult, which runs the same underlying alert logic.
#
# Runs after every Bash call, but only does anything when the command text looks relevant, so routine
# commands (ls, git status, and so on) exit immediately. Never blocks: always exits 0.

input=$(cat)

command -v jq >/dev/null 2>&1 || exit 0

command_text=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -n "$command_text" ] || exit 0

case "$command_text" in
  *test_run_results*|*test-runs*|*flaky*|*flakiness*) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f server/scripts/check-and-alert-flaky.js ] || exit 0

summary=$(node server/scripts/check-and-alert-flaky.js 2>&1)
[ -n "$summary" ] || exit 0

jq -n --arg msg "$summary" '{systemMessage: $msg, hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $msg}}'
exit 0
