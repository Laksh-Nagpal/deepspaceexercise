# RallyIQ — reviewer guide

Live app: https://deep-exercise.app.space
Source: https://github.com/Laksh-Nagpal/deepspaceexercise (private; reviewers need repository access)

RallyIQ is a real-time tennis match notebook. It helps a player and coach
capture whole rallies shot by shot and share observations, then turn recorded statistics into
cautious tactical experiments. It deliberately avoids complex tennis scoring
and video processing so the core workflow remains explainable and reliable.

## Five-minute demo

1. Sign in and select **Try a sample match**. It is clearly labelled synthetic
   and contains 12 persisted three-shot rallies: 36 shots counted as 12 points. Alternatively create a fresh match.
2. Reopen a match, place a serve and select **Add shot**. Add the opponent's
   return and the player's next shot. Edit or undo a draft shot. Set the final
   outcome and **Save point**: three shots count as one point.
   Replay the saved rally using the numbered court and Previous/Next controls.
   Refresh to demonstrate that the entire ordered sequence persists.
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

One row is one completed point with a native JSON array of ordered shots.
Earlier finishing-shot-only records remain labelled as such and are excluded
from rally-length/buildup statistics. Drafts are local until Save point, so
viewers receive completed sequences rather than partial scored points.
AI can use measured rally length and prior-shot placement for recorded rallies;
it cannot infer serve percentage, hitter movement or unrecorded events. Participants share a match's
notes and analysis, but have no access to other matches. Revocation prevents
future reads/writes; it cannot retract previously viewed information.

Notebook limits are explicit (100 matches, 500 points per match, 100 shots per
point, 100 visible observations). Correction is remove-and-reenter. Offline saves, email delivery,
presence and full match scoring are outside this take-home's scope.

See README for installation, exact test commands, AI billing/quota behavior,
security choices and future improvements.

## Initial-release verification — November 25, 2026

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

Production verification also passed on November 25:

- Deployed release `rel_01M8ABS4CA814SC5Q26MXWGWCE` from clean application commit
  `a8e2422`; DeepSpace confirmed edge serving and the data plane.
- Three independent signed-in browser contexts exercised sample creation,
  email-bound invitation acceptance, coach point entry, viewer read-only access,
  live point/observation delivery and open-session coach revocation.
- A real production DeepSpace AI call returned three recommendations. The
  displayed evidence was verified against the synthetic 13-point sample:
  nine points won, a 69% win rate. The saved report survived refresh.
- Mobile touch emulation at 390 × 844 verified match creation, court placement,
  saving and refresh persistence, with no horizontal overflow.
- Desktop, analysis and mobile screenshots were visually inspected. No uncaught
  browser errors or recent production error logs were observed.

The two production sample notebooks belong only to dedicated test accounts;
reviewers can create their own private sample using the in-app button. No real
player data or test-account passwords are included in this repository.

## Rally tracking update

The updated workflow includes local draft undo/editing, atomic rally saves,
numbered replay, all-shot distributions, explicit-rally length statistics and
setup-placement evidence. `PointRecorder.tsx` owns the rally draft; `model.ts`
validates/normalizes it; `logPoint` validates ownership and the ordered sequence
before writing a single point record. Native DeepSpace JSON columns preserve
the sequence without a second child collection or a multi-row transaction.

Legacy points and reports are preserved. The analysis fingerprint is versioned
so finishing-shot-era reports are not silently reused for the new statistics.

Rally-update verification: TypeScript, lint, production build, 13 unit tests and
all 17 browser/API tests passed with live AI enabled and no skips. The new
workflow test verifies that three shots count as one point, draft undo/editing,
ordered replay markers, coordinate persistence after refresh, and restoration
in a fresh browser context. Existing four-user access/revocation tests still
pass. The live provider test now uses explicit three-shot rallies and verifies
that rally evidence is available alongside the exact point totals.
