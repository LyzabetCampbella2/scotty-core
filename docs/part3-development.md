# Part 3 development review

Implements the owner-approved proposal v1 in `docs/parts-3-4-proposal-v1.md` as an additive adapter over `scotty_agent_plans` and `scotty_agent_missions`. Legacy plans remain unchanged. New project-managed plans cannot execute through the older HUD runner.

Owner route: `/agents/project-missions`. API: `/api/agent-brains/project-missions/:projectId[/:planId]`. The existing owner session and same-origin CSRF protection apply. Both `SCOTTY_AGENT_BRAINS_ENABLED` and `SCOTTY_PROJECT_MISSIONS_ENABLED` must be `true`; simulation additionally requires `SCOTTY_PROJECT_MISSION_SIMULATION_ENABLED=true`. All new flags default off. No flag is changed by this branch.

Plans contain explicit project membership, per-step author, selected approved project memories, prerequisites, draft deliverable and immutable revision snapshots. Approval binds to the revision and current membership/share timestamps and approved source contents. Every dispatch and draft release rechecks that snapshot under the same transaction lock as Part 2 revocations. Chief rank adds no access. Outputs remain drafts until owner review; they never enter approved learning automatically. Revision requests retain previous drafts and review notes.

Execution in this increment is deterministic simulation only: no provider, tool, email, calendar or external side effect is called. Part 4 adds bounded scheduling and recovery before any real model adapter is considered. The owner UI and source/dependency selection still require a hosted iPad walkthrough after separate staging deployment approval. No deployment or production migration is included.

Validation: dependency contract unit tests plus real disposable PostgreSQL integration tests cover scoped context, stale approvals, concurrent dispatch, revocation, immutable revisions, CSRF, transactional audit failure, and exact preservation of all 128 roster records. CI results must be reviewed before readiness is claimed.
