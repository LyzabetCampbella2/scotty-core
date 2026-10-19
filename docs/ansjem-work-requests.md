# ANSJEM requests and agreements — additions 1–4

Implements the owner's requested first four additions from *Ellie's ANSJEM Development Onboarding Package*: voice-guided work requests, a development board, shared work IDs and linked records, and an agreement inbox. The source document remains a proposed working agreement; this feature does not appoint people to organizational roles.

## Using the workspace

In the original HUD, use **Project teams & briefing**, select the appropriate existing project, and open **ANSJEM development**. The board groups work by its actual status and shows requested and committed dates, accountable delivery owner, blockers and release status. The agreement inbox lists requested work and proposed changes. Both lists and the event history have pagination.

Say **Prepare an ANSJEM work request**. Scotty asks for the project if needed, then title, requester, receiving team, business need, outcome, scope, exclusions, deliverables, acceptance criteria with verification methods, requested date, and acceptance owner. Say **add another criterion** or **continue request**. Say **repeat ANSJEM question**, **change title to …**, or **cancel ANSJEM request**. A complete readback precedes **review ANSJEM request**, then a unique **confirm ANSJEM request N** phrase. Dictation stays in the existing conversation and Scottish speech transport.

Optional system owners, dependencies, access requirements, priority rationale, constraints, fixed deadlines and DEV execution URL can be recorded in the visual request editor. Missing information stays unrecorded rather than being guessed. No agent membership, document sharing or external task dispatch happens when saving a request.

Say **read ANSJEM board**, **read ANSJEM agreement inbox**, **read more ANSJEM work**, or **choose ANSJEM work one** to inspect work. Beyond the first twelve spoken choices, use the exact work ID. Agreement source records are reviewed in the workspace.

## Agreement rules

- A saved request gets a permanent `ANSJEM-DEV-NNNN` ID. Its authoritative Scotty record URL and optional DEV execution URL use that ID as the shared reference. The other system must retain the same ID manually until a verified integration exists.
- Record a receiving-team response with respondent, source URL, response date and note. Dispositions are accept, needs clarification, propose changes or decline. Acceptance also requires the committed delivery owner, estimate and completion date.
- Record requester agreement separately against the current version. Only a positive receiving-team response followed by requester agreement moves the request to **Accepted for work**.
- Both entries are explicitly marked **manually recorded by the owner**. The application does not authenticate the remote respondent or send a message to that person.
- Revision retains the work ID and previous snapshots while resetting both agreements. Existing commitments cannot silently survive changed scope.
- Agreed work can record **In progress**, **Blocked** or **Ready for acceptance**, with next-action owner, next action and supporting reference. Technical acceptance, release authorization and maintenance closure remain separate future workflows; these controls cannot deploy or mark a delivery accepted/closed.

## Storage and access

New storage: `scotty_ansjem_work_number` sequence and `scotty_ansjem_work`, `scotty_ansjem_work_revisions`, `scotty_ansjem_work_events` tables. Existing project records and collaboration audit are reused. All writes and audit entries are transactional; stale versions fail, and identical command-ID retries do not create duplicate work. Work IDs are unique across projects. API access uses the existing owner login and origin/CSRF checks. GETs remain project scoped and do not call external providers.

Feature flag: `SCOTTY_ANSJEM_WORK_ENABLED=true`, together with the existing project operations, project missions and agent brains flags. The new flag defaults off, the UI stays hidden, and no new schema is initialized while it is off. Production activation requires review of the additive storage and explicit enablement. No new service or database is required. Real project drafting is unaffected.

## Verification and rollout

Isolated GitHub Actions uses synthetic fixtures, disposable PostgreSQL and Chromium/WebKit. Tests cover exact voice confirmation and corrections, project/thread changes, shared ID concurrency and retries, agreement order, rejected/clarification responses, revision invalidation, stale writes, pagination, atomic audit failure, owner and CSRF guards, and preservation of all 128 agents, 12 chiefs, brains and memories. Browser tests cover request and agreement review, source references, project switches, disabled state and text rendering.

Deploy readiness is reported in the PR after CI. A live remote DEV connection, real organizational signatures and physical iPad voice acceptance are outside these isolated checks. No production activation, credential changes, external messages or paid resources are part of this development branch.
