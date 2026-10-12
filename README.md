# Strata QA

A QA workbench: test cases, test suites, test runs, bug tracking, reports, and dashboards. Express API
(`server/`) + React/Vite client (`client/`), served together as a single Node process.

## Local development

```bash
npm run install:all   # installs both server and client dependencies
npm run dev            # runs the Express API and the Vite dev server together
```

Copy `.env.example` to `.env` first if you want to configure anything (every variable is optional).

## Production build

```bash
npm run install:all
npm run build   # builds the React client into client/dist
npm start       # serves the built client and the API from one process
```

## Deploy

This app deploys as a single Node web service on [Render](https://render.com)'s free tier: one process
builds and serves both the React client and the Express API (see `server/index.js`), so there's nothing to
deploy separately. The repo includes a `render.yaml` Blueprint that configures this automatically.

**Before you start:** Render only deploys from a repo on GitHub, GitLab, or Bitbucket that it can connect
to. If your code isn't already on one of those (for example, it's on a private/internal git server), push
it to a new GitHub repo first:

```bash
git remote add github https://github.com/<you>/<repo>.git
git push github main
```

Then:

1. Go to [dashboard.render.com](https://dashboard.render.com), sign in (or create a free account), and
   authorize Render to access your GitHub account.
2. Click **New +** → **Blueprint**, and pick the repo you just pushed. Render reads `render.yaml` and
   proposes one web service (`strata-qa`) on the **Free** plan. Click **Apply**.
3. Once it's live, open the service's **Environment** tab and set `APP_BASE_URL` to the URL Render assigned
   it (shown at the top of the service page, e.g. `https://strata-qa.onrender.com`). This is only used to
   build links in Discord failure alerts - safe to skip if you don't use that feature.
4. (Optional) Set `DISCORD_WEBHOOK_URL` in the same tab if you want failed test runs to post to Discord.

After that one-time setup, every `git push` to the connected branch redeploys automatically - there's no
separate deploy command to run.

### Known limitation: free-tier storage is not persistent

Render's free web services have no attached disk. The SQLite database (`server/data.sqlite`) lives on the
container's local filesystem, which resets to the seeded demo data every time the service redeploys or
wakes up from sleep (free services sleep after about 15 minutes with no traffic, and take 30-60s to wake on
the next request). Anything added or changed in the live app - a new bug, an edited test case - is lost at
the next sleep cycle. That's a reasonable trade-off for a free demo/portfolio deployment, but if you need
the data to actually persist, add a paid [persistent disk](https://render.com/docs/disks) to the service and
point `DATABASE_PATH` (see `.env.example`) at a path on that disk.
