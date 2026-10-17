# S.C.O.T.T.Y. Agent Brains — Phase 1
This is an isolated, opt-in backend foundation. It does not modify the HUD, legacy Railway Function, or existing memory adapter.

## Enable
Configure SCOTTY_BRAIN_ADMIN_TOKEN to a strong secret and SCOTTY_BRAIN_DATA_DIR to a persistent private volume path. Never store secrets or private memory in Git. The local JSON store is single-process only; migrate to a transactional database before multi-replica production.

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
