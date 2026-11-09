# SCOTTY Master Checklist — Evidence-Based Progress Board

**Updated:** November 9, 2026 (Pacific)  
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
| B — Individual Intelligence | 3 | Verified specialist knowledge | PR #79, 185 role packs, 25 department guides, 790 internal sections, **555 source dockets**, 185 offline retrieval checks and 555 fictional citation tests; **25 chiefs + 69 specialists** have a first assistant-inspected public-source candidate; 91 specialists still lack one, and 461 of 555 source requirements lack an inspected public candidate; all 555 review/owner approval decisions remain pending | **NOT COMPLETE:** independent real-world source verification, owner-approved libraries, actual indexed retrieval, source-backed citations/freshness, per-project privacy and live QA |
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

## Phase 3 first eight specialist public-source inspections — November 8, 2026

- **Eight Health & Human Support specialists:** Each of BONES agents 01–08 now has a distinct assistant-inspected primary-publisher reference and a short role-specific paraphrase and limitation (CDC, Cochrane, AHRQ, FDA, NIMH, federal dietary guidelines, ADA.gov).
- **33 of 555 source dockets now have public-page candidates**, comprising 25 chiefs and eight specialists. This is *inspection coverage*, not factual certification or ownership/rights approval.
- **152 specialist roles** still lack their own inspected public candidate. **522 source requirements** (50 chief K2/K3 + 472 specialist needs) still lack one; all 555 formal evidence decisions remain pending independent reviewer/owner acceptance.
- **No health record access, diagnosis, treatment or medicine instructions**; the checked pages support only public informational methods.
- **CI:** Exact canonical IDs, K1 docket links, fixed official host/path, metadata date checks, forged permission denials and SHA-locked read-only exports. Phase 3 remains an unmerged draft with no agent activation.

## Phase 3 BONES and DATA specialist expansion — November 8, 2026

- **11 additional specialists researched:** the remaining BONES Emergency Planning agent and all **10** DATA Research & Intelligence specialists have a distinct public reference suited to their K1 specialty. Sources include CDC, Cornell University Library, FactCheck.org, Cochrane, NLM PubMed, National Archives, Crossref, NIST and USGS.
- **19/160 specialists** and **25/25 chiefs** now have *one assistant-inspected public page candidate*; this covers **44 of 555** specific source dockets. **141 specialists** still have zero inspected public sources.
- **511 uninspected evidence dockets** remain (50 chief second/third requirements plus 461 specialist requirements). **All 555 dockets still await independent review, claim/date/license checks and exact owner approval**; no live citation authority is granted.
- New negative tests verify frozen IDs, correct chief, specialty, requirement, official HTTPS URL and denial of forged owner or citation permissions.
- No model evaluations, production records, database migrations or operational Stage B approvals occurred.

## Phase 3 ten-specialist expansion across departments — November 8, 2026

- **Ten new specialist public-source candidates** across astronomy, fact-checking, business planning, curriculum, accessibility, history, statistics, workflow automation, visual design and project planning. Their IDs are frozen `agent-expansion-001` through `agent-expansion-010`.
- **Coverage now:** 25 chiefs + 29 specialists = 54 first-source candidates linked to exact open dockets; **131 specialists** still lack an inspected candidate.
- **Uninspected needs:** 501 of 555 source dockets (50 chief K2/K3 and 451 specialist requirements) still have no manually inspected public source. All **555** still need independent claim/context/rights evaluation and authenticated owner sign-off.
- **CI:** strict canonical agent/specialty/chief matching, official URL path, no fake approval claims and zero-network SHA-locked review export. This is a documentation/research milestone, **not** verified operational expertise or real agent retrieval.
- **Safety unchanged:** no live agents, external apps, production records, budget changes, merges or deployments.


## Phase 3 second expansion specialist batch — November 8, 2026

