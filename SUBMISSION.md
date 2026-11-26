# RallyIQ — reviewer guide

Live app: https://deep-exercise.app.space
Public demo: https://deep-exercise.app.space/demo (no account required)
Source: https://github.com/Laksh-Nagpal/deepspaceexercise (public; no invitation required)

RallyIQ is a real-time tennis match notebook. It helps a player and coach
capture whole rallies shot by shot and share observations, then turn recorded statistics into
cautious tactical experiments. It deliberately avoids complex tennis scoring
and video processing so the core workflow remains explainable and reliable.

## Five-minute demo

1. Explore the public demo without signing in: choose a point, step through
   the rally and open the sample printable report. Its data and illustrative
   advice are fictional; no live AI request is made.
   For the private workflow, sign in and select **Try a sample match**. It is clearly labelled synthetic
   and contains 12 persisted three-shot rallies: 36 shots counted as 12 points. Alternatively create a fresh match.
2. Reopen a match. Quick entry is enabled: each court tap adds the selected
   shot and alternates the hitter. Record a serve and two returns; Undo and
   edit are available for corrections. **Finish point** opens an outcome dialog;
   **Save point** commits three shots as one point. Turn Quick entry off for
   manual select-location → Add shot entry.
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
8. Open **Print match report**, inspect the summary and use **Print / Save as
   PDF**. The report URL follows match permissions. Sharing an exported file
   shares its contents, so use the fictional sample for a public example.

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
- `src/features/matches/evidence.ts`: computes facts shared by AI and demo.
- `src/features/matches/MatchReport.tsx`: print preview and printable document;
  `/report/:id` uses native permissions, while demo fixtures remain public.
- `src/actions/analysis.ts`: validates evidence IDs,
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

Production rally verification also passed: older finishing-shot-only points
were retained and explicitly labelled. A five-shot rally recorded with mobile
touch input added exactly one completed point and synchronized to a second
browser. The synthetic match's totals were verified as 13 points, 41 recorded
shots, and a 3.2-shot average. Numbered replay survived refresh, and a real
DeepSpace AI report used the recorded-rally evidence. No uncaught browser
errors or mobile horizontal overflow were observed.

## Submission polish — November 26, 2026

- A public, read-only `/demo` replays 12 fictional rallies without sign-in,
  database reads, app WebSockets or AI requests. Its example advice is clearly
  labelled as illustrative. Private matches remain behind native permissions.
- Quick entry records each court tap immediately, alternates hitters, retains
  the selected return type and puts Undo / Finish point beside the court.
  The outcome dialog confirms the winner before saving one atomic point.
  Manual entry and draft editing remain available.
- Printable match reports include current statistics, shot placement, saved AI
  recommendations with evidence, historical-review warnings and the latest ten
  observations. Report URLs honor match roles and live revocation; exporting a
  PDF is an explicit browser action. `/demo-report` is a fictional public sample.
- TypeScript, ESLint, production build, 15 unit tests and all 19 browser/API
  tests passed, including the real AI provider check; none were skipped.
  New checks cover mobile touch input, one-point counting, refresh persistence,
  anonymous demo isolation, report permissions and open-report revocation.
- A4 PDF output was rendered and visually inspected. The demo report occupies
  two pages; a short report without saved analysis fits on one. Mobile demo
  layout was checked at 390 × 844 without horizontal overflow.

## Agent involvement and applicant verification

The applicant chose the tennis notebook, directed the collaboration workflow,
and requested whole-point shot tracking. The coding agent implemented the UI,
authorized server actions, native data/permissions, AI grounding and deployment,
and ran the automated and browser verification documented above.

Those checks are agent-assisted verification. In the portal note, describe only
checks you personally repeated as your own verification. The five-minute demo
above is a practical rehearsal before the live coding session.

A separate production-build regression also checks direct `/demo` and
`/demo-report` loads for hydration errors. The live check caught a server-rendered
SVG title mismatch; shot labels now use one text string, and demo controls wait
for hydration before accepting input. Keyboard quick entry was checked as well:
arrow keys move the visible cursor and Enter adds exactly one shot.

Final live verification passed on November 26 for application commit `de27e7f`,
release `rel_01M8CRE6FS5PABJ54DD7YDZGAX`: anonymous demo replay made no API
requests or WebSocket connections; three mobile shots saved as one point,
synchronized to a second browser and survived refresh/replay. Both public and
private reports produced A4 PDFs. Anonymous and outsider report access was
blocked. No browser errors or recent server error logs were observed.
