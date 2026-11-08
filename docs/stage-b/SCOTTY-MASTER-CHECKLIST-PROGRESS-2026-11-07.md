# SCOTTY Master Checklist — Evidence-Based Progress Board

**Updated:** November 8, 2026 (Pacific)  
**Workbook:** SCOTTY Agent Master Build Checklist, November 7 edition  
**Important:** Development artifacts and passed *synthetic* CI tests do NOT satisfy operational pass/fail gates.

## Where we are

**Current primary build:** Stage B, Phase 1 — Individual agent brains (implementation and review instruments, pending actual model tests and owner approvals).  
**Parallel development:** Stage B, Phase 2 now has disposable synthetic PostgreSQL persistence and a two-database restore test (draft PR #78). Stage B, Phase 3 has 185 role and 25 department knowledge review candidates with offline limited search (draft PR #79). **Neither phase is operationally certified.**  
**Operational release gate:** Stage A, Phase 0 remains blocked pending actual isolation, per-executor runtime authorization, cross-service emergency stop, authorized encrypted recovery and final owner sign-off.

| Stage | Phase | Workbook workstream | Evidence available | Exit gate |
|---|---|---|---|---|
| A — Inventory & Protect | A0 | Identity, policies, apps, costs, recovery | PR #76, 185 IDs and names owner-approved and version-locked; simulated owner-grant/backup CI; provider inventory | **BLOCKED:** real staging/production separation, live executor permissions, actual stop-all and real recovery |
| B — Individual Intelligence | 1 | 185 individual personalities and brains | PR #77, 25 chief and 160 specialist concept drafts, 185 review worksheets, 555 planned tests, revisions and source dossiers | **BLOCKED:** 185 owner-reviewed versions and 555 independent real-model test outputs |
| B — Individual Intelligence | 2 | Individual/shared memory | PR #78, 185 scope blueprints, offline lab and **disposable PostgreSQL persistence tests**, including database-committed fictional records, SQL-scoped retrieval, sharing/revocation, correction, deletion, TTL and independent synthetic database restore | **NOT COMPLETE:** no durable memory, real auth, restart/search/delete/promotion/restore verification |
| B — Individual Intelligence | 3 | Verified specialist knowledge | PR #79, 185 role packs, 25 department guides, 790 internal sections, **555 source dockets**, 185 offline retrieval checks and 555 fictional citation tests; **25 public official-page candidates inspected for all 25 chiefs**; 160 specialist-specific research briefs covering 480 source requirements prepared, with 0 independently approved knowledge claims | **NOT COMPLETE:** independent real-world source verification, owner-approved libraries, actual indexed retrieval, source-backed citations/freshness, per-project privacy and live QA |
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

## Phase 3 internal catalog milestone — November 8, 2026

- **Source-attributed draft assets:** 185 per-agent methodology packs and 25 chief/department review guides (790 internal sections); references point to authored Git method files, not independently verified subject-matter research.
- **Offline query tested:** strict actor-role/department draft lookup, no cross-department catalog output, no private or project-file retrieval and no actual external knowledge source fetching.
- **Source correctness remains unproven:** candidate reading lists cannot be used as factual citations, none of the 185 packs has a verified claim library, and published/source freshness checks are not complete. No agent has passed model-backed knowledge retrieval QA.
- **Status:** Phase 3 architecture and review-content drafting have started, not Phase 3 certification. Earlier phases remain gate-blocked.


## Phase 3 source-quality and retrieval QA milestone — November 8, 2026

- **Added:** 555 source evidence-review dockets, explicitly pending independent checks for authoritative publication, claim support, source date, licensing/rights and owner approval. All dockets are still `PENDING_SOURCE_EVIDENCE`.
- **Added:** 185 role/department-limited offline retrieval smoke cases with zero external citations and no real model calls or session authentication.
- **Added:** 555 fictional quote/hash integrity tests, with deliberate refusals for altered or invented citations. These do **not** verify real-world truth, actual source identity or a professional citation.
- **Added:** date-based source-metadata recency triage with **proposed** domain-specific review intervals; no real URL contents fetched, no accepted knowledge claims.
- **Test evidence:** Phase 3 expanded code/negative tests passed <https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42507621889>.
- **Unchanged:** 0 owner-approved verified knowledge libraries, 0 actual source content checks, 0 real-model evaluations, 0 activated agents; Stage A Phase 0 and Stage B Phases 1–3 still lack operational certification.


## Phase 3 public source inspection pilot — November 8, 2026

- Five public pages from **MedlinePlus, W3C, NIST, GitHub Docs and PostgreSQL Docs** were opened and summarized with section pointers and observed versions/dates.
- The records map to exactly five existing frozen chief identities and five of the **555 still-open source review dockets**. The five are a **subset**, not an addition to the 555 pending requirements.
- Added fail-closed checks for required identity, source URL, role and requirement; false approval/citation/independent-review claims remain denied.
- **Manual assistant source inspection: 5 pages. Independently reviewed and owner-approved sources: 0. Actual professional citations licensed/approved for agent use: 0.** No content was imported to live knowledge.
- The work remains an offline development pilot, not Phase 3 final certification, and does not remove A0, B1 or B2 dependencies.


## Phase 3 ten-chief official reference expansion — November 8, 2026

- **Five additional public primary-publisher pages inspected** for DATA (NLM PubMed user guide), JANEWAY (NASA exoplanet transits), SEVEN (NIST measurement uncertainty), QUARK (SBA business planning) and ZORA (U.S. Copyright Office); earlier BONES/TROI/WORF/GEORDI/TORRES references preserved.
- **10 distinct chief IDs and 10 of 555 review requirements** are now associated with an assistant-inspected source candidate, rather than independently verified knowledge. All **555** docket decisions remain pending.
- **Coverage planner added:** 15 chiefs and 160 specialists still lack an assistant-inspected official-page candidate. A further 545 independent review dockets have no such inspected candidate. No real source is approved for agent citations.
- **CI:** strict official URL, exact identity/requirement, fake approval and forged data scope tests plus a zero-network public-review export and remaining-coverage report.
- **No change to release status:** 0 owner-approved knowledge libraries, 0 independent claim verifications, 0 live model knowledge trials, 0 agent activations. A0 and B1–B3 operational gates remain open.


## Phase 3 all chiefs and specialist-research backlog — November 8, 2026

- **25/25 chiefs:** One official public page was inspected for each frozen chief identity, with source section, original paraphrase, intended role use and limits. Three review-only manifests preserve the five + five + fifteen batches.
- **0 chiefs certified:** No independent human validation of claim support, rights, current version or owner acceptance; no live citations granted.
- **160/160 specialists:** An individual public-source research brief is ready for each frozen specialist identity, with three specialty-specific evidence tasks per agent (**480** total). These are research tasks, not inspected sources.
- **530 remaining uninspected source needs:** 480 specialist requests plus 50 outstanding second/third chief dockets. All **555** docket reviews remain pending independent approval.
- **Tests:** source/identity/URL validation, rejection of fake approvals, coverage reconciliation and 160 specialist-review plans passed in offline CI. There are still **0 real-model retrieval evaluations** and **0 active agents**.
- **Phase 3 gate:** still blocked; requires externally verified source libraries, real authenticated private/project separation, citation reliability, source freshness, owner acceptance and Phase A0/B1/B2 dependencies.

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
- B3: https://github.com/LyzabetCampbella2/scotty-core/pull/79
- B2 disposable SQL and independent synthetic restore tests: https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42497823547
- B3 all 25 chief candidates and 160 specialist backlog QA: https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42524351016

**Acceptance count:** None of A0 or Phases 1–8 has a verified final exit sign-off. This board measures implementation evidence, not project percentage or production readiness.
