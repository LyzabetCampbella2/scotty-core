# S.C.O.T.T.Y. Parts 3–4 proposal, version 1
Date: October 18, 2026 Pacific
Status: NEW PROPOSAL FOR OWNER REVIEW. Not a recovered specification, approved implementation scope, or deployment authorization.

## Intended outcome
Part 3 connects existing missions to project-scoped agent brains and reviewed deliverables. Part 4 extends that connection into bounded coordination across the existing chiefs, with transparent workload, handoffs, and recovery.
Preserve all 128 existing agents, including the 12 chiefs, their IDs/profiles/hierarchy, HUD design, Scottish voice, voice and gesture controls, projects, and memories.

## Existing foundation: extend rather than rebuild
Read against staging commit bd009d62a8624f37e3ff11472e9719031ae5e39a:
- public/missions/index.html already exposes missions, steps, approvals, supervised/internal-auto choices, pause/resume/cancel, and status.
- src/agents/cloud.ts already contains plan-only behavior, automatic chief/specialist selection, chief briefings, mission dependencies, results, review, and recovery paths.
- Part 2 already supplies project grants, reviewed project memories/shares, request approvals, provenance, agent-bound project credentials, quotas, and transactional audits.
- The runtime submission API currently accepts pending handoffs; it is not a general-purpose autonomous tool runner.
- Workload claiming and recovery logic already exist. Their presence is not proof that every combined flow has passed end-to-end checks.

First implementation task, if approved: map these paths and add adapters/invariants where needed. Do not create a parallel mission engine, replace the chief hierarchy, or duplicate Part 2 authorization.

## Part 3 proposal: project missions and reviewed deliverables
Example experience: “Scotty, plan work for this project and recommend a team.” Scotty presents an editable plan and explains the team recommendation. After owner approval, agents receive only the permitted project context and submit traceable drafts for review.

| ID | Proposed behavior | Owner-visible result | Required control |
| --- | --- | --- | --- |
| P3-1 | Explicitly link a mission to one existing project | Project, purpose, team, and allowed sources visible before execution | Never infer project authorization from task wording or chief status |
| P3-2 | Extend existing chief/specialist recommendations with project membership and availability checks | Short reason for each recommended existing agent; owner can change the team | A recommendation does not grant membership or memory access |
| P3-3 | Store a versioned plan using the existing planning path | Steps, assignee, dependencies, deliverable, and review checkpoints | Changed team, scope, sources, or actions invalidate relevant old approvals |
| P3-4 | Build per-agent context through Part 2 permission checks | Each agent's authorized sources and provenance are inspectable | Private/wrong-project/unapproved/revoked memories excluded; chiefs gain no blanket access |
| P3-5 | Associate drafts and final deliverables with mission steps | See who produced what, which sources were used, and review status | Generated text is a draft, not verified fact or automatically approved memory |
| P3-6 | Add step/deliverable review to the existing approval experience | Approve, reject, or request revision with a reason | Approval applies to the shown version; duplicate decisions cannot dispatch twice |
| P3-7 | Reuse existing status/pause/resume/cancel and audit paths | Explain “what is happening,” “what is blocked,” and “what needs me” | Execution and release recheck membership; revoked access stops further dispatch and holds unreleased output for owner review |

### Proposed Part 3 boundaries
- Initial implementation uses synthetic projects/agents and stubbed model/tool responses.
- First enabled behavior would be internal planning and draft delivery only, after separate staging enablement approval.
- No external sends, calendar changes, file edits/deletes, purchases, production releases, or new provider connections in this part.
- No automatic promotion of outputs into approved memories; use the existing learning-review process.
- Existing missions/projects remain readable. No automatic bulk relinking, schema backfill, registry rewriting, or permission expansion.
- Existing voice input can invoke the same authenticated planning/status actions. Preserve the current voice engine and gesture behavior. Any action that changes permissions or performs a sensitive operation still uses the secure review/approval path.

### Part 3 acceptance checks
1. Two synthetic projects cannot read each other's memories, plans, deliverables, or requests.
2. Private, unapproved, wrong-source, and revoked memory shares never enter model input.
3. An unassigned chief/specialist cannot gain access through recommendation, inheritance, a forged ID, or a replayed request.
4. Changing an approved plan invalidates stale approval; concurrent approval requests cannot duplicate dispatch.
5. Revocation between planning and dispatch, or between draft creation and release, blocks unauthorized progress.
6. Revision requests preserve earlier versions and provenance; rejected drafts do not become approved memories.
7. Existing mission routes, Part 2 tests, complete roster/state preservation, HUD assets, voice controls, and gesture controls retain their previous behavior.
8. Owner-facing iPad staging walkthrough demonstrates one project mission from plan to reviewed result, using synthetic data.

## Part 4 proposal: bounded coordination across existing chiefs
Example experience: one project needs research, writing, and engineering input. Scotty recommends a lead chief, coordinates approved handoffs, shows dependencies and blockers, and returns one reviewed summary. The existing 12-chief hierarchy and 128-agent roster stay intact.

