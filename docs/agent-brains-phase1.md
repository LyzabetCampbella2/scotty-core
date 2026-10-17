# S.C.O.T.T.Y. Agent Brains — Phase 1
This is an isolated, opt-in backend foundation. It does not modify the HUD, legacy Railway Function, or existing memory adapter.

## Enable
Configure SCOTTY_BRAIN_ADMIN_TOKEN to a strong secret and SCOTTY_BRAIN_DATA_DIR to a persistent private volume path. Never store secrets or private memory in Git. Storage now uses Bun SQLite with WAL, foreign keys, and atomic review transactions. Use a persistent private volume and keep backups. SQLite is not appropriate for multi-replica writers on separate machines; migrate to Postgres for that deployment pattern.

Mount handleAgents in the server router only after authenticating and testing deployment. Phase 1 uses a single owner admin credential; do not give this credential to agents or browser-side code. Integrate a server-side authenticated owner session before HUD use.

## API
GET /api/agents
POST /api/agents
GET /api/agents/:id
GET /api/agents/:id/memories
POST /api/agents/:id/learning
GET /api/agents/learning/review
POST /api/agents/learning/review/:proposalId

## Learning policy
New learning is always pending until owner review. Approval creates an attributed memory with explicit scope. Rejection preserves the audit record. Agents cannot approve their own learning, change permissions, or update instructions through this API. External sharing is disabled in Phase 1.

## Next integration checks
Add database persistence and row-level authorization; migrate existing chief/agent registry without renaming identities; build owner-session authentication; test cross-agent privacy, project membership and rejection; then connect the HUD.

## Validation still required
Run `bun test src/agents` in an environment with Bun installed. The code has not yet been exercised against a live database or connected to the existing agent registry. Never put the admin token in browser JavaScript. The Phase 1 API is disabled by default and must be exposed only through authenticated server-side routes.