- **Ten additional role-specific public-source candidates** were recorded for frozen expansion specialist IDs `agent-expansion-011` through `agent-expansion-020`: biology, frontend engineering, home organization, geography, software testing, service design, tutoring, supportive communication, cultural research and data cleaning.
- **Coverage:** 25 chiefs + 39 specialists now each have at least one assistant-inspected public reference candidate. **121 specialists** remain without an initial candidate.
- **Evidence dockets:** **64/555** contain an assistant-inspected source candidate; **491/555** do not (50 uninspected second/third chief requirements and 441 specialist requirements). **All 555** still require independent source/rights review and authenticated owner decisions.
- **CI:** Frozen agent IDs, exact source URLs, review dates, contradictory field rejection and false approval/permission denials tested. No real model/provider calls or production data.
- **Current gate:** B3 is under development, not certified. Stage A0 safeguards, B1 real agent QA, B2 authorized memory and B3 owner-accepted evidence remain outstanding.

## Phase 3 expansion specialist batch 021–030 and unified coverage — November 8, 2026

- **10 additional public-source candidates** now cover frozen specialist IDs `agent-expansion-021` through `agent-expansion-030` (reliability, photography, dependencies, botany, backend engineering, travel logistics, expedition planning, evidence review, customer research and learning assessment).
- **Eight-batch reconciliation:** source-specific validation plus a consolidated duplicate check now accounts for exactly **74 public-source candidates** attached to **25 chiefs and 49 specialists**. This is 74 of the 555 open requirements, not independent approval.
- **121 specialists** remain without even one assistant-inspected public-source candidate; **481 individual evidence needs** still lack inspected sources (50 chief second/third needs and 431 specialist needs).
- **Independent verification and actual owner acceptance:** 0 of 555 completed; source licenses/currentness/claim precision still need independent inspection, as do real model-backed retrieval tests and authenticated knowledge access.
- **CI:** rejects fake owner approvals, duplicate or foreign source IDs, private/credential-bearing source URL substitutions, incorrect specialty/chief or dated-source claims. Both earlier seven-batch and new eight-batch reconciliations are tested.
- **No production execution:** 0 activated agents; no private data exports, new infrastructure spend, production deploy or merge.

## Phase 3 fourth ten specialist sources — November 9, 2026

- **10 additional public-page candidates** inspected for expansion specialists 031–040, with each official reference mapped to its own canonical agent K1 docket.
- **Nine-manifest reconciliation:** 25 chiefs plus 59 specialists = **84/185 agents** with first-source candidates. **101 specialists** still lack their first inspected source, and **471/555 source dockets** still lack a public reference candidate.
- **All 555 dockets still require independent factual, rights, provenance, freshness and owner approval**. No real model-source retrieval checks or live agent access permitted.
- **Safety:** forged owner/source approval remains rejected; duplicate-agent/source reuse and mismatched roles fail closed. Exact frozen roster remains unchanged.
- **CI:** <https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42641353478> passed combined offline regression at executable head.


## Current Phase 3 snapshot — November 9, 2026 (fifth specialist batch)

- **10 new sources** inspected and documented for expansion specialists 041–044 and GEORDI specialists 01–06; each has its own K1 evidence docket. Reference routes, publisher URL, author paraphrase, source version caveats and approval flags are saved in a separate dated manifest.
- **94/185 unique canonical IDs** have a first public-page source review candidate: **25/25 chiefs** and **69/160 specialists**. **91 specialists** still need their first source.
- **94/555 requirements** have one inspected reference, **461/555** have none. **All 555 independent evidentiary and owner acceptance decisions are still pending.**
- **Reusable offline review schema built:** a code-locked source route registry, exact frozen role mapping, dated metadata, repeat/replay detection and explicit denial of independently verified claims or self-granted agent citation authority. Previously recorded seven-/eight-/nine-manifest reports remain testable; new ten-manifest reconciliation passes.
- **Still no operational certification:** no live knowledge source ingestion, owner-approved library, real agent-model QA, authenticated runtime knowledge grants, autonomous activation, production access, deployment or new infrastructure spending.

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
- B3 ten-manifest, 94-candidate reconciliation and generic source validator: https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42642666999

**Acceptance count:** None of A0 or Phases 1–8 has a verified final exit sign-off. This board measures implementation evidence, not project percentage or production readiness.
