# SCOTTY — Activepieces MCP implementation runbook

Status: **staging drafts installed and tested through the connected Activepieces MCP tools**. The existing user's `SCOTTY — Connection Test` was inspected, repaired and tested. A separate `SCOTTY — Staging` folder contains **15 unpublished/disabled staging workflows** and **10 tables (the existing 185 development profiles, 5 projects, 25 proposed collaborators, 1 synthetic task, 1 demo mission, 4 memory rules, 3 demo decisions, 11 launch gates, 10 unsent synthetic handoffs and 4 creative-media draft profiles)**. The Activepieces MCP folder validator returned `ok=true`, `issues=[]`. This is NOT a production deployment, 185 verified autonomous agents, or owner-authorized real project work.

## Verified Activepieces draft flows

- [SCOTTY — Agent Directory](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/rEGNhvaAaVXbrlFeSPXg8) — tested successfully, public Helm profile
- [SCOTTY — Mission Plan Preview](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/JP93n64ApIaekBP7W7632) — tested successfully; 5 inert specialist/chief/SCOTTY stages
- [SCOTTY — Owner Approval Gate](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/l9lEZhiDUXKaGJASQ01ci) — configured and validated, **native waitpoint not end-to-end tested**
- [SCOTTY — Agent Roster Integrity Audit](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/Om9IMUMEw5SiuSIU7FHpO) — passed: 25 chiefs, 160 specialists, 25 departments
- [SCOTTY — Task Inbox to Team Proposal](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/0XnbbDuYeQM4sTQ4ZEnzC) — passed synthetic task → proposal → review
- [SCOTTY — Project Team Planner (actual)](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/Zh4Gt9XVgIkTsCZ3k3ief) — passed Eirden Atelier five-department proposal
- [SCOTTY — Owner Portfolio Briefing](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/EOzy39Y8WJDR6uKrglKPm) — passed five-project read-only overview
- [SCOTTY — Owner Review Packet Preview](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/Kij25Ua46OFOvOBdElSyn) — passed, no authority granted


- [SCOTTY — Memory Access Gate](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/yijvvHp7kbV6IFGNOTQDy) — PASSED: agent/department/shared/project policy data, `memoryReadAllowed=false` even for matching development identities
- [SCOTTY — Demo Owner Decision Audit](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/TbZ7pjqGhHU0GN562OLJH) — PASSED: approve/reject/pending cases; `backendAuthorized=false`, `canExecute=false` for every case

## Protected backend integration gate (source only, not routed or deployed)

The pure `offline-brain/cloudflare-ipad/activepieces-owner-gate.mjs` contract checks the project ID, mission ID, revision, request digest, approved agent IDs, idempotency key, owner/session source, expiration and explicit consent. It **never returns execution permission or writes data**. A future implementation must fetch owner/session, project membership and approval history from SCOTTY's protected server, not from Activepieces-supplied request fields. Atomic audit-backed mission-commit and scoped worker authorization are not implemented.

The Activepieces workspace currently has **zero connected external application credentials**, and there is no deployed private SCOTTY staging Worker for this automation. Never paste secrets into flow code, table rows or messages.

- [SCOTTY — Launch Readiness Dashboard](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/d6nHeqQQqp8E6A2HNkoDX) — PASSED: 4 verified development previews, 7 blocked release gates, `canExecute=false`, `canDeploy=false`

## New optional owner review ledger — source only

The isolated D1 schema `offline-brain/cloudflare-ipad/activepieces-review-ledger-v1.sql` and `activepieces-review-store.mjs` now provide an **unapplied**, source-only durable preview review draft, owner decision, revision check, idempotent replay protection, owner/session checks and append-only metadata audit. All tested with in-memory SQLite, never a live D1 instance. The review store is **not imported** into the Worker or reachable through an API. A review marked "approved" cannot run any agent or use private memory.

## Owner-only preview review API — wired in development, DISABLED

