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
| Canonical agent identity | Activepieces public draft registry snapshot, pending owner freeze | **Owner approval required** |
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
| Freeze exact 185 canonical IDs / 25 chiefs / 160 specialists | Snapshot & structural CI tests | **Blocked — owner freeze signature** |
| Creative-media six roles separated | Separate from candidate 185 | Design documented, owner choice pending |
| Legacy aliases, duplicates, conflicts | No duplicate IDs/names; flagged mismatches | **Blocked — alias decisions** |
| Source-of-truth system mapping | GitHub/AP/Railway/Vercel inventory | **Blocked — environment separation & Render** |
| Ask owner before every new mission | Written policy and staged records | **Blocked — enforce at real executors** |
| Exact task/revision/account/channel grant, expiry & revocation | Pure gate + staged SQL ledger | **Blocked — authenticated runtime and integration** |
| Task/daily budgets, retries, stop-all | Test-only defaults, $0 new spend | **Blocked — owner approval and global kill-switch drill** |
| Data classes, consent, licensing, deletion | Policy draft | **Blocked — owner policy sign-off and practical tests** |
| Encrypted backup of actual source/schema/memory and restore | Separate backup kit; synthetic CI restore only | **Blocked — real independent encrypted restore proof** |
| Dev/staging/prod database, secrets separation | Shared Railway Postgres service/volume observed | **Not passed** |
| Durable evidence logs and human escalation | Staging ledger and incident runbook draft | **Blocked — live evidence and incident simulation** |
| Owner signs identity, privilege, backup, budget | No owner signature stored | **Not passed** |

## Zero-cost safety decision pending owner signature

Until final owner approval, no new paid model/provider usage, billable resources, production migrations, file moves, sends, social posts, production deploys, or unreviewed shared memory are authorized through Stage A0. **$0 newly-authorized spending** is a protective default, not the owner's permanent budget.

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
