# DeepSpace exercise

Starter for a five-day DeepSpace take-home. The application idea has not yet
been selected; the current UI and collections are the generated starter.

## Prerequisites

- Node.js 24 (see `.nvmrc`).
- npm 11.6 or newer.
- A signed-in DeepSpace CLI session. The CLI is included in the project.

With nvm, run `nvm install` and `nvm use` in this directory. On this Mac,
Homebrew Node 24 is already installed and can instead be selected for the
current terminal:

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
node --version
npm --version
```

This changes the current shell only; `.nvmrc` is used by nvm-compatible tools
and does not automatically change an existing terminal's Node version.

## Install and run

```bash
npm ci
npx deepspace auth whoami
# If signed out:
npm run login
npm run dev
```

Open the URL printed by the CLI (normally http://localhost:5173). Use the
DeepSpace development command: it starts Vite and the local Worker together
and prepares platform configuration. Do not hand-edit generated `.dev.vars`.

## Checks

```bash
npm run validate                  # TypeScript and unit tests
npm run lint                      # ESLint
npm run build                     # Production build; does not deploy
npm test                          # Default DeepSpace runtime checks
npx deepspace test run all        # All runtime specs, including collaboration
```

The collaboration specs need two usable DeepSpace test accounts on this
machine. Without them, those tests skip explicitly. Run
`npx deepspace test accounts --help` for the account-management commands.
Never place test passwords in commands, repository files, or logs.

## Architecture

- `src/main.tsx`: mounts React and the generated file-based router.
- `src/pages/_app.tsx`: shared UI providers and error boundary; no auth or
  records connection on static pages.
- `src/pages/index.tsx`: public, prerendered landing page.
- `src/pages/(app)/_layout.tsx`: authentication and real-time record providers.
- `src/pages/(app)/(protected)/_layout.tsx`: additionally requires sign-in.
  Parenthesized route groups do not appear in URLs.
- `src/schemas.ts` and `src/schemas/`: collection fields and server-enforced
  permissions. Keep the required `users` collection.
- `worker.ts`: assembles the Hono backend and exports Durable Object classes.
- `src/server/`: HTTP, WebSocket, and server-action route implementations.
- `src/actions/index.ts`: application-specific server actions (currently empty).
- `src/ai/tools.ts`: shared AI/local-agent tool definitions, already registered
  by the Worker. In-app AI chat is not installed yet.
- `src/integrations.ts`: integration billing and anonymous-access policy.
- `src/cron.ts` and `src/jobs.ts`: scheduled/background work (currently empty).
- `wrangler.toml`: app identity, Worker assets, and Durable Object bindings.
- `src/components/ui/`, `src/themes.*`, and `src/styles.css`: UI and styling.
- `tests/`: Playwright smoke, API, and multi-user checks.

Data flow: React `useQuery()` subscribes over a WebSocket; `useMutations()`
sends changes; the RecordRoom checks permissions, persists accepted changes
in SQLite, and broadcasts updates. Application fields are under `record.data`.
Wait for mutation readiness; use confirmed mutations when subsequent UI
behavior depends on server acceptance. An auth gate is UI protection, while
collection permissions are the data security boundary.

## GitHub and deployment

The requested repository is private and named `deepspaceexercise`. Connect the
intended GitHub `origin` before the first deploy. DeepSpace permanently selects
the source provider on first source use: a first deploy with a selected GitHub
remote claims GitHub source. Do not run `deepspace push` before that deploy.

For GitHub source, use ordinary Git for commits and pushes. Deploy ships the
current checkout, including uncommitted changes, so review the working tree
and commit intended changes before shipping:

```bash
git status
git push -u origin main
npm run deploy
npx deepspace releases
```

Deployment uses DeepSpace-managed Cloudflare infrastructure; no separate
Cloudflare account is required. The CLI returns the live app URL.

## Secrets

Store app secrets with the DeepSpace encrypted secrets store; inspect
`npx deepspace secrets --help` for the supported workflow. `.dev.vars`, `.env`
files, dependencies, local runtime state, and build output are ignored by Git.
Never commit credentials or publish local build folders as repository content.

## References

- [DeepSpace docs](https://docs.deep.space/)
- [Authentication](https://docs.deep.space/guides/authentication)
- [Data storage](https://docs.deep.space/guides/data-storage)
- [Source control](https://docs.deep.space/guides/source-control)
- [Testing](https://docs.deep.space/guides/testing)
