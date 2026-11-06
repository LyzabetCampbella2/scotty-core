# RIKER Brain & Memory — Phase 1 (isolated draft)

This is a working **pure-function starter module** for the existing RIKER chief, identifier `chief-riker` in the isolated SCOTTY Cloudflare roster. It depends on the separate Agent Bio Studio draft (#57). It has **no database writes, scheduler connection, model calls, external sharing, production edits, deploys, or paid resources**.

## Owner-established behavior

- RIKER coordinates operations under SCOTTY rather than replacing SCOTTY.
- Before **each new task and project**, request owner approval. A previous approval does not cover an unrelated assignment.
- Morning briefing can set **that day's** additional check-in times; none are assumed.
- Use owner's chosen nickname stored in a protected owner preference record; do not commit the nickname or private memory to this public repository.
- Every project, question, mission and assignment should appear through current **Agent Bio Studio** portfolio reads, not a manually maintained or fictional project list.
- Distinguish suggested teammates, same-project teammates, actually verified mission collaborators and explicitly preferred coworkers.
- Coordinate with SCOTTY, RIKER's operations specialists, and appropriate chiefs; the planned personal-operations team includes Number One, Chronos and Seven, while ZORA handles knowledge/memory stewardship. All sharing remains permission-bound.

## Memory and access rules

`proposeRikerMemory` accepts an attributable source, category and scope and produces status `pending`. `reviewRikerMemory` only approves/rejects when `ownerVerified` is true. `canRecallRikerMemory` allows approved records only when the caller has verified ownership and the requested scope is currently authorized; sensitive entries need further authorization. Network-wide recall is blocked by default.

Categories: owner_preference, decision, project, mission, collaboration, check_in, reference, lesson. Scopes: private, project, department, network (network rejected in this module).

`buildRikerBrain` accepts the **live** D1 `agentBio(db,agent,roster)` result, an explicit currently authorized project-ID list from the server, a verified owner context, protected owner preferences, and approved memory candidates. It constructs a read-only instruction/snapshot object. **A project label/activity record is not proof of document access.** The server must independently check authorization.

## Remaining before activation

1. Review prerequisite PR #57, its additive `agent-portfolio-v1.sql` migration and D1-only access.
2. Verify `chief-riker` against the actual connected roster; never rename existing agents.
3. Bind to owner-verified Worker routes and D1 governed memory storage, with source/revision/expiry records and a correction/forget mechanism. Do not store sensitive data in public code or portfolio labels.
4. Only after owner's daily briefing, connect approved times to a scheduler with cancellation, time zone, and delivery tests.
5. Test project revocation, owner authorization, source validation, memory denial, fresh assignments, cross-agent isolation and full iPad HUD/voice acceptance using synthetic data.
6. Explicitly review and approve any future staging migration, merge and deployment. Production remains untouched.

Run isolated tests with `node --test offline-brain/cloudflare-ipad/riker-brain.test.mjs`.

This module is **coded but not live**. No memory was inserted into the user's SCOTTY database.
