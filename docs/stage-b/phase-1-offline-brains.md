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