The isolated Worker's `handleApi` now routes owner-only review requests behind the existing `OWNER_BEARER_TOKEN`, plus a separate default-off `SCOTTY_PREVIEW_REVIEWS_ENABLED=true` switch. This is NOT the `/api/activepieces` namespace and deliberately rejects the Activepieces bridge token as authentication.

- `GET /api/owner-preview-reviews/readiness` is an **owner-authenticated, read-only preflight** that also works when `SCOTTY_PREVIEW_REVIEWS_ENABLED` is off. It checks presence/validity of the owner configuration and project allowlist, the optional review + portfolio schemas, and public development agent-to-project links from isolated D1. Its output contains only boolean readiness and counts, never owner IDs, secrets or private memory. It always reports `readyForProduction=false`, `canExecute=false`, `canDeploy=false`.
- `POST /api/owner-preview-reviews` creates a *public/synthetic* owner review pending record. Never runs a mission.
- `GET /api/owner-preview-reviews?requestId=...` reads owner-scoped status and verifies the audit trail.
- `POST /api/owner-preview-reviews/decision` records owner-confirmed approve/reject/revoke of a **plan preview only**; no mission execution or memory privileges.
- `SCOTTY_REVIEW_OWNER_ID` and `SCOTTY_REVIEW_PROJECT_ALLOWLIST` must be configured server-side for the isolated single-owner lab. Project existence and eligible agent links are queried from the isolated D1 `agent_projects` and `agent_project_links` tables, never accepted from the Activepieces JSON request.
- The optional review migration plus portfolio migration must be present before requests succeed. Real users/project membership and verified roster remain a separate production design; do not mistake a development lab owner bearer for general-purpose, multi-user application authentication.
- Unit/integration tests run against an **in-memory SQLite clone** of both migrations and verify owner auth, project scope, idempotency replay, audit readback, approve/revoke, and denial of untrusted claims.

**No live account configuration was changed.** No Worker deployment, D1 migration, paid connection, secret setup, enablement or published flow was performed. Explicit owner approval and a reviewed isolated backup/deployment plan are still required.

The separate-secret Activepieces bridge includes a disabled-by-default read-only `GET /api/activepieces/review-readiness` endpoint that checks D1 schema presence only. It cannot grant authorization. To activate that bridge, its own staging secret and staging Worker deployment must first be explicitly approved, and the optional migration needs separate owner review and backup.

- [SCOTTY — Agent Bio & Collaborators](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/laAR7amU62nSsH1JUd1u4) — PASSED: Delta under GEORDI, proposed Eirden project and four candidate collaborators; no real assignments or memories

- [SCOTTY — Chief Collaboration Handoffs](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/zdtQxidWHhr73lIAjvu6n) — PASSED: five specialist-chief steps, four cross-chief proposals to GEORDI, one SCOTTY synthesis; 10 total, no messages sent
- [SCOTTY — Handoff Queue Integrity](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/p98RsMYthsbREasTghwMr) — PASSED: validated 10 synthetic queue rows and 9 dependencies, verified none approved or sent
- **Synthetic Handoff Queue:** 10 rows in Activepieces Tables, all `Proposed — not reviewed`, `Not sent — no messaging connection`, `Execution Allowed: No`. This is NOT a real communications inbox; no agent or human messages are delivered.

## New draft department: LUMEN Creative Production

The owner requested a separate chief overseeing individualized social media, cinematography, and photography specialists. Four separate development profiles now exist:

- **LUMEN** (`chief-lumen`) — chief creative director for campaigns, cinema, photography and visual consistency
- **PULSE** (`agent-creative-pulse`) — social strategy, content calendars, scripts, hooks, captions, outreach *drafts* and owner-provided metrics interpretation
- **FRAME** (`agent-creative-frame`) — cinematography, camera movement, gimbals, lighting, shot planning and video editing
- **IRIS** (`agent-creative-iris`) — pet, product, portrait and lifestyle photography, exposure, composition, lighting and ethical retouching

