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

## Phase 1 continued — owner-profile integration and differentiation

- Imported eight existing source-backed, owner-designed chief profiles **RIKER, GEORDI, TROI, SPOCK, WORF, DATA, KIRK and PICARD**, using `owner-chief-design-overlays.mjs`. Each field is traceable to an existing source module and the checked-in questionnaire design record. This is a compiled design, not a fresh owner sign-off.
- **TROI source ID reconciliation:** the historical `chief-troi` development file maps to the canonical `chief-expansion-troi` roster ID. The source round 2 question 1 remains **unanswered (null)**. No extra chief is created and no unselected questionnaire options are inferred.
- RIKER's check-in-before-new-work policy and day-specific morning briefing remain intact. GEORDI's selected Round 1 personality `D F G H`, excluded general autonomous diagnostics and reliability-first review remain intact.
- Owner overlays now influence the actual specialist/chief prompt assembled by `team-runtime.mjs`. Their recorded collaboration recommendations do not grant real communication rights, access or spending authority.
- All compiled agent specs are **deep-frozen** to prevent imported modules from mutating prompts or granted-tool lists. A separate clone is returned for ordinary inspection.
- A same-scenario dry-run now returns a concrete **work contract** with role-specific method, deliverable, acceptance criterion and chief handoff—not merely an answer differing by name. These are still templates; they are **not real independently judged LLM results**.
- `phase1-agent-review.mjs` produces a fail-closed, per-agent nine-part structural review packet: **185 structural profiles**, **8 source-backed chief records**, **17 chiefs with generated defaults**, and **160 generated specialist records pending owner review**. **0 profiles have final owner acceptance or actual model-behavior certification**.

**Verification:** GitHub Actions after this change included **137/137 Node tests and 5/5 in-memory Python/SQLite tests**. The suite checks the historical TROI alias, the unanswered questionnaire item, RIKER/GEORDI's recorded preferences, no granted tools, immutable profile specs, distinct dry-run procedures, and honest certification status.

## Phase 1 continued — differentiated workstreams, versioned review and model-evaluation plan

**Agent workstream contracts.** `agent-role-contracts.mjs` defines role-specific procedures, artifacts, independent acceptance evidence, boundaries and chief handoffs for every canonical agent. Where work overlaps, it distinguishes separate planning/requirements, design alternatives, independent verification and delivery-handoff methods. Actual duplicate *department plus specialty* labels were not present in the current roster; verified overlap is across departments. This is a **division-of-work proposal** for owner review, not proof that differently labeled agents have independent expertise or permission to act.

**Versioned edits without self-authorization.** `agent-brain-revisions.mjs` creates immutable-base, allowlisted change proposals for voice, reasoning, method and review standards. It ties proposed revisions to the canonical agent, base brain version and SHA-256 change digest; it rejects identity changes, role changes, tool grants, privacy shortcuts and stale base versions. Revision packets are **not persisted or applied** by the pure-function module. An authenticated owner review service, durable version ledger and conflict handling are still needed before real edits can be activated.

**Behavioral evaluation preparation.** `phase1-behavior-evaluation.mjs` prepares **555 draft test scenarios (3 per agent)**: one identical synthetic cross-role assignment, one specialized artifact task, and one injected-note/unauthorized-action test. A fixed five-category rubric (role fit, accuracy, deliverable, boundaries, communication; 20 possible per scenario) makes future real-model comparisons possible. Responses provided to the manual-review packet remain **unverified and unscored** until their actual source, fidelity, accuracy, safety and owner approval are independently confirmed. **Zero real-model calls or certifications** were performed by these utilities.

**Audit view.** `phase1-agent-review.mjs` now exposes each agent's proposed workstream and prepared evaluation case count in the owner-review queue, alongside its existing source provenance and approval blockers. The 8 owner-recorded chiefs still need final compiled-profile acceptance; **17 chiefs and 160 specialists** still need owner review of their proposed personalized defaults.

**Safety:** no change to the protected public/private memory boundaries, current agent count, project memberships, tools, paid providers, live Agent HQ, Activepieces enablement or Cloudflare deployment. Canonical roster stays at 185; optional Creative Media extension stays separate.

## Phase 1 continued — persistent reviewed revision history (source-only)

The Phase 1 owner-review backend now has an **optional, unapplied isolated D1 database schema** at `phase1-profile-review-ledger-v1.sql`, plus a fail-closed storage API in `phase1-profile-review-store.mjs`.

- **Persist proposals, not agent permission changes.** Store only public/synthetic, allowlisted personality revisions from `agent-brain-revisions.mjs` after recomputing and comparing their canonical SHA-256 digest, original role and stable agent ID.
- **Per-agent optimistic version locks.** Review heads track monotonically increasing versions. Competing drafts can be submitted, but a stale one cannot be approved after another was approved. Only one approved draft reference is current at a time; revocation clears that reference and increments the head version.
- **Review state machine.** `pending → approved|rejected` and `approved → revoked`; illegal transitions, duplicate approvals, edits to immutable scope/identity fields and deletion/tampering of audit entries are blocked by SQLite triggers and API checks.
- **Protected actor scope.** Standalone write functions require a server-verified owner session and an agent-specific allowlist; a client `ownerApproved` flag is not accepted. This is an *interface contract* pending real authenticated integration, not a deployed authentication feature.
- **Idempotency and audit.** Exact same-key retries read the existing review, even after an approval or revocation, without creating another event; reusing a key for a different request or digest is rejected. All state changes require audit readback.
- **Read-only owner endpoint.** `phase1-profile-review-api.mjs` is routed inside the undeployed isolated SCOTTY Worker. `GET /api/phase1/brain-review-readiness` provides authenticated, secret-free migration readiness even with the read switch off. `GET /api/phase1/brain-review?requestId=...` additionally requires `SCOTTY_PHASE1_REVIEW_READ_ENABLED=true`, a configured server owner ID, the applied isolated schema and the existing owner bearer token. It does **not** return proposed edit content, private memory, or active brain prompts. There is **no HTTP approval/write endpoint**.
- **No automatic runtime activation.** Even a database-approved revision returns `ownerAcceptedEntireBrain=false`, `modelBehaviorCertified=false`, `runtimePromptActivated=false`, `canExecute=false`. All 185 base brain instructions and tool permissions remain as before.

The new schema **has not been applied to any live database**. No external resource, social account, private memory, real model provider, production deployment or agent was activated.

**Next gates:** authenticate a dedicated owner write workflow on an explicitly approved isolated staging Worker; review/backup and apply the optional D1 schema; implement versioned owner-accepted profile promotion only after independent model evaluation and owner sign-off; connect owner HUD read status after verified staging testing. The optional Creative Media team remains separate.

## Evidence
- GitHub Actions **SCOTTY Activepieces — read-only staging bridge**: **137 Node tests passed, 0 failed**, plus **5 SQLite/Python schema tests passed** on the Phase 1 branch changes.
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
