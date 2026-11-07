# SCOTTY Stage A / Phase 0 — Exit Gate Review

**Evidence date:** 2026-11-07  
**Status: ENGINEERING REVIEW PACKAGE PREPARED — OPERATIONAL EXIT GATE BLOCKED**  
**PR:** https://github.com/LyzabetCampbella2/scotty-core/pull/76 (draft)  
**Source:** SCOTTY Agent Master Build Checklist, Stage A / Phase 0, page 4.  
No checkbox below implies owner sign-off unless explicitly recorded in an owner-approved register.

## Verified read-only baseline

- Activepieces: 185 distinct candidate agent IDs, 25 chiefs, 160 specialists, 25 departments, zero orphaned chief references. SCOTTY is separately scoped as overseer. Six creative-media profiles remain outside the 185.
- Activepieces: 24 flows, zero enabled, zero published; zero app OAuth connections.
- GitHub: immutable-ID **candidate** JSON snapshot in `docs/a0/roster-candidate-2026-11-07.json`. It explicitly says OWNER_REVIEW_REQUIRED and CANDIDATE_NOT_FROZEN.
- GitHub: scope evaluator, owner-only/staging-only HTTP adapter, isolated PostgreSQL grant/claim/audit module, manual staging DDL, no automatic arming and no direct external execution from this module.
- GitHub CI: pure evaluation and mocked HTTP tests. Ephemeral synthetic PostgreSQL transaction and restore jobs are included in the safety workflow; check the **current PR head run conclusion** and retain links before marking specific test evidence complete.

## System authority & data sources

| Record | Proposed source | Status |
|---|---|---|
| Canonical agent identity | Owner-approved Git version `docs/a0/roster-frozen-2026-11-07.json` anchored to the compared Activepieces draft | **IDs and names approved/versioned; live registry not changed** |
| Owner identity/privileges | Separate authenticated server-side owner sessions, durable grants | **Not fully integrated** |
| Live task/missions | SCOTTY verified project/assignment records, not synthetic Activepieces demos | **Not established** |
| Private memory | Restricted, signed, provenance-bearing memory store only | **Not certified** |
| Public knowledge | Review-approved, source-tagged role libraries | **Not certified** |
| Actual files/media | Original authorized provider, permission by exact ID | **Not connected** |
| Approval evidence/audit | Append-only authoritative ledger enforced at runtime | **Staging prototype only** |
| Cost accounting | Owner-approved task and daily limit, transactional usage reservations | **$0 default, not signed** |

## Critical environment separation finding

Read-only Railway inventory reports that **both** `SCOTTY / production` and `SCOTTY / Eyes on test` reference the same `Postgres` service ID `7a1de266-14d2-40ee-ad4b-9dcf65f1fcaa` and the same `postgres-volume` ID `9b9e4e05-ecd4-4538-9347-927d509aa7a3`. This is **not** proof of isolated testing databases. The separate `SCOTTY Reliability Staging` project lists a staging environment but no services. **Do not run destructive test migrations or restores against either shared Railway database reference.**

The SCOTTY production Railway project also has a pending staged patch affecting a service; no staged change was accepted or deployed. Its presence should be reviewed before future deployment.

The Vercel `scotty-cloud-hud` project was found, but the precise active protection and deployed backends still need end-to-end authentication verification. Render workspace/service/database selection still needs owner validation. Other accessible Neon/Supabase projects are not presumed to be SCOTTY sources.

## Acceptance matrix

| Phase 0 requirement | Verified evidence | Gate |
|---|---|---|
| Freeze exact 185 canonical IDs / 25 chiefs / 160 specialists | Explicit owner approval; versioned frozen Git snapshot and hash lock | **Git freeze approved; formal authenticated attestation and live adoption still pending** |
| Creative-media six roles separated | Separate from candidate 185 | Design documented, owner choice pending |
| Legacy aliases, duplicates, conflicts | No duplicate IDs; owner chose to retain all current names and review proposed aliases later | **Current names approved; future alias changes require new approval** |
| Source-of-truth system mapping | GitHub/AP/Railway/Vercel plus owner-approved Render metadata inspection | **Blocked — environment separation and live systems-of-record mapping** |
| Ask owner before every new mission | Written policy and staged records | **Blocked — enforce at real executors** |
| Exact task/revision/account/channel grant, expiry & revocation | Pure gate + staged SQL ledger | **Blocked — authenticated runtime and integration** |
| Task/daily budgets, retries, stop-all | Test-only defaults, $0 new spend | **Blocked — owner approval and global kill-switch drill** |
| Data classes, consent, licensing, deletion | Policy draft | **Blocked — owner policy sign-off and practical tests** |
| Encrypted backup of actual source/schema/memory and restore | Separate backup kit; synthetic CI restore only | **Blocked — real independent encrypted restore proof** |
| Dev/staging/prod database, secrets separation | Shared Railway Postgres service/volume observed | **Not passed** |
| Durable evidence logs and human escalation | Staging ledger and incident runbook draft | **Blocked — live evidence and incident simulation** |
| Owner signs identity, privilege, backup, budget | No owner signature stored | **Not passed** |

## Zero-cost safety decision pending owner signature

