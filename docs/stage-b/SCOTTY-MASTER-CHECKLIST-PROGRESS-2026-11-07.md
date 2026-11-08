# SCOTTY Master Checklist — Evidence-Based Progress Board

**Date:** November 7, 2026 (Pacific)  
**Workbook:** SCOTTY Agent Master Build Checklist, November 7 edition  
**Important:** Development artifacts and passed *synthetic* CI tests do NOT satisfy operational pass/fail gates.

## Where we are

**Current primary build:** Stage B, Phase 1 — Individual agent brains (implementation and review instruments, pending actual model tests and owner approvals).  
**Parallel offline design work started:** Stage B, Phase 2 — Individual/shared memory scopes and lifecycle policy (draft PR #78).  
**Operational release gate:** Stage A, Phase 0 remains blocked pending actual isolation, per-executor runtime authorization, cross-service emergency stop, authorized encrypted recovery and final owner sign-off.

| Stage | Phase | Workbook workstream | Evidence available | Exit gate |
|---|---|---|---|---|
| A — Inventory & Protect | A0 | Identity, policies, apps, costs, recovery | PR #76, 185 IDs and names owner-approved and version-locked; simulated owner-grant/backup CI; provider inventory | **BLOCKED:** real staging/production separation, live executor permissions, actual stop-all and real recovery |
| B — Individual Intelligence | 1 | 185 individual personalities and brains | PR #77, 25 chief and 160 specialist concept drafts, 185 review worksheets, 555 planned tests, revisions and source dossiers | **BLOCKED:** 185 owner-reviewed versions and 555 independent real-model test outputs |
| B — Individual Intelligence | 2 | Individual/shared memory | PR #78, 185 scope blueprints, offline lab and **disposable PostgreSQL persistence tests**, including database-committed fictional records, SQL-scoped retrieval, sharing/revocation, correction, deletion, TTL and independent synthetic database restore | **NOT COMPLETE:** no durable memory, real auth, restart/search/delete/promotion/restore verification |
| B — Individual Intelligence | 3 | Verified specialist knowledge | 185 knowledge-gap dossiers, 555 verification requirements and 740 research questions in Phase 1 draft | **NOT COMPLETE:** source libraries, searchable indexes, citations/freshness and retrieval tests |
| C — Controlled Work | 4 | Independent callable engine | Earlier prototypes and default-deny development safety work | **NOT COMPLETE:** all IDs callable with owner-authenticated, budgeted, audited execution |
| C — Controlled Work | 5 | Living jobs, assignments and biographies | Earlier draft relationships and project-workspace prototypes | **NOT COMPLETE:** verified real owner-approved assignments and biography history |
| C — Controlled Work | 6 | Directed chief/specialist/SCOTTY handoffs | Synthetic proposals and draft collaboration formats | **NOT COMPLETE:** actual permissioned messages/handoff receipts and denial tests |
| D — Real Connections | 7 | Apps, OAuth, scopes and tools | Read-only Activepieces inventory; no app OAuth connections at last audit | **NOT COMPLETE:** approved OAuth/least privilege and verified live receipt/revocation |
| E — Supervise & Launch | 8 | HUD, certification and release | Earlier read-only preview and tests | **NOT COMPLETE:** 185 accepted profiles, independent QA, pilot and safe production release |

## Phase 2 laboratory progress — latest continuation

- **Implemented:** an offline in-memory simulation using only `SYNTHETIC:` fictional fixtures; 185 approved test identities, owner-review simulation, individual/department/project/explicit-recipient scopes, deduplication, candidate and accepted statuses, correction histories, lineage tombstones, TTL expiration and fictional restart serialization.
- **Verified by CI:** focused synthetic scope, mutation-denial, deletion, project membership, snapshot tamper and restart simulation tests. These tests do not use or prove actual database persistence or live identity authentication.
- **Still not implemented:** independently isolated real durable storage; trusted session/owner permissions; actual privacy-safe retrieval/search/dedupe; memory owner HUD; consented sharing, retention and deletion against real backup data; real recovery tests.
- **Overall status unchanged:** Stage B Phase 2 is under development; A0 and B1 are still not certified, so Stage C cannot be enabled.

## Phase 2 SQL persistence milestone — November 8, 2026

- **Passed in disposable GitHub Actions PostgreSQL:** actual database insert/commit, SQL-filtered retrieval and source identity validation for fictional records, same-owner/project deduplication, simulated owner acceptance, revocation of synthetic sharing, correction/version history and erasure of all synthetic lineage versions.
- **Passed independent synthetic restore:** CI-only `pg_dump` from database `scotty_b2_ci` into a second temporary `scotty_b2_ci_restored`, comparing record counts/audit and verifying deleted record bodies remain erased.
- **Not a durable production implementation:** the test databases are ephemeral; fake test-owner handles can be minted; no actual OAuth/session verification, row-level security policy for real records, live hosted memory, encrypted production restore or authenticated deletion is in place.
- **Stage and exit gate unchanged:** Stage B Phase 2 is in active test development, not complete. Phases A0 and B1 are still operationally blocked.

## Next safe development order

1. **Continue Phase 1 owner-review preparation**: refine differences among all 185 personalities and reconcile prior chief source conflicts without changing approved canonical IDs.
2. **Keep Phase 2 isolated**: implement synthetic memory schemas, access denial, correction/supersession, consent and retention plans, but never claim durable memory exists until secure storage and real tests are approved.
3. **Prepare Phase 3 source validation**: public metadata review and corpus specifications without accessing protected records.
4. **A0 critical path**: safely identify existing genuinely isolated zero-new-cost infrastructure; complete a separately approved real encrypted backup/restore and cross-service stop drill; install independently authenticated real executor access checks.
5. **Only after prerequisites pass**: real-model tests under separately approved provider cost/data handling, owner review of exact personas, integration with each runtime and then Phase 4+.

## Owner constraints (binding)

- Freeze **185** permanent agent IDs and retain current names. Alias changes require separate review.
- **$0 additional infrastructure spending.** Do not provision persistent hosting/database/storage without new owner authorization.
- **No production data access, export or backup retrieval** without a separate exact-scope approval.
- No merge, deployment, autonomous activation, external app connection, public posting, message sending or spending through these draft branches.
- SCOTTY must ask before **every new task or project**; more sensitive and external actions require independent approval.

## GitHub evidence

- A0: https://github.com/LyzabetCampbella2/scotty-core/pull/76
- B1: https://github.com/LyzabetCampbella2/scotty-core/pull/77
- B2: https://github.com/LyzabetCampbella2/scotty-core/pull/78
- B2 offline scope tests: https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42430047711

**Acceptance count:** None of A0 or Phases 1–8 has a verified final exit sign-off. This board measures implementation evidence, not project percentage or production readiness.
