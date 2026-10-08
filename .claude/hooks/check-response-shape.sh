#!/usr/bin/env bash
# PostToolUse hook: warn when a route file responds without the CLAUDE.md envelope
#   { "success": boolean, "data": any, "error": string | null }
# Runs after Write/Edit/MultiEdit. Only looks at files under server/routes/ and, for edits, only at the
# lines that were just written. It never blocks: it always exits 0 and reports through the hook's JSON output.

input=$(cat)

command -v jq >/dev/null 2>&1 || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
case "$file_path" in
  */server/routes/*.js|*/server/routes/*.mjs|*/server/routes/*.cjs|server/routes/*.js) ;;
  *) exit 0 ;;
esac
[ -f "$file_path" ] || exit 0

# The text that was just written: the whole file for Write, the new strings for Edit/MultiEdit.
changed=$(printf '%s' "$input" | jq -c '
  if .tool_name == "Write" then {whole: true, snippets: []}
  elif (.tool_input.edits // null) != null then {whole: false, snippets: [.tool_input.edits[].new_string]}
  else {whole: false, snippets: [.tool_input.new_string // ""]}
  end')

# The checker is a Python program held in a variable: macOS's bash 3.2 cannot parse a heredoc inside $( ).
read -r -d '' CHECKER <<'PY'
import json, os, re, sys

path = sys.argv[1]
changed = json.loads(os.environ["CHANGED"])
src = open(path, encoding="utf-8").read()

def blank_out(text):
    """Replace comments and string contents with spaces (newlines kept) so the patterns below only see code."""
    out, i, n = [], 0, len(text)
    while i < n:
        c = text[i]
        if text.startswith("//", i):
            j = text.find("\n", i)
            j = n if j == -1 else j
            out.append(" " * (j - i)); i = j
        elif text.startswith("/*", i):
            j = text.find("*/", i + 2)
            j = n if j == -1 else j + 2
            out.append(re.sub(r"[^\n]", " ", text[i:j])); i = j
        elif c in "'\"`":
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == "\\" else 1
            j = min(j + 1, n)
            out.append(c + re.sub(r"[^\n]", " ", text[i + 1:j - 1]) + (c if j - 1 > i else ""))
            i = j
        else:
            out.append(c); i += 1
    return "".join(out)

code = blank_out(src)

def line_of(offset):
    return src.count("\n", 0, offset) + 1

# Lines to check: everything for Write, otherwise the lines the new text occupies in the file.
ranges = None
if not changed["whole"]:
    ranges = []
    for snippet in changed["snippets"]:
        if not snippet.strip():
            continue
        at = src.find(snippet)
        if at == -1:
            ranges = None  # cannot place the edit, so check the whole file
            break
        ranges.append((line_of(at), line_of(at) + snippet.count("\n")))
    else:
        if not ranges:
            sys.exit(0)

def in_scope(line):
    return ranges is None or any(a <= line <= b for a, b in ranges)

def balanced(text, start):
    """Return the index just past the bracket that closes the one at text[start]."""
    pairs = {"(": ")", "{": "}", "[": "]"}
    stack, i = [], start
    while i < len(text):
        c = text[i]
        if c in pairs:
            stack.append(pairs[c])
        elif stack and c == stack[-1]:
            stack.pop()
            if not stack:
                return i + 1
        i += 1
    return len(text)

def top_level_keys(obj):
    """Keys of an object literal like '{ a: 1, b, c: {x: 1} }'; None if it uses a spread (keys unknowable)."""
    body, pieces, depth, current = obj[1:-1], [], 0, ""
    for ch in body:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        if ch == "," and depth == 0:
            pieces.append(current)
            current = ""
        else:
            current += ch
    pieces.append(current)
    keys = set()
    for piece in pieces:
        piece = piece.strip()
        if piece.startswith("..."):
            return None
        m = re.match(r"([A-Za-z_$][\w$]*)\s*(:|$)", piece)
        if m:
            keys.add(m.group(1))
    return keys

CHAIN = r"\bres(?:\s*\.\s*(?:status|set|type|header|setHeader|links|cookie)\s*\([^()]*(?:\([^()]*\)[^()]*)*\))*"
CALL = re.compile(CHAIN + r"\s*\.\s*(json|jsonp|send|sendStatus|sendFile|end|render|redirect|write)\s*\(")
REQUIRED = ("success", "data", "error")
found = []

for m in CALL.finditer(code):
    line = line_of(m.start())
    if not in_scope(line):
        continue
    method = m.group(1)
    open_at = m.end() - 1
    close_at = balanced(code, open_at)
    arg = code[open_at + 1:close_at - 1].strip()
    if method != "json":
        found.append((line, f"res.{method}() sends something other than the JSON envelope. Use sendSuccess(res, data) or sendError(res, status, message)."))
    elif not arg.startswith("{"):
        found.append((line, "res.json() is not given an object literal, so the envelope cannot be checked. Use sendSuccess/sendError, or pass { success, data, error }."))
    else:
        keys = top_level_keys(arg)
        if keys is not None:
            missing = [k for k in REQUIRED if k not in keys]
            if missing:
                found.append((line, "res.json({...}) is missing: " + ", ".join(missing) + ". Every response needs success, data and error."))

for line, msg in sorted(set(found)):
    print(f"  line {line}: {msg}")
PY

warnings=$(CHANGED="$changed" python3 -c "$CHECKER" "$file_path")


[ -z "$warnings" ] && exit 0

rel=${file_path#"${CLAUDE_PROJECT_DIR:-$PWD}/"}
message="WARNING: ${rel} has responses that do not follow the API envelope in CLAUDE.md ({ \"success\": boolean, \"data\": any, \"error\": string | null }):
${warnings}
Fix these so every endpoint returns the envelope. This is a warning only; nothing was blocked."

jq -n --arg msg "$message" '{systemMessage: $msg, hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $msg}}'
exit 0
