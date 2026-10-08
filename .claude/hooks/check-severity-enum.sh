#!/usr/bin/env bash
# PostToolUse hook: warn when JS/TS/React code that was just written uses a severity word that is not in
# CLAUDE.md. The only valid severities are Critical, Major, Minor and Trivial.
# Runs after Write/Edit/MultiEdit on .js .jsx .ts .tsx .mjs .cjs files. It never blocks: it always exits 0
# and reports through the hook's JSON output.

input=$(cat)

command -v jq >/dev/null 2>&1 || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
case "$file_path" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac
case "$file_path" in
  */node_modules/*|*/dist/*) exit 0 ;;
esac

# The text that was just written: the content for Write, the new strings for Edit/MultiEdit.
snippets=$(printf '%s' "$input" | jq -c '
  if .tool_name == "Write" then [.tool_input.content // ""]
  elif (.tool_input.edits // null) != null then [.tool_input.edits[].new_string]
  else [.tool_input.new_string // ""]
  end')

# The checker is a Python program held in a variable: macOS's bash 3.2 cannot parse a heredoc inside $( ).
read -r -d '' CHECKER <<'PY'
import json, os, re, sys

path = sys.argv[1]
snippets = json.loads(os.environ["SNIPPETS"])
try:
    src = open(path, encoding="utf-8").read()
except OSError:
    src = ""

VALID = {"critical", "major", "minor", "trivial"}
# A quoted value assigned to, compared with, or keyed under "severity": severity: 'x', .severity === "x"
ASSIGNED = re.compile(r"""severity['"`]?\s*(?:[:=]|[!=]==?)\s*(['"`])([^'"`]*)\1""", re.I)

# Words people use for severity that are not one of Critical / Major / Minor / Trivial.
WRONG = ["high", "medium", "low", "blocker", "cosmetic", "urgent", "severe", "showstopper", "moderate", "normal"]
WORD = "|".join(WRONG)
SEVERITY = re.compile(r"severit", re.I)
QUOTED = re.compile(r"""(['"`])\s*(%s)\s*\1""" % WORD, re.I)      # the whole string is the word: 'High'
NEAR = re.compile(r"\b(%s)\b" % WORD, re.I)                        # the word anywhere, on a severity line
PRIORITY = re.compile(r"priorit", re.I)   # bugs have a separate priority field that really is low/medium/high
ITEM_ONLY = re.compile(r"""^\s*(['"`])[^'"`]*\1\s*,?\s*(//.*)?$""")   # a line holding just one quoted list item
OPENER = re.compile(r"[\[{(=,]\s*(//.*)?$")                              # a line that opens a list or object

def in_severity_list(lines, i):
    """True when line i is an item in a multi-line list whose opening line mentions severity."""
    j = i - 1
    while j >= 0 and ITEM_ONLY.match(lines[j]):
        j -= 1
    return j >= 0 and bool(SEVERITY.search(lines[j])) and bool(OPENER.search(lines[j]))

found = []
for snippet in snippets:
    if not snippet.strip():
        continue
    at = src.find(snippet)
    first_line = src.count("\n", 0, at) + 1 if at != -1 else 1
    lines = snippet.split("\n")
    for i, line in enumerate(lines):
        mentions_severity = bool(SEVERITY.search(line))
        if PRIORITY.search(line) and not mentions_severity:
            continue
        words = set()
        if mentions_severity:
            words.update(m.group(1).lower() for m in NEAR.finditer(line))
        if mentions_severity or in_severity_list(lines, i):
            words.update(m.group(2).lower() for m in QUOTED.finditer(line))
        # Any other quoted value is wrong too (e.g. "ultra-critical"). Empty strings are form defaults, so skip them.
        if mentions_severity:
            # Values with spaces are messages ('Severity is required.'), not severity values.
            words.update(m.group(2).strip() for m in ASSIGNED.finditer(line)
                         if m.group(2).strip() and " " not in m.group(2).strip()
                         and m.group(2).strip().lower() not in VALID)
        if in_severity_list(lines, i) and ITEM_ONLY.match(line):
            value = line.split("//")[0].strip().rstrip(",").strip().strip("'\"`").strip()
            if value and value.lower() not in VALID:
                words.add(value)
        if words:
            found.append((first_line + i, sorted({w.lower(): w for w in words}.values(), key=str.lower), line.strip()))

seen = set()
for number, words, text in found:
    if (number, text) in seen:
        continue
    seen.add((number, text))
    shown = text if len(text) <= 100 else text[:97] + "..."
    print("  line %d: %s -> %s" % (number, ", ".join('"%s"' % w for w in words), shown))
PY

warnings=$(SNIPPETS="$snippets" python3 -c "$CHECKER" "$file_path")

[ -z "$warnings" ] && exit 0

rel=${file_path#"${CLAUDE_PROJECT_DIR:-$PWD}/"}
message="WARNING: ${rel} uses a severity value that is not in CLAUDE.md (the only valid values are Critical, Major, Minor, Trivial):
${warnings}
Use one of the four valid values instead (high/medium/low/blocker/cosmetic are not severities here). This is a warning only; nothing was blocked."

jq -n --arg msg "$message" '{systemMessage: $msg, hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $msg}}'
exit 0
