# SCOTTY — Activepieces MCP implementation runbook

Status: **staging drafts installed and tested through the connected Activepieces MCP tools**. The existing user's `SCOTTY — Connection Test` was inspected, repaired and tested. A separate `SCOTTY — Staging` folder contains **11 unpublished/disabled staging workflows** and **8 tables (185 development profiles, 5 public project profiles, 25 proposed collaborators, 1 synthetic task, 1 demo mission, 4 memory scope rules, 3 demonstration owner decisions, and 11 launch gates)**. The Activepieces MCP folder validator returned `ok=true`, `issues=[]`. This is NOT a production deployment, 185 verified autonomous agents, or owner-authorized real project work.

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

The separate-secret Activepieces bridge includes a disabled-by-default read-only `GET /api/activepieces/review-readiness` endpoint that checks D1 schema presence only. It cannot grant authorization. To activate that bridge, its own staging secret and staging Worker deployment must first be explicitly approved, and the optional migration needs separate owner review and backup.

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
