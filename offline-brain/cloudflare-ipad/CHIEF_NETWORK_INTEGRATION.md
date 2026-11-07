# SCOTTY chief network integration — isolated prototype

## Implemented
- 25 chief registry (8 existing dev chiefs plus 17 provisional); domain-specific reasoning plan steps, with no model inference or execution.
- 160 uniquely identified specialists in 16 domain groups, ten per group; catalog entries only, not deployed autonomous agents.
- Project-scoped, authenticated-actor **interface contract** for reasoning, routing, chief-to-chief message proposals, delegation proposals and filtered bio/HUD views.
- Individual, department and shared memory scopes via injected async read/write adapter. Owner approval required for writes; explicit consent for sensitive proposals; evidence required.
- Synthetic end-to-end tests for project isolation, routing, proposals, memory review and HUD snapshots.

## Important limitations
The supplied actor is a **test fixture**, not cryptographically verified. Do not pass user-supplied actor claims into these helpers in production. An authenticated server-side identity and authorization middleware must construct the actor from a trusted session.
The provided InMemoryTestAdapter is **not durable** and does not persist across restarts. Persistent memory requires an approved existing database and a transactional, encrypted, audited adapter. The memory prototype does not yet provide row-level security, encryption, retention or redaction.
The HUD is a JSON snapshot, **not a rendered or connected HUD**. Agent messaging, voice, scheduling and specialist work are proposals only. No actual dispatch, external communication, autonomy, or SCOTTY synthesis exists here.
Reasoning plans are deterministic domain-specific templates, **not individualized AI inference**. Final 17-chief roster remains provisional; chief-to-specialist pairing is provisional and must be reviewed. Shared memory is not automatically published or read by all agents.
No production data, paid resources, secrets, deployments or merges.

## Next milestones
1. Confirm final roster, specialties and chief ownership for each specialist.
2. Implement authenticated server-side project/role policies and audited approvals.
3. Add transactional persistence with existing authorized infrastructure and migration tests.
4. Connect actual project assignment records, bio pages, HUD routes and status events.
5. Implement bounded LLM orchestration and chief review → SCOTTY synthesis; add evaluation cases.
6. Run CI and staging end-to-end tests, including cross-project isolation, session expiration, revoked permissions, replay, consent and backup recovery.
7. Obtain owner approval for production integration and deployment.
