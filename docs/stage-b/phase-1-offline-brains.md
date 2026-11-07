# SCOTTY Stage B / Phase 1 — Offline Individual Brain Drafts

**Status:** DEVELOPMENT STARTED · DRAFT · NO AGENTS ACTIVATED  
**Dependency:** Stage A / Phase 0 draft PR #76, including the owner-approved 185-ID roster version. **Operational A0 gate is still BLOCKED.**  
**Basis:** SCOTTY Agent Master Build Checklist (November 7, 2026), page 5.

## Phase 1 workbook goal

Every agent should eventually have unique personality, reasoning approach, job boundaries, identity, source evidence, owner check-ins, handoffs, and independently evaluated behavior. The pass gate requires each agent to produce distinctive work on a shared task and a specialty task, resist adversarial permission instructions, and have an individually owner-approved profile version.

## What this draft implements

- `src/agents/phase1/draft-builder.mjs` is a **pure offline function** that transforms the approved roster into 185 **review-required identity/brain scaffolds**. It does not create actual agents or memory.
- `scripts/phase1-export-drafts.mjs` independently verifies the frozen Git blob hash before exporting JSON to standard output; no provider/network/database calls.
- `src/agents/phase1/draft-builder.test.mjs` verifies the exact 185 IDs/names, 25 chiefs, 160 specialists, department links and zero live permissions.
- `.github/workflows/stage-b1-offline.yml` runs those tests on disposable CI without credentials.
- 555 *planned* behavior cases are defined (shared, specialty-specific, adversarial) and explicitly marked `NOT_RUN`. There are **zero certified real-model evaluations**.
- Individual specialties and chief associations are copied from the frozen roster, not made up; character traits/voice/avatar, evidence-backed sources, domain-specific methods and personality preferences remain **unset**, not invented.

## Draft profile data model

Each profile records frozen identity, role/title, specialty and chief, draft persona version, placeholder trait and communication controls, initial scoped-work steps, uncertainty boundaries, safe escalation and handoff format, **all tools disabled**, private memory write disabled, public external app connection disabled, three planned behavior tests, and owner review status.

The shared test prompt is deliberately identical for all 185 agents so reviewers can later test whether behavior is genuinely different. The specialty test prompt references the exact assigned domain. The adversarial case tests resistance to untrusted-document attempts to read private files, bypass approval and publish.

## Commands

```bash
node --test src/agents/phase1/draft-builder.test.mjs
node scripts/phase1-export-drafts.mjs > /tmp/scotty-phase1-brain-drafts.json
```

The exporter only writes to standard output. Redirected files are local reviewer artifacts; do **not** upload them to public sites, load them into a running agent service, or treat them as production profiles before owner approvals.

## Stage B / Phase 1 acceptance gate (not yet passed)

- [x] Use approved, immutable 185-agent identity version in a separate draft development branch
- [x] Create reviewable profile field schema and role-specific *starter* prompts without guessing owner preferences
- [x] Define 555 **planned** tests — not executed real-model evidence
- [ ] Individually author and review 3–5 genuinely distinctive traits per agent
- [ ] Write role-specific domain reasoning, quality standards, failure modes and sourced knowledge per agent
- [ ] Author explicit knowledge gaps and chief-specific escalation/handoff behavior with owner preferences
- [ ] Run 185 identical shared prompts against individually scoped real-model agent configurations and compare outputs
- [ ] Run each agent's specialty test and adversarial permission test; record evidence
- [ ] Achieve 185 independently reviewed and owner-approved persona versions
- [ ] Pass proper owner-scoped memory/permissions QA before any live deployment or agent call

**No Stage B activation:** Stage A Phase 0 still requires independent zero-new-cost staging evidence or a revised owner resource decision, authenticated live owner grants at every actual executor, real-system stop-all and restore rehearsals, and separate owner authorization for accessing production data. Draft Stage B code is a safe parallel engineering task, not a substitute for A0's certification requirements.

## Reconciled methodology and legacy chief sources (2026-11-07)

The existing development history contains methodology authored in an earlier SCOTTY branch, not yet merged or owner-certified as agent skill. To prevent contradictory duplicate designs, the Phase B1 branch reuses and attributes those sources directly:

| Review artifact | Earlier source | Coverage | Validation boundary |
|---|---|---|---|
| `src/agents/phase1/department-methods.mjs` | `feat/personalized-agent-workspaces-20261106`, Git blob `1df7063babd4db8a4e07af1d5259185299979f5f` | 25 different department planning methods | Fictional examples; no real-world facts or owner acceptance asserted |
| `src/agents/phase1/specialist-playbooks.mjs` | Same earlier branch, blob `9d26a5f4d086ee3103d9ee29b98eb2d35f265f4c` | 160 drafted specialty guides with department fallback | Candidate reference URLs are **unverified**, with `checkedAt=null` |
| `src/agents/phase1/department-acceptance-cases.mjs` | Same earlier branch, blob `96e3db6072f36bc3c74dbc627dd218ffc498f885` | 25 synthetic chief evaluation tasks | Tests are planned only; passing a parser test is not a real-model evaluation |
| `src/agents/phase1/chief-source-candidates.mjs` | `feat/remaining-17-chiefs-scaffold-20261106`, individual source file hashes embedded | Eight previously authored chief references | Source preferences are **not automatically adopted** or owner-certified |

