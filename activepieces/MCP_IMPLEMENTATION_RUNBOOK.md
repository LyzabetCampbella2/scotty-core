# SCOTTY — Activepieces MCP implementation runbook

Status: **draft plan only; NO Activepieces workspace actions performed by this repository change.** The user's browser has successfully tested a public SCOTTY directory (185 authored development profiles). In this ChatGPT session, Activepieces MCP tools are **not yet exposed to the assistant**, so no in-account operation can be verified.

## Once actual Activepieces MCP tools appear

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

CI is synthetic; it does not prove an Activepieces MCP connection. Keep the PR draft until staging QA, reconciliation and user approval.
