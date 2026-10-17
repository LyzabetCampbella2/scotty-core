# Part 2 — Collaboration, project knowledge and approval safety

All collaboration routes use the existing Render owner session and are disabled by default behind SCOTTY_AGENT_BRAINS_ENABLED. Project grants are separate from the legacy roster. No existing agent identities are modified.

## Delivery guarantee
A review locks its request row, verifies both agents still have project grants, and writes the approved handoff message or project-memory share, decision and audit record in one PostgreSQL transaction. Rejected requests never dispatch. Failure rolls back everything, leaving the request pending for investigation. Duplicate reviews reject rather than duplicate a message.

## Project knowledge
Approved project-scoped memories can be shared only with explicitly granted recipients. The `/api/agent-brains/collaboration/<projectId>/received?agentId=<recipient>` endpoint returns the currently authorized memory view. Revoked shares and expired memberships are filtered. This endpoint is owner-only; individual autonomous agents are not authenticated in Part 2 and must never be given owner session cookies.

## Verification
GitHub CI runs with disposable PostgreSQL, never the Render production database. Run tests for queue approvals, rejection, duplicate review, grant revocation between request and review, source/recipient validation and roster preservation. Live staging login and production database backup remain prerequisites before enabling the feature.

## Known next steps
Explicit authenticated agent service identities and request provenance are required before allowing autonomous proposals. Add project knowledge provenance display, notification routing and paginated inbox before activating agent-to-agent automation.

## Stage 4: agent service identities
- Credentials are random 256-bit bearer secrets, stored only as SHA-256 hashes in `scotty_collab_credentials`.
- Each secret is bound to an existing agent and one authorized project, with a maximum 24-hour expiry and explicit revocation.
- Owner-only issuance/revocation: `POST /api/agent-brains/agent-credentials` with CSRF and existing owner session. Treat the raw credential as a one-time secret; it must be provisioned only to a trusted server-side agent runtime, never exposed through HUD scripts or shared logs.
- Agent-only submissions: `POST /api/agent-runtime/projects/<projectId>/requests` with scoped Authorization bearer. The authenticated identity is derived from the token, never from the submitted `senderId`.
- Both `SCOTTY_AGENT_REQUESTS_ENABLED=true` and `SCOTTY_AGENT_BRAINS_ENABLED=true` must be explicitly set. Neither is enabled in production.
- The only enabled agent action is proposing a **pending** handoff. Actual delivery still requires an owner session approval and re-checking both agents' project grants.
- Do not enable until a trusted agent runtime can securely receive credentials, rate-limiting is in place, and deployed end-to-end tests pass.
