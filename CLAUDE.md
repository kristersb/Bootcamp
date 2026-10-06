# CLAUDE.md

## Stack
Express (server/) + React via Vite (client/), one `npm run dev` runs both.

## Severity Levels
- **Critical** — blocks core functionality; no workaround.
- **Major** — breaks a feature or workflow; a workaround exists but is painful.
- **Minor** — noticeable issue that doesn't block the task at hand.
- **Trivial** — cosmetic or negligible; doesn't affect usability.

## Test Case Fields
- **Title** — always start with the feature area in brackets, e.g. `[Login] Successful login with valid credentials`
- **Preconditions**
- **Steps** (numbered)
- **Expected Result**
- **Severity** (Critical / Major / Minor / Trivial)
- **Status** (draft / ready / passed / failed / skipped)

## Bug Report Fields
- **Title**
- **Steps to Reproduce**
- **Expected**
- **Actual**
- **Severity** (Critical / Major / Minor / Trivial)
- **Status** (open / in-progress / resolved / closed / reopened)

## API Response Shape
Every endpoint returns:
```json
{ "success": boolean, "data": any, "error": string | null }
```

## File Naming
- Files: kebab-case (`user-profile.js`)
- React components: PascalCase (`UserProfile.jsx`)
- API handlers: `handleVerbNoun` (`handleCreateUser`)

## Voice
Write test cases and bug reports in clear, direct English. No buzzwords, no filler. State what happened and what's expected — nothing else.
