# Part 4 bounded coordination review

Extends Part 3's existing mission records and Part 2's approved handoffs. New runtime scheduling tables contain only plan-revision runs and step claims. This is a separate stacked development branch; neither branch is merged or deployed.

Coordination plans identify existing lead/supporting chiefs, their assigned steps, approved handoff links, priority and reviewed development ceilings. Chiefs must be project members. Cross-chief prerequisites require the existing owner-approved handoff for the same project and exact source/recipient. The lead review depends on the other authors; its output remains a draft for owner release.

The queue claims an existing workload slot and a mission step in one transaction. It respects global capacity, per-agent concurrency, profile pause/project restrictions and dependency completion. Project queue selection uses priority then creation order. Completed drafts persist across recovery. Expired claims become uncertain and are held for owner reconciliation, never retried automatically. Explicit recovery requeues only known failed internal steps below the reviewed attempt ceiling. Pause prevents new claims and holds late output; it cannot undo a call already in flight.

Conservative development defaults proposed for later activation review: at most 8 steps, 1 attempt per step, 120 seconds elapsed, zero model calls. Tests may lower time limits or permit a second attempt within hard development bounds of 2 attempts and 300 seconds. The existing global concurrency setting remains authoritative. No model provider or tool adapter, external action, scheduler service, new agent or paid service is activated.

Owner API actions on a plan: `start-coordination`, `tick-coordination`, `recover-coordination`; project queue action: `tick-project`. Queue snapshot: `?coordination=true&revision=N`. The owner session, same-origin CSRF guard and Part 3 flag apply, plus `SCOTTY_CHIEF_COORDINATION_ENABLED=true`; simulated ticks also require `SCOTTY_PROJECT_MISSION_SIMULATION_ENABLED=true`. Flags default off and are not changed by commits.

The existing approval inbox gains project filtering, full-precision keyset pagination, true pending/unread counts, read markers and membership/evidence blockers. No notification provider is added. Audit writes remain transactional; no tamper-proof guarantee is made.

Readiness limits: deterministic simulation only. No production credentials, application records, memories or external storage are used in tests. Real provider budgeting, credential-bound worker execution, unknown-outcome reconciliation UI and a hosted iPad walkthrough remain disabled or incomplete; they must not be described as production ready. Existing Scottish voice and gesture implementations are untouched; their runtime regression walkthrough still requires an approved hosted environment.