Each has authored differences in personality, responsibilities, working method, outputs, completion checks, proposed memory namespace and tool permissions (currently none). The **optional** `creativeMediaDevelopmentRoster()` produces **26 chiefs + 163 specialists = 189 development profiles** without changing the canonical 25+160=185 active-source fallback roster.

- [Public additive draft directory](https://github.com/LyzabetCampbella2/scotty-core/blob/feat/scotty-activepieces-ipad-bridge-20261106/activepieces/public-creative-media-directory.json)
- [LUMEN Creative Campaign Preview](https://cloud.activepieces.com/projects/xTfZdRPX3i4JjdOyR5NYq/flows/VF0ficyTX8bggvwCwpzb9) — TESTED with a **synthetic** pet-friendly short-form UGC idea; selected PULSE, FRAME and IRIS, routed review to LUMEN and SCOTTY, requested owner approval, **zero** posts, model calls, assignments or memory writes
- Activepieces table **SCOTTY — Creative Media Department (Draft)** contains all four source-backed profiles, explicitly not running and with no connected memory or tools.

### Creative agent implementation — additional source work completed

After the public campaign preview, these components were implemented and tested in the GitHub development branch (not installed as Activepieces live actions and not deployed to Cloudflare):

- `offline-brain/cloudflare-ipad/creative-agent-engine.mjs` — independently callable chief or specialist with unique instructions. It refuses preview-only approvals and requires a separate server-origin `mission.execute` grant, exact agent/project/revision/intent, a 24-hour-or-less expiry and **one model call**. Atomic durable claim must happen before inference; no automatic retries.
- `offline-brain/cloudflare-ipad/creative-agent-state-v1.sql` — **optional, unapplied** isolated D1 run/audit tables and a public/synthetic reviewed-evidence table. No production/client database or private memory migration was performed.
- `offline-brain/cloudflare-ipad/creative-agent-d1-store.mjs` — durable run-claim, idempotency and audit readback; result checkpoint; non-retryable failed state; per-agent, per-project approved evidence retrieval and activity metadata.
- `offline-brain/cloudflare-ipad/creative-project-assignment.mjs` — standalone `project.assign` owner-reviewed grant and transactional project membership logging, not a client `ownerApproved` shortcut. **Source-only, not routed in Worker.**
- `offline-brain/cloudflare-ipad/creative-memory-approval.mjs` — separately reviewed `memory.approve` grant, exact content digest and recipient-scoped **public/synthetic** note persistence. Not automatic learning; **not an encrypted private memory service**.
- `offline-brain/cloudflare-ipad/creative-workers-ai-provider.mjs` — optional bounded Cloudflare Workers AI adapter, requiring explicitly configured AI binding, model and consent flags. Not imported into the Worker; mock-model tests only. No paid model calls.
- `offline-brain/cloudflare-ipad/creative-agent-bio-api.mjs` — **owner-only read-only** directory and selected-agent biography API, now routed behind the isolated Worker's existing owner bearer. With default-off `SCOTTY_CREATIVE_BIOS_ENABLED`, returns public profile only; live project activity requires both optional isolated D1 schemas, project allowlist, and a verified `agent_project_links` record. The API never returns private memory or model-result text.
- `offline-brain/cloudflare-ipad/creative-agent-ui.mjs` — interactive biography chooser added to the existing isolated SCOTTY lab HTML and browser script, with temporary in-tab owner token use, project selector, personality, responsibilities and verified activity metadata. **The entire UI remains an undeployed development change.**

**Verification:** GitHub Actions passed **117/117 Node tests and 5/5 in-memory SQLite/Python tests**, including four distinct model-call mocks, unauthorized/cross-project rejection, durable replay prevention, provider failure, owner-approved public note isolation and no extra paid/external actions.

**Blockers before these are real running agents:** separately approved isolated D1 migration/backup and Worker staging deployment; SCOTTY must mint and atomically consume authenticated server-side `mission.execute` grants rather than accept request booleans; choose and explicitly authorize the Cloudflare model and per-run budget; review restricted data, retention and encryption before any private memory; complete authenticated project assignment and actual specialist → LUMEN → SCOTTY handoff acceptance. Do not publish the development Activepieces flows to attempt to bypass these requirements.

**Not yet connected live:** real model inference, social-media accounts, camera operation, real media editing/analytics, *private* memory and production owner-approved assignments. The source-only pieces above are implemented but not deployed or activated.

All flows are manually triggered, DISABLED and DRAFT. No API secrets, paid AI actions, publishing, external writes, cloud workers or real mission execution were added.



## Required controls before further integration

The MCP endpoint is configured by the account owner. Use Activepieces' documented MCP Tools Reference:
https://www.activepieces.com/docs/mcp/tools

1. **Inspect first**: invoke `ap_set_project_context` without a project ID if necessary, identify the correct user's personal project, then `ap_list_flows`, `ap_list_connections`, `ap_list_tables`. Never create duplicates or move/delete existing workflows.
2. **Examine the existing flow**: identify the previously manually built `SCOTTY — Connection Test` flow; use `ap_flow_structure`, `ap_read_step_code` and `ap_read_step_settings` before editing any action. Confirm exact existing HTTP results and data mappings.
3. **Safe testing**: `ap_research_pieces` for HTTP, Code and Approval (Legacy), `ap_get_piece_props` and `ap_validate_step_config` before mutations.
4. **Build only inert flows**: use `ap_build_flow` or `ap_add_step` with Code actions from `steps/`, and public GET from `public-agent-directory.json`. No publish, no enable, no scheduled trigger, no secrets, no AI step.
5. **Independent validation**: `ap_validate_flow` for each created or modified staging flow. Test only synthetic data using `ap_test_step` and `ap_get_run`. Confirm each output contains no memory write, model call, external actions or real mission ID.
6. **Owner review demo**: use `Approval (Legacy) → Wait for Approval`, not just Create Approval Links. Its decision is for demo only; `demo-decision.mjs` permanently produces `backendAuthorized:false` and `canExecute:false`.
7. **Full production integration**: **stop** until the SCOTTY protected backend exposes authenticated mission and project APIs with project membership, a durable owner-approved revision, scoped secrets and DB permission controls. Never infer backend authorization from Activepieces approval status or a proposed team.
8. **Costs**: before enabling scheduled AI or dozens of agent loops, verify the current Free plan and actual credit use in the user's Activepieces dashboard. Do not create paid provider connections, add payment methods or upgrade the plan.

## Flow package

See `SCOTTY_MCP_BUILD_MANIFEST.json` for 11 proposed flows and their dependencies. Current implemented Code step sources:
- `steps/propose-team.mjs`: deterministic routing preview, selects up to 2 distinct chief domains
- `steps/prepare-review.mjs`: checked, readable, inert review packet
- `steps/mission-preview.mjs`: specialist → chief → SCOTTY draft stages with explicit dependencies
- `steps/demo-decision.mjs`: *demo only*, never grants backend execution
- `steps/public-profile.mjs`: source-backed biography metadata, no live/memory claims

## Data boundary

The publicly accessible `public-agent-directory.json` includes *authored development* names, specialties and chief links, not production identity/permissions. Never append private user data to the public JSON, including personal medical, family, manuscripts, client lists, messages, passwords, cloud secrets or mission text.

All 160 specialists and 25 chiefs have development profiles. They do **not** become separately deployed AI agents merely because a public roster loads. Build one central permissioned execution service, not 185 autonomous unbounded polling flows.

## Source GitHub branch
https://github.com/LyzabetCampbella2/scotty-core/pull/75

GitHub CI is synthetic; separate Activepieces MCP flow executions confirmed the safe preview flows. The approval waitpoint remains untested and none of this proves production SCOTTY authorization or AI-agent execution. Keep the PR draft until owner approval, scoped staging security review, and end-to-end acceptance.
