#!/usr/bin/env bash
# Stop hook: write a short daily work log from git and the session transcript, and show it as a message.
# The Stop event fires every time Claude finishes responding, so the log is rewritten (not appended) on each
# run: it always holds the current picture for today. It never blocks: it always exits 0.

input=$(cat)

command -v jq >/dev/null 2>&1 || exit 0
cd "${CLAUDE_PROJECT_DIR:-$PWD}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

today=$(date +%Y-%m-%d)
now=$(date '+%Y-%m-%d %H:%M:%S %Z')
log_dir=".claude/logs"
log_file="$log_dir/daily-summary-$today.md"
g() { git --no-optional-locks -c core.quotepath=off "$@"; }

branch=$(g rev-parse --abbrev-ref HEAD 2>/dev/null)
commits=$(g log --since="$today 00:00" --date=format:%H:%M --pretty='- %ad  %h  %s' 2>/dev/null)
status=$(g status --short 2>/dev/null)
modified=$(printf '%s\n' "$status" | grep -v '^??' | grep -c . )
untracked=$(printf '%s\n' "$status" | grep -c '^??')
diffstat=$(g diff HEAD --stat 2>/dev/null | tail -n 25)

# What the session did, from the transcript: prompts sent and tools used.
transcript=$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)
session_id=$(printf '%s' "$input" | jq -r '.session_id // empty' 2>/dev/null)
prompts=""
tools=""
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  prompts=$(jq -r 'select(.type == "user" and (.message.content | type) == "string") | 1' "$transcript" 2>/dev/null | grep -c 1)
  tools=$(jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | .name' "$transcript" 2>/dev/null \
    | sort | uniq -c | sort -rn | head -8 | awk '{printf "%s%s x%s", (NR>1 ? ", " : ""), $2, $1}')
fi

summary=$(
  echo "# Daily work log: $today"
  echo
  echo "_Updated $now · branch \`${branch:-unknown}\`${session_id:+ · session ${session_id:0:8}}_"
  echo
  echo "## Commits today"
  if [ -n "$commits" ]; then echo "$commits"; else echo "- None yet."; fi
  echo
  echo "## Uncommitted changes ($modified modified or deleted, $untracked new)"
  if [ -n "$status" ]; then
    printf '%s\n' "$status" | head -n 40 | sed 's/^/    /'
    total=$(printf '%s\n' "$status" | grep -c .)
    [ "$total" -gt 40 ] && echo "    ... and $((total - 40)) more"
  else
    echo "- Working tree clean."
  fi
  if [ -n "$diffstat" ]; then
    echo
    echo "## Size of changes to tracked files"
    printf '%s\n' "$diffstat" | sed 's/^/    /'
  fi
  if [ -n "$prompts$tools" ]; then
    echo
    echo "## This session"
    [ -n "$prompts" ] && echo "- Requests from you: $prompts"
    [ -n "$tools" ] && echo "- Tools used: $tools"
  fi
)

mkdir -p "$log_dir" 2>/dev/null && printf '%s\n' "$summary" > "$log_file" 2>/dev/null

jq -n --arg msg "$summary" --arg file "$log_file" '{systemMessage: ($msg + "\n\nSaved to " + $file)}'
exit 0