| ID | Proposed behavior | Owner-visible result | Required control |
| --- | --- | --- | --- |
| P4-1 | Assign a lead chief to an approved mission; add supporting chiefs as needed | Clear responsibility and explanation of each role | Chief assignment never grants extra project or memory permissions |
| P4-2 | Connect approved cross-chief handoffs to the mission dependency record | See what was requested, delivered, accepted, or blocked | Reuse Part 2 handoff approvals; no silent cross-project sharing |
| P4-3 | Strengthen the existing workload claim/queue path for coordinated missions | Agent availability, queued work, priority, and blockers | Bounded concurrency and atomic claims; no competing worker owns the same active step |
| P4-4 | Validate dependency graphs and bound coordination loops | Explain missing prerequisites, failed dependencies, and circular plans | Reject cycles/unknown steps; do not run downstream work on a failed prerequisite |
| P4-5 | Add explicit run limits to coordinated work | Reviewed ceilings on steps, attempts, elapsed time, and model usage | No unlimited self-spawning, automatic model upgrades, or assumed free provider calls |
| P4-6 | Strengthen restart/retry behavior using existing recovery paths | Resume unfinished work and show completed work already retained | Revalidate permissions and approvals; deduplicate internal dispatch; uncertain external outcomes require owner review |
| P4-7 | Add chief review and one evidence-linked mission summary | Results, unresolved disagreements, missing evidence, and decisions needed | Conflicting claims remain visible; chief review does not replace owner approval for sensitive actions |
| P4-8 | Improve the existing owner inbox with pagination and project filters | Unread/pending items and clear “why blocked” status | Keep notification summaries permission-scoped; no new email/push service by default |

### Proposed Part 4 boundaries
- Coordinate internal work through existing agents and approved interfaces first.
- Exact numeric queue/concurrency/retry/model-usage limits are not decided in this draft. Propose conservative values from synthetic/load tests for owner review before enablement.
- Model usage is not a guaranteed dollar cap unless current provider pricing and enforceable controls support that claim.
- “Pause” prevents new dispatch; it cannot promise reversal of already completed actions or cancellation of every in-flight provider request.
- Do not promise exactly-once external side effects. If a response is lost after a provider may have acted, hold the step for reconciliation rather than blindly retry.
- No Dawna/Sipher OS bridge activation, private-memory export, new agents/chiefs, automatic production deployment, or broad organization-wide access. Those require separate specifications.
- No new paid infrastructure or scheduler activation. Real provider/model calls and secure runtime credential provisioning require a separately approved setup.
- Preserve existing audit records; record new coordination transitions through transactional audits. Do not claim tamper-proof logging without a separate design.

### Part 4 acceptance checks
1. Two concurrent workers cannot claim the same step; expired/revoked credentials cannot resume work.
2. Work requiring a busy/unavailable agent remains visibly queued or blocked; limits remain enforced under concurrent submissions.
3. Cycles, missing prerequisites, failed steps, and delegation loops fail safely with understandable status.
4. A worker crash/restart retains completed internal results and does not duplicate completed dispatch.
5. Permission or plan changes during recovery require reevaluation; pause/cancel stops subsequent work.
6. Simulated exhausted run limits halt further dispatch; no hidden additional model calls occur.
7. Simulated uncertain provider outcomes enter owner review rather than automatic retry.
8. Inbox pagination reaches all permitted pending records without exposing another project's private content.
9. A synthetic multi-chief mission produces a traceable final summary with unresolved issues preserved.
10. Full roster/brain/memory preservation and Part 2/3 regressions pass.

## Suggested implementation order if approved
1. P3-A: map existing mission/brain APIs, define project and plan-version contracts, add isolated compatibility fixtures.
2. P3-B: implement project/context authorization adapters and reviewed deliverables.
3. P3-C: integrate the existing owner interface; perform a synthetic iPad staging walkthrough.
4. P4-A: connect chief assignments, approved handoffs, workload limits, and dependency validation.
5. P4-B: test restart/retry and audit behavior; add inbox pagination/status explanations.
6. P4-C: synthetic multi-chief walkthrough and release-readiness review.

Do not begin Part 4 implementation until Part 3's authorization, versioned approvals, and deliverable boundaries pass.

## Development and release rules
- Implement Parts 3 and 4 on separate development branches with automatic previews/deployments suppressed as needed.
- Use disposable PostgreSQL and synthetic data; mocked model/providers first.
- Compare roster, brain, and approved-memory state before/after tests.
- Keep production branch cloud-independent-voice unchanged; no production data/credential changes, migrations, merge, feature enablement, deployment, paid services, or recurring backups from proposal approval alone.
- Development approval and production release approval are separate. Before any release, present concrete code differences, tests, staging results, migration/backout plan, and costs.
- Record each proposed item as approved, revised, deferred, or rejected. This document remains a proposal until the owner chooses scope.

## Review decision
The owner may approve Part 3 only, approve both parts for isolated development, or request changes by item ID. Approval of both means the staged order and boundaries above, not permission to deploy or alter production. Numeric operational limits remain pending review before activation. No implementation has been performed under this proposal.
