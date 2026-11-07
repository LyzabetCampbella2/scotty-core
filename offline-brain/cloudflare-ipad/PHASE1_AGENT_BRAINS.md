# SCOTTY Phase 1 — Individual agent brains

**State:** Development specification and prompt integration implemented; **real model-based behavioral certification not yet complete**.

## Verified changes
- Canonical roster remains **25 chiefs + 160 specialists = 185 agents**, plus SCOTTY as overseer. Stable original IDs and chief reporting relationships are preserved.
- `offline-brain/cloudflare-ipad/individual-agent-brains.mjs` generates one immutable-development-specification view per canonical ID. Each includes a unique identity, job focus, communication style, reasoning instructions, specialized working procedure, boundaries, owner-review policy, completion checks and **suggested but not granted** capabilities.
- Existing role-specific methods in `specialist-playbooks.mjs` and `field-knowledge.mjs` are reused rather than replacing them with an identical generic instruction.
- RIKER focuses on workflows and coordination; GEORDI focuses on reproducible engineering; TROI focuses on accessibility and human-centered support. Other departmental chiefs get bounded departmental leadership specifications.
- `team-runtime.mjs` now loads the corresponding ID-specific Phase 1 prompt for each specialist/chief when a separately approved bounded team call is made. SCOTTY synthesis remains a different overseer role; the existing approval gate remains unchanged.
- Optional new creative department LUMEN/PULSE/FRAME/IRIS is **not silently added** to these canonical 185. It remains a separate four-agent extension (optional total 189).
- No file in this phase grants tools, external account access, memory writes, spending, independent missions or deployment authority.

## Evidence
- GitHub Actions **SCOTTY Activepieces — read-only staging bridge**: **127 Node tests passed, 0 failed**, plus **5 SQLite/Python schema tests passed** on the Phase 1 branch changes.
- Tests assert 185 distinct IDs and full prompts, correct chief-specialist relationships, stable deterministic compiler output, no granted tools, and different work methods for RIKER, GEORDI and TROI.
- The identical synthetic task is routed through all 185 specifications in a **deterministic no-model dry run**. This proves output templates and prompt inputs differ, **not that 185 LLM agents independently generated high-quality answers**.
- The bounded team runner's fake-model integration verifies that the specialist and chief each receive their own brain prompt and that an unapproved run makes **zero** model calls.

## Phase 1 exit criteria — still open
1. **Owner-authored profiles**: reconcile existing RIKER/TROI and any other previously provided questionnaire answers into the canonical ID profile store without overwriting or hallucinating them. Preserve provenance and approval status for each field.
2. **More individual nuance**: review generated personality defaults and specialist role boundaries for all 185, identify duplicate work coverage, customize differences with owner feedback, and make each persona editable/versioned.
3. **Real behavioral evaluation**: after model/budget authorization, run the same fixed scenario plus 2–3 role-specific assignments through each actual agent with consistent model settings. Independently grade domain-specific actions, clarity, factual uncertainty, safety and whether the chief/specialist handoff is appropriate.
4. **Regression**: test wrong-ID prompts, prompt-injection resistance, protected-memory isolation, unauthorized tools, hallucinated completion and handoff traceability. Reject agents that fail and rerun after refinement.
5. **Acceptance**: owner signs off on all 185 scored profiles, and only then mark Phase 1 `CERTIFIED`. Do not conflate source-generated specs with live independent agents.

## Phase 2 dependency
Do not start persistent private memory from these scaffold profiles. The separate memory phase requires server identity, explicit project ACLs, scope-based consent, retention, encryption and audited owner review.

**Release posture:** draft GitHub development branch; no Cloudflare deployment, Activepieces publication, production roster migration, paid model calls, private data access or live automatic tasks.
