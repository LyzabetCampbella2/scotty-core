# SCOTTY independent brain — guarded staging acceptance

Reviewed build snapshot: October 30, 2026. This file is a release gate, **not a deployment report**.

## Exact branch and environment boundaries

- Live Render `scotty-core` uses branch `cloud-independent-voice`. Do not attach a staging Worker to another owner's server, Render PostgreSQL, R2 or paid services.
- Independent Cloudflare Worker source is under `offline-brain/cloudflare-ipad`. The staged upgrade chain is PR #49 (relevant scoped D1 recall) followed by PR #53 (per-specialist knowledge, project permissions, mission verification and D1 governance). PR #54 is the **separate Render HUD companion**, not an implicit Worker deployment.
- Check the actual Cloudflare Git build branch. The Worker preflight currently requires `dev/ipad-cloudflare-staging-gates-20261024` in its manually configured staging build context. A draft PR's source branch does not automatically make that Worker live.
- The dedicated D1 binding must be `BRAIN_DB`, named `scotty-brain-memory`. Never use `scotty-memory` Render PostgreSQL as a staging target.
- `AI_ENABLED` defaults to `false` in this draft Worker configuration. Confirm Workers **Free** billing and model allowance directly in the owner's Cloudflare dashboard; preflight checks alone cannot prove a plan or quota. Do not enable AI merely because CI is green.
- Keep the Worker `OWNER_BEARER_TOKEN`, Render bridge bearer token and any database credentials in their existing protected account settings. Do not paste them into chat, GitHub, screenshots, console logs, CI or client JavaScript.

## Non-negotiable recovery gate

On October 18 a real encrypted Render PostgreSQL snapshot was restored in an isolated PostgreSQL 18 environment with 77 tables, 6 sequences, 128 agent rows, 12 chief rows, and aggregate memory/project coverage. This verifies that snapshot **only**, not changes made afterward.

The current Render free PostgreSQL expires November 7, 2026. Recovery work is tracked in issue #55. The October 24 retry failures were caused by a missing private `DATABASE_URL` on the existing backup cron. The cron's execution and production-export approvals were reset to OFF and its safety-settings deploy went live on October 30. **Do not merge or launch data migrations based on an old recovery point without confirming continuity for newer production data.** Preserve the existing encrypted production archive and owner's separate recovery key copies.

## Release order and acceptance evidence

1. **Backup and staging freeze:** Preserve current working production; verify a recent recoverable snapshot and that no new billable services were created. Confirm which exact Worker branch is deployed, Free status and D1 identity. Stop if any identity differs.
2. **D1 readiness:** From an owner-authenticated staging session, read `GET /api/readiness` and `GET /api/status`. Verify the installation marker and both `brain_notes` / `brain_missions` tables. `canInferTeam` must stay false until D1 is ready. Do not accept `canInfer` (single-agent demo) as proof of durable teamwork.
3. **Migration approval:** If note-governance features are wanted, first create an independently checked recovery/export of the isolated D1. Review and manually apply `memory-governance-v2.sql` to **that D1 only**. Confirm `governanceMigrationReady=true` including all audit columns. If false, the HUD must stay read-only for changes. Do not apply this SQL to Render PostgreSQL.
4. **Read-only team evaluation:** Check `GET /api/quality-cases` returns 25 synthetic cases, zero AI calls and zero writes. Confirm the assigned specialist and chief for all cases. Review `POST /api/team-preview` with a non-private fictional question: exact agents, reasons, read-permissions, retrieved source reasons and field procedures; provider calls and writes remain zero.
5. **Permission denials:** Test a synthetic source assigned only to a specialist. The Worker must return `PROJECT_REVIEW_CHAIN_DENIED` without any model call. Reapprove that source for specialist, chief and SCOTTY, then inspect all three direct readers. Another project ID or revoked source must be denied.
6. **Voice and actual model (after Free-plan owner approval):** Temporarily turn on dedicated Worker AI while retaining per-request owner consent. On the iPad, say a synthetic request, allow spoken confirmation only after playback ends, hear the chosen team and final Scottish answer without tapping Send, and verify that cancellation/interrupt does not call a provider. Record the observed model and actual speech. The desktop synthetic harness cannot certify a physical iPad microphone or TTS.
7. **Durable mission:** Send one synthetic approved team request with a unique mission ID. Verify the HTTP response says `missionPersisted=true` and `missionReadbackVerified=true`. Independently read `GET /api/missions` and match the ID, status and entire answer. A missing/wrong D1 must refuse team inference before using AI. Reusing the ID with changed approved project contents must yield a mission conflict rather than an earlier answer.
8. **Reviewed D1 memory:** Save a synthetic, owner-edited note with explicit agent/scope/freshness and privacy approval; independently read it back. For change tests, inspect a preview, grant separate approval, apply exactly once, and confirm audit/readback. A revoked/expired or wrong-project note must not leak.
9. **Department quality:** Run the 25 assignments using actual AI only if the owner's quota permits and each request receives explicit approval. For every case preserve specialist output, chief critique, SCOTTY synthesis, expected result, source coverage and owner pass/fail/uncertain review. A green mocked run is **NOT** an accuracy assessment.
10. **Release and rollback:** Only after the Worker endpoints are live and verified, consider promoting companion HUD PR #54 to the Render deployment branch. Make a rollback plan first: disable Render AI/memory proxy flags and set Worker `AI_ENABLED=false`; preserve checkpoint records. Verify ordinary HUD tasks, folders, native commands and gestures are unaffected.

## Decision and sign-off

**Development CI:** seven Worker synthetic checks passed and two Render HUD synthetic checks passed at the last verified working commits. Re-run checks on each subsequent commit.

**Not independently accepted:** live Workers Free plan, actual deployed Worker revision, Cloudflare D1 migration and live readbacks, actual model quality for 25 departments, owner iPad continuous voice, up-to-date production database backup, and final integration into production.

Do not label the overall release finished until those facts are verified with dates, mission IDs, actual responses and safe redacted logs. Never record private tokens, document text or personal data in acceptance reports.
