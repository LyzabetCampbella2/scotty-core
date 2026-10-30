# SCOTTY project capability rollout — October 30, 2026

**Status:** CODED / SYNTHETIC TESTS — development PR #54; **not merged into Render production**. Companion Worker work is PR #49 → #53, also not deployed. The live Render system must remain unchanged until the backup and staging gates pass.

## Priority 6–11 and priority 12
- **6 — Specialist depth:** 160 authored playbook profiles covering 25 departments; owner/field factual review remains outstanding. PR #53.
- **7 — Project permissions:** Exact recipient/source authorization for agent, chief and SCOTTY handoffs; cross-project mission-ID hashes reject changed context; no automatic private file copy. PR #53 and existing Render collaboration grants.
- **8 — Older knowledge:** Bounded relevance-ranked old memories with retrieval reasons and strict scopes; does not imply arbitrary older notes are retained or verified. PR #49.
- **9 — Memory governance:** D1 correction, superseding, expiry, deletion, audit, conflict candidates with preview/revision/readback; dedicated D1 migration approval and backup required. PR #53.
- **10 — Chief review:** Per-stage reviewer handoffs and explicit owner acceptance; green synthetic model stubs are not factual quality certification. PR #53 and existing Render project mission reviews.
- **11 — Publisher:** Publisher/date/source-review proposals, no automatic fact promotion or publishing. PR #53.
- **12 — Reliability and operations:** Worker `GET /api/operations` reports checkpoint counts, stale running candidates and explicitly unknown quota; owner HUD includes Render recovery deadline. Replays require exact independent D1 readback, and no uncertain job is auto-retried. PR #53/#54.

## Project capabilities in the original HUD

| Capability | Code staged / existing foundation | What is not proven live |
|---|---|---|
| Preferred project teams | Revisioned named teams for authorized Bloodpool, Golden Hour Creative, Eirden Atelier, or another existing project; current grant checks; no automatic permission grants | Actual authorized project records, current roster readbacks on prod |
| Multi-step missions | Existing staged mission planner with specialist drafts, chief review, owner acceptance and bounded stages; new preferred-team → non-executing plan | Real-model budget and actual owner-approved execution |
| Mission progress | One Project Command Center shows current stages, reviewers, decisions and blockers from project APIs | Physical iPad display and live project database |
| PDF/DOCX/images/links | Existing workspace file bytes and extractors; new 10-minute hash-bound preview→approve→attach with explicit recipients; images use owner-written descriptions, not automatic visual verification | Actual uploaded file extraction, grant/revocation/readback on live database |
| Voice-driven organization | Existing commands for project selection, folder and material operations, exact confirmation; added named team saving and all-project briefing | Physical iPad microphone, continuous wake word, accent and interruption reliability |
| Daily chief briefing | New account-wide `GET /api/agent-brains/project-operations/brief-all` + one-project briefing; source gaps and stale app snapshots | Scheduled delivery; fresh external calendar/mail reads |
| Connected apps | Existing connector previews and action permissions; HUD reads Notion and Google Docs/Apple planner status, plus native Gmail.send/Calendar.events/Drive.file OAuth scope grants | Valid external API calls; calendar/email/document writes approved by owner |
| Deliverables | Existing workspace PDF/XLSX/text exports; new Markdown/text exports only from exact revision owner-released mission steps | A full real-model drafted, reviewed and downloaded artifact from live project |
| Reviewed learning | Draft lessons from owner-rejected/revision-requested work; separate explicit saved development record | Actual memory promotion to live agent instructions (deliberately not automatic) |
| Cross-department | Project team of up to eight currently permitted agents, with their chiefs; exact scope and source grants | Live cross-department question/answer quality and total provider usage |
| SCOTTY–Dawna | Existing Ansjem requests, agreements, ownership/technical acceptance/handoff review, envelope format `scotty.ansjem.exchange.v1`; HUD explicitly shows `connected:false` | No verified authenticated Dawna external API, remote send/receipt, or production coupling |
| Voice/HUD polish | 44px touch targets, Escape key close, staged voice status for Piper AWB Scottish, existing echo/interrupt defenses, spoken preferred-team confirm | Scottish TTS on actual iPad, pronunciation and background microphone reliability |

## Protected configuration and release order

1. **Urgent backup continuity:** Render `scotty-memory` Free PostgreSQL expires November 7, 2026. An October 18 encrypted production snapshot was actually restored independently; the October 24 attempts failed because the existing cron lacked private `DATABASE_URL`. Recovery issue #55 tracks a fresher verified snapshot. Keep backup export approval flags OFF until a separate owner-authorized run and isolated restore.
2. **Flags:** existing Render `SCOTTY_PROJECT_OPERATIONS_ENABLED=true` and `SCOTTY_PROJECT_MISSIONS_ENABLED=true` gates are needed for project routes; `SCOTTY_PROJECT_DOCUMENTS_ENABLED=true` gates uploaded-file preview/attach. `SCOTTY_ANSJEM_WORK_ENABLED`, `SCOTTY_ANSJEM_COORDINATION_ENABLED` and `SCOTTY_REAL_PROJECT_DRAFTS_ENABLED` remain independently controlled. Do not enable real drafting or sharing just to make a HUD button visible.
3. **Cloudflare:** Worker AI stays OFF by default; verify Workers Free plan, actual Worker source/branch, D1 installation and migration readiness, and owner authentication. Validate exact D1 mission and note readback before considering companion Render HUD PR #54.
4. **Connected apps and remote Dawna:** No cross-account credentials, production deployment, or private files shared by these draft changes. Google OAuth scope status is NOT proof of live Gmail, Calendar or Drive reachability. Remote Dawna integration cannot be labeled connected without separately approved endpoint, authentication, least-privilege scopes and both owners' acknowledgment.
5. **Owner acceptance on iPad:** Speak test requests, confirm after playback ends, cancel/interrupt, review exact project team, confirm document permissions, download released work, inspect stale snapshots and no model fallbacks. Record observed results, source IDs, mission IDs, and redacted HTTP statuses without credentials.

## Safe rollback

Before merging, snapshot branches and produce a checked rollback plan. If Worker memory or voice misbehaves, set staging Worker `AI_ENABLED=false` and disable the Render independent-memory/AI proxy flags. Do not delete existing D1 or PostgreSQL notes as a rollback mechanism. Restore original app branch only after owner review and post-restore verification. No paid resources required to develop these changes.

**Important:** This is an implementation and acceptance record, not evidence of a completed production launch. CI must pass on each latest commit, and the production backup/live device/database stages remain separate.
