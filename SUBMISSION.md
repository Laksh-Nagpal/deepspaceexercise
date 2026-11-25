# RallyIQ — reviewer guide

Live app: https://deep-exercise.app.space
Source: https://github.com/Laksh-Nagpal/deepspaceexercise (private; reviewers need repository access)

RallyIQ is a real-time tennis match notebook. It helps a player and coach
capture finishing shots and observations, then turn recorded statistics into
cautious tactical experiments. It deliberately avoids complex tennis scoring
and video processing so the core workflow remains explainable and reliable.

## Five-minute demo

1. Sign in and select **Try a sample match**. It is clearly labelled synthetic
   and contains 12 persisted points. Alternatively create a fresh match.
2. Reopen a match, select a court location and log a forehand/backhand/serve/volley
   outcome. Show totals updating. Refresh to demonstrate persistent storage.
3. Open the same match in another authorized browser; record a point and show
   that it appears without reloading.
4. As owner, create an invitation for a second account's exact sign-in email.
   Share the match URL manually. In the second browser, refresh invitations and
   accept as coach. Add an observation and show it appearing live.
5. Add a viewer account; show that the viewer can follow but cannot log points.
   Revoke the coach and show the match disappearing from their open workspace.
6. Remove an incorrect point, confirm, and show all clients' totals updating.
7. Finish a match with at least 10 points. Generate analysis, show the exact
   supporting facts alongside advice, then refresh to show the saved report.
   An identical request reuses the report rather than billing again.

No automated invitation email is sent. The recipient accepts in their workspace.
AI is owner-funded and subject to the visible app quota; there is no API-key setup
for a reviewer. The minimum point count is a product guardrail, not a claim of
statistical significance.

## What to explain during live coding

- `src/features/matches/model.ts`: shared validation, hitter attribution and pure
  statistics. Start here for changing a shot type or adding a metric.
- `src/schemas/`: persisted columns and native read permissions.
- `src/actions/access.ts`: authoritative match-role lookup. Client role checks
  improve UX but cannot authorize an API call.
- `src/actions/index.ts`: writes, completion and correction. Action tools bypass
  RBAC, so each handler explicitly checks its parent match.
- `src/actions/collaboration.ts`: email-bound invitations become native active
  team memberships; revocation changes membership and refreshes subscriptions.
- `src/actions/analysis.ts`: computes facts before AI, validates evidence IDs,
  caches a data fingerprint and rechecks access after the provider responds.
- `worker.ts`: standard DeepSpace/Hono assembly and a small persistent AI quota
  gate. Domain UI components remain independent of deployment plumbing.

Suggested live modification: add a new deterministic metric to `playerSummary`,
write a small unit test, then display it. A permissions exercise can change which
role may add an observation, with both the action check and UI updated together.

## Deliberate tradeoffs

One row is one finishing shot, not a full rally. AI cannot infer serve percentage,
rally length, opponent movement or unseen events. Participants share a match's
notes and analysis, but have no access to other matches. Revocation prevents
future reads/writes; it cannot retract previously viewed information.

Notebook limits are explicit (100 matches, 500 points per match, 100 visible
observations). Correction is remove-and-reenter. Offline saves, email delivery,
presence and full match scoring are outside this take-home's scope.

See README for installation, exact test commands, AI billing/quota behavior,
security choices and future improvements.

## Verification performed — November 25, 2026

- TypeScript, ESLint and production build passed on Node 24.
- 10 unit tests passed.
- `RUN_LIVE_AI=1 npx deepspace test run all --port 5191`: all 16 browser/API
  tests passed, with none skipped. This includes a real DeepSpace AI request,
  saved report/cache reuse, stale-report detection after correction, and the
  persistent per-match analysis rate gate.
- Four independent accounts exercised owner, coach, viewer and outsider access,
  including removal of access from an already-open coach session.
- A credential-pattern and local-secret scan found no credentials in the
  version-controlled/source candidate files. Generated auth/build files remain
  ignored.