Until final owner approval, no new paid model/provider usage, billable resources, production migrations, file moves, sends, social posts, production deploys, or unreviewed shared memory are authorized through Stage A0. **$0 new infrastructure spending** is now expressly the owner's decision. New paid-provider costs remain at a protective $0 default pending per-task/day approval and enforcement.

## Owner sign-off fields (leave blank until explicit recorded approval)

- Canonical snapshot blob SHA / commit SHA: _____________________
- Owner-approved aliases or keep-current decision: _____________________
- Authoritative SCOTTY data sources + exact staging resources: _____________________
- Permission levels and data policy approved: _____________________
- Maximum dollars per task, per day, and model credit ceilings: _____________________
- Recovery artifact reference, key custody verification and isolated restore evidence: _____________________
- Stop-all drill and environment isolation evidence: _____________________
- Owner reviewer identity, decision, date, and immutable evidence link: _____________________

**Verdict: NOT EXIT-CERTIFIED.** Code and documentation review can continue, but Stage B must not interpret Phase 0 as passed until every critical item has evidence and explicit owner approval.

## Final engineering hardening and external acceptance status (2026-11-07)

- Grant minting is now **closed by default**: the owner HTTP endpoint rejects a client-supplied `ownerApproved:true` value unless a separately installed server-side verifier proves the exact approval evidence and scope. The current SCOTTY server does not install that verifier.
- A dedicated staging DB URL must not share the production `DATABASE_URL` hostname; this guard is tested but does not itself prove physical resource isolation. The Railway production/test volume overlap remains unresolved.
- GitHub CI includes a disposable PostgreSQL transaction/concurrency test and a synthetic `age` encrypted backup, decryption, archive integrity comparison, and isolated restore. Verify the latest successful workflow result before signing this evidence.
- The machine-readable gate is `docs/a0/certification-evidence.json`. Run `node scripts/a0-exit-status.mjs` for a read-only list of outstanding items. This gate intentionally remains BLOCKED until externally verified proof and owner review have been recorded; editing the file alone is not a real security attestation.
- No actual production migration, service isolation, real encrypted recovery, cross-platform stop-all operation, privilege escalation, new app OAuth, external write, or paid resource provisioning occurred in this phase.

**Engineering package status:** prepared for owner and infrastructure review. **Operational certification:** blocked until all specified tests and sign-offs are real and evidenced.

## Provider egress and owner decisions (latest continuation)

- **New finding:** the modular `POST /api/eyes/analyze` endpoint formerly sent submitted images to `analyzeFrame`, which could use a local model or fall back to a configured OpenAI cloud model **without** the A0 owner grant being enforced. This could expose private camera images and incur provider costs.
- **New branch-only mitigation:** `POST /api/eyes/analyze` now immediately returns HTTP 503 without processing the image or invoking a provider, and its status now reports `visionExecutionAuthorized=false`. An isolated Bun test is included in the Stage A0 CI workflow.
- This **does not** automatically secure legacy Railway/Render code or any other deployed provider endpoint. Actual running code and network egress must be audited separately, and an authenticated, cost-scoped vision approval must be implemented before re-enabling the feature.
- The exact remaining owner decisions are prepared in `docs/a0/OWNER-DECISIONS.md`: staging spending/quote authorization, roster freeze/aliases, Render workspace selection, separate real backup authorization and owner-control limits.
- **Do not mark Phase 0 complete** because the new test passes: environment isolation, live executor enforcement, actual global stop-all, independent real encrypted restore and owner signatures are still missing.

## Scoped owner decisions incorporated (2026-11-07)

1. **Render:** user approved **My Workspace read-only**. Inspection of service/deploy/Postgres *metadata only* completed; no private data, logs, secrets or backup contents were read. SCOTTY services report live Render deploys on `cloud-independent-voice` at `b200c4b315ca26f063deee8dca10eeab5cf39c00`, not PR #76. Render `scotty-memory` PostgreSQL is on a free plan but **suspended**. Backup cron has a live deployment but no independently verified real backup/restore. See `docs/stage-a0-environment-inventory.md`.
2. **Roster:** owner explicitly approved exactly 185 permanent IDs and their current display names, while deferring any alias/rename changes. Same-day Activepieces reconciliation found zero field discrepancies. Git frozen snapshot: `docs/a0/roster-frozen-2026-11-07.json`, blob `476f396a709de64e75169ed0ff504526cc0233ef`. Lock file and CI test enforce version stability; the approval was explicit in conversation but is *not* a cryptographically authenticated owner signature. No source/production Activepieces records changed.
3. **Costs:** user selected **$0 new infrastructure spending**. No new persistent service, database or storage was provisioned; separate paid-model task/day ceilings were not selected. Default deny of new provider charges remains.
4. **Production records:** user explicitly requires a separate approval before accessing or exporting production data. No SQL, data export, real encrypted restore, production file access or secret inspection was performed.

**Remaining technical blockers are unchanged:** authenticated owner signatures/approval evidence and real executor enforcement; an actually isolated staging environment; cross-service stop-all drill; actual owner-authorized encrypted production restore; full signed privileges, budget and data policy; and operational acceptance. Phase 0 is **NOT CERTIFIED**, despite having a version-locked roster.