The source references cover RIKER, SPOCK, WORF, DATA, GEORDI, KIRK, PICARD and TROI. Only an exact identity check is allowed. Existing canonical **TROI is `chief-expansion-troi`**, but the earlier profile was authored under **`chief-troi`**. The profile is therefore flagged `LEGACY_ID_MISMATCH_REQUIRES_OWNER_REVIEW`, not assigned to the canonical ID. Some matched chiefs also have changed department labels; those cases are labelled `MATCHED_ID_NAME_DEPARTMENT_DRIFT_REVIEW`. Source personality traits remain `priorChiefReview.sourceTraits` candidates, not adopted `traits`.

The builder now includes authored department methods, per-specialist procedural criteria and worked synthetic examples, while leaving all external references and role-specific claims unverified. It preserves 185 frozen IDs, zero runtime access, zero approved brain versions, and 555 unrun evaluation cases.

### Distinct from final certification

- Authored method coverage does **not** mean 160 specialists have independently demonstrated skill.
- A source-backed historic chief design does **not** mean the owner approved its current version or that a chief may act.
- A synthetic scenario is **not** evidence of a real-world result, permit, quality test, public source check, or clinical/legal judgment.
- Stage B1 needs source-backed knowledge verification, personality reviews, independent real-model results, privacy/role tests and the owner's individual approvals before release.

## Individual owner-review packet export

Added `src/agents/phase1/review-packets.mjs` and `scripts/phase1-export-review-packets.mjs`. They create 185 read-only individual review packets grouped by the approved 25 departments. Each packet retains stable identity, current department and chief, sourced methodology, quality criteria, candidate references (clearly unverified), legacy chief source suggestions, and identity/department conflicts.

There are **eight distinct evidence gates per agent (1,480 checklist items total)**: owner-selected temperament, chosen tone and check-in rules, method/failure-mode review, source review, three independent model evaluations (shared, specialty, adversarial) and authenticated individual owner approval. **All 1,480 gates are unchecked.** The 555 planned behavior tests remain `NOT_RUN`, owner-approved brain versions stay at 0 and no live execution is enabled.

Use the read-only command:

```bash
node scripts/phase1-export-review-packets.mjs > /tmp/scotty-phase1-review-packets.json
```

This generates local JSON for owner review. It does not update Activepieces, Railway, Render, agent runtime, source registry, any persistent database or your private memory. Any later approval must be authenticated, matched to exact agent ID and version, evidence-backed and recorded independently. Editing the packet JSON is not approval or certification.

## Individual chief character direction — 17 additional concept drafts

Added \`src/agents/phase1/new-chief-concepts.mjs\` with 17 **original, assistant-authored and NOT owner-approved** character proposals. They map to the 17 canonical chiefs who lacked prior source-backed standalone personality work. Each has a unique leadership archetype, five temperament suggestions, a role-specific signature question, decision procedure, representative fictional deliverable, quality/failure risk, collaboration/check-in rules and zero tools.

These are ideas derived from the approved **role and department description**, not statements of owner preferences. The concept builder only matches an exact immutable canonical ID, current name and department. No chief's \`traits\`, approved preference, access, memory or version is changed. Proposed traits are visible in the owner-review packet field \`ownerDecisions.proposedPersonalityTraits\`; \`adoptedPersonalityTraits\` stays empty.

The remaining 17 conceptual directions:

| Chief | Canonical specialty department | Proposed archetype |
|---|---|---|
| BONES | Health & Human Support | Careful health-information translator |
| ARCHER 2 | Education & Learning | Learning-path architect |
| CRUSHER | Life Sciences | Biological field-method mentor |
| DAX 2 | History & Culture | Contextual history interpreter |
| HOLOGRAM | Design & Media | Visual composition director |
| JANEWAY | Exploration & Discovery | Evidence-oriented exploration navigator |
| NEELIX 2 | Home & Logistics | Everyday logistics coordinator |
| OBRIEN | Automation & Reliability | Recovery-first workflow engineer |
| PIKE | Projects & Delivery | Milestone and dependency leader |
| SEVEN 2 | Data & Analytics | Measurement and inference reviewer |
| SISKO 2 | Business & Enterprise | Commercial feasibility builder |
| TORRES | Software & Applications | Application integration troubleshooter |
| TUVOK 2 | Quality & Verification | Independent acceptance examiner |
| KEIKO | Science & Environment | Environmental inquiry steward |
| QUARK | Commerce & Finance | Financial scenario challenger |
| UHURA | Communications & Languages | Multilingual message and intent editor |
| ZORA | Creative & Knowledge | Narrative continuity archivist |

The eight existing earlier chief profiles remain as **historic source candidates** without automated adoption. In particular, TROI's legacy ID mismatch is unresolved and intentionally preserved. The new CI suite verifies 17 unique archetypes, questions, and deliverables plus identity immutability, zero runtime permissions and all 1,480 evidence checks remaining unchecked. This prepares a substantive review of differentiated chiefs but does not represent completed agent personality certification.
