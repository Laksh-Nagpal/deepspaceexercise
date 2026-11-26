# RallyIQ

A collaborative tennis match notebook built with **DeepSpace 0.44.2**, React 19,
TypeScript, Vite and Cloudflare Workers. Record complete shot-by-shot rallies on a court,
follow a match live with a coach, and generate evidence-cited tactical advice.

- Live app: https://deep-exercise.app.space
- Public demo (no account): https://deep-exercise.app.space/demo
- Public source: https://github.com/Laksh-Nagpal/deepspaceexercise
- Reviewer walkthrough: [SUBMISSION.md](./SUBMISSION.md)

## Run locally

Use Node 24 (`.nvmrc`) and npm 11.6+. With nvm: `nvm install && nvm use`.
On the development Mac, Homebrew Node 24 is already installed:

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
npm ci
npx deepspace auth whoami
# If signed out:
npm run login
npm run dev -- --port 5187 --host 127.0.0.1
```

Open http://127.0.0.1:5187/. The CLI prepares local platform configuration and
starts both Vite and the Worker. `.nvmrc` does not change an already-open
terminal automatically. Do not hand-edit generated `.dev.vars`.

## Product workflow

1. Explore the public demo without signing in, or sign in and create a match.
   Enter player names and optional match notes.
2. Quick entry is on by default. Choose the shot type and initial hitter, then
   click/tap a landing location (or use arrow keys and Enter) to add the shot
   immediately. Hitters alternate automatically. Shot type is retained after
   returns; a serve switches to forehand. Turn Quick entry off for the explicit
   select-location → **Add shot** workflow.
3. Repeat for each shot in the point. Undo the last draft shot or edit a draft
   shot's type/location. **Finish point** opens the outcome dialog beside the
   court; the same controls also appear below the draft. The point winner follows from
   that outcome and the last hitter. **Save point** commits the whole sequence
   atomically and counts exactly one point.
4. Other authorized browsers receive the saved point with its entire sequence.
   Use **Replay** to step through numbered landing locations. Connectors show
   landing order, not measured trajectories or hitter movement.
5. The owner creates coach/viewer invitations by email. Share the URL manually;
   **no email is sent**. The invitee signs in with the invited email and accepts
   in their workspace. Pending invitations refresh every 15 seconds or on demand.
6. Owners/coaches add observations. Viewers only read. Owners revoke membership
   or cancel invitations; open sockets re-subscribe and lose revoked access.
7. Remove an incorrect point after confirmation, then re-enter it correctly.
8. The owner finishes the match. After at least 10 points, owner/coach can request
   an AI review. Reopening lets recording continue. A saved review is marked
   historical when point IDs/revisions change, including after deletion.
9. **Print match report** opens an authorized preview with current statistics,
   placement, saved AI advice/evidence and the latest ten observations. Use
   **Print / Save as PDF** and your browser's Save as PDF destination. Opening a
   report URL requires match access; exporting does not make a private match public.

The **Try a sample match** button creates a private completed match containing
12 clearly labelled synthetic three-shot rallies (36 shots, still 12 points). No AI call occurs until Generate analysis.

The public `/demo` and `/demo-report` routes use only bundled, fictional data
and clearly labelled, hand-written example advice. They make no auth, database,
WebSocket or AI request and never query private matches. The demo supports
read-only replay; sign in to record and collaborate.

## Architecture and files

- `src/pages/index.tsx`: static prerendered front page; no auth/data connection.
- `src/pages/(app)/_layout.tsx`: SDK auth, RecordProvider and RecordScope.
- `src/pages/(app)/home.tsx`: match list, invitation inbox and selected match.
- `src/features/matches/`: modular court, creation/detail UI, sharing,
  observations, analysis panel, input validation and deterministic statistics.
- `src/schemas/`: collection definitions; `src/schemas.ts` registers them for
  the browser and Worker.
- `src/actions/access.ts`: parent-match authorization and verified profile email.
- `src/actions/index.ts`: match lifecycle, point logging/removal, sample data,
  and additive compatibility for Phase 1 records.
- `src/actions/collaboration.ts`: email-bound invitations, membership and notes.
- `src/features/matches/evidence.ts`: pure, shared deterministic evidence.
- `src/features/matches/MatchReport.tsx`: common private/demo print renderer.
- `src/pages/(app)/(protected)/report/[id].tsx`: native authorized report reads.
- `src/actions/analysis.ts`: input fingerprint, bounded
  provider call, output validation and saved report.
- `worker.ts`: existing Hono/DO wiring plus an internal persistent AI rate gate.
- `src/server/`: scaffolded auth, HTTP, WebSocket and action transports.
- `tests/`: real-browser smoke, API, persistence and four-user authorization tests.

Data flow: authenticated HTTP action → Zod validation → parent authorization →
RecordRoom SQLite write → WebSocket subscription → derived UI statistics.
Records use the SDK envelope; application fields live under `record.data`.
Only draft input lives in React state. No localStorage database or separate
hand-maintained counters are used.

### Data model

`matches`: player, opponent, details, teamId (the match ID), tracking/completed
status; system envelope holds its owner (`createdBy`).

`points`: matchId, match ownerId, finishing-shot type/hitter, point winner,
outcome, normalized terminal x/y coordinates, requestId and an ordered JSON
`rally` array of `{shotType, shotBy, x, y}`. One row is one completed point; the
JSON array is stored natively by DeepSpace and committed atomically with the
result. Terminal columns are retained for compatibility and must agree with
the last shot. The server validates alternating hitters and serve placement
in the sequence. It does not adjudicate line calls. System fields retain author
and timestamps. Old rows without a rally retain **finishing-shot-only** coverage;
missing buildup is never synthesized.

`team_members`: native TeamId/UserId/Status fields, match role, email and ownerId.
`invitations`: matchId, recipient email, role, status and match label.
`observations`: matchId, ownerId, author, text and timestamps.
`analyses`: matchId, ownerId, input fingerprint, structured report and model.
Required scaffold `users` and admin `settings` collections remain registered.

### Authorization decisions

AuthGate protects UI only. Server actions authenticate with the SDK JWT and
check the parent match before every privileged operation. **Action tools bypass
RBAC**, so the helper's checks are mandatory, including after slow AI calls.

Owners manage membership and match completion; owners/coaches record and remove
points, add observations and request analysis; viewers read only. Outsiders and
anonymous callers get no match access. All direct record writes are denied,
including via agent tools. Child records use **match-owner ownership**, not the
coach's authorship, so a former coach cannot retain access through createdBy.

Shared reads use DeepSpace's native `access` policy and same-scope team_members.
SDK 0.44.2's `team` SQL query fast path assumes createdBy ownership; `access`
uses per-record ownerField checks instead. Membership columns use the SDK's
`UserId` notification spelling so revocation refreshes already-open clients.
No SDK code is patched. Roles are match-specific, never app-admin promotions.
An invitation is email-bound, not a bearer link. Email comes from the caller's
system-managed users profile. Revocation stops future access, not copies of
information a previously authorized person already viewed.

### AI grounding and cost

The server calculates point totals, win rate, all known shot-type counts,
terminal winners/errors, explicit-rally coverage, average recorded rally length,
long-rally results, and prior-shot left/right placements before player winners. Legacy points infer only the known final hitter from winner/outcome; new
rallies store every hitter explicitly. Legacy rows contribute no invented
rally length or setup evidence. AI sees only those
aggregated facts, not names, emails, credentials or free-text observations.

DeepSpace `createDeepSpaceAI` routes a structured Vercel AI SDK call to an
installed catalog model (preferring Anthropic Haiku). It suggests two or three
experiments and references server-defined evidence IDs. Output schema, citation
IDs and numeric text are checked. When rally sequences exist, at least one
recommendation must cite rally-length, long-rally or setup-placement evidence. Exact supporting numbers are rendered from
server facts, not generated prose. Advice is observational and may still be
imperfect; no guarantees of tactical success are made.

Calls are **app-owner funded**. A Durable Object storage transaction enforces
one new attempt per match per minute and 20 attempts per UTC day for the app,
including failed calls. The model output is capped and requests time out after
45 seconds. Identical snapshots reuse saved reports. Data and membership are
rechecked after generation. No fabricated fallback report is shown on failure.

### Reliability and scope

- Save failures remain visible. Point draft UUIDs make retries idempotent; UI
  prevents double clicks. No automatic offline write queue is claimed.
- Match/point state survives refreshes and new browser contexts via server storage.
- Displays the latest 100 authorized matches, first 500 points and latest 100
  observations; UI labels these limits. Larger-scale pagination is future work.
- New points support up to 100 ordered shots. In-progress drafts are local to
  the recording browser and lost on refresh; they are not persisted, broadcast
  or counted until the point is saved. This avoids half-written scored points.
  Owners/coaches can record different points concurrently, but do not co-edit
  the same unsaved draft.
- No full game/set scoring, video analysis, computer vision, payments or external
  sports APIs. Presence, granular point editing and automated email delivery are
  intentionally omitted; correction uses remove-and-reenter.
- The `deep-exercise` app ID/subdomain is retained to preserve data and source
  ownership. RallyIQ is its display brand.

## Tests

```bash
npm run validate
npm run lint
npm run build
# Test prerendered demo hydration against the production build:
TEST_PRODUCTION_BUILD=1 DEEPSPACE_PORT=5192 NODE_OPTIONS=--dns-result-order=ipv4first npx playwright test --config tests/playwright.config.ts tests/submission-polish.spec.ts --grep "public demo"
npx deepspace test run all --port 5191
# Opt-in real provider call (owner-funded; needs quota/credits):
RUN_LIVE_AI=1 npx deepspace test run all --port 5191
```

Multi-user tests need four usable test accounts. Inspect
`npx deepspace test accounts create --help`; use generated credentials through
`--password-stdin`, never passwords on argv or in source. Test credentials are
stored by the CLI outside this repository. Tests create local synthetic matches.

The opt-in AI test is skipped by default to keep routine tests free of provider
charges. Unit tests validate deterministic statistics, malformed inputs,
parent authorization, revoked-author reads, rally ordering/terminal validation,
legacy coverage and rejected AI citations/numbers.
Browser tests cover creation, placement, refresh/new-context persistence,
multi-shot point counting, draft undo/editing, numbered replay,
touch-based quick entry, public demo isolation, printable PDF rendering, report
access/revocation and anonymous restrictions,
same-account and cross-account updates, coach/viewer/outsider actions, invitation
acceptance/cancellation, open-socket revocation, correction, replay-safe point
saves, and the pre-AI evidence gate. Live-provider verification additionally
checks saved advice, exact evidence and cached reuse.

## Deploy and secrets

GitHub is the permanent source. Review, commit and push intended changes, then:

```bash
git push origin main
npm run deploy
npx deepspace releases
npx deepspace logs --since 5m --level error
```

Deploy ships the current checkout, including dirty bytes. GitHub pushes do not
automatically deploy. No separate Cloudflare account is needed.
Store custom secrets through `npx deepspace secrets`; never commit `.dev.vars`,
`.env`, credentials, browser auth state or local build folders. Those are ignored.

## Documentation reviewed

- https://docs.deep.space/concepts/permissions.md
- https://docs.deep.space/guides/data-storage.md
- https://docs.deep.space/guides/authentication.md
- https://docs.deep.space/guides/ai-chat.md
- https://github.com/deepdotspace/deepspace-skill
- https://github.com/deepdotspace/taskspace/blob/main/src/schemas.ts
- https://github.com/deepdotspace/tally/blob/main/src/schemas.ts

Installed types/source and CLI help are the authority for this pinned version.

## Rally analysis versioning

Analysis fingerprints and source-version markers include `rally-v2`. Saved
finishing-shot-era reports remain readable but are marked historical and cannot
be reused as a current rally-based report. This invalidates old analysis without
changing or deleting old points.
