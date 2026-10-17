# Phase 1 Render integration — rollout checklist

## Confirmed existing architecture
The active HUD is the Render `scotty-core` service on branch `cloud-independent-voice`, using `src/server-cloud-v2.ts`. The active roster is `scotty_agents` in Render PostgreSQL and `/api/hud/agents/status` reported 128 records, 12 chiefs, `source:fallback` on 2026-10-17. Existing login uses `isCloudAuthenticated` from `src/auth/cloud.ts` and the `scotty_session` cookie. Do not deploy `src/server.ts` as a replacement for the Render HUD router.

## Added on development branch
- `src/agents/postgres-store.ts`: **additive** Postgres schema `scotty_agent_brains`, `scotty_brain_proposals`, `scotty_brain_memories`. Existing roster remains the source of truth; profiles are resolved via LEFT JOIN. This does not call `replaceRoster`.
- `src/agents/render-bridge.ts`: route adapter with an injected owner-auth verifier. It fails closed unless `SCOTTY_AGENT_BRAINS_ENABLED=true`.
- `src/agents/review-ui.ts`: owner Learning Review page at `/agents/learning-review`, browser API under `/api/agent-brains/*`.
- Admin API's old bearer/session prototype must not be used in the browser. The Render adapter injects verified owner identity based on existing login. Add rate limits, audit monitoring and HTTPS-only validation before production.

## How to wire into existing Render server after merging or cherry-picking tested commits
Add imports to `src/server-cloud-v2.ts`:
```ts
import {handleRenderAgentBrains} from "./agents/render-bridge.ts";
```
Inside the existing `Bun.serve` fetch function, after URL parsing and before the default 404, place:
```ts
const brainsResponse=await handleRenderAgentBrains(req,u,isCloudAuthenticated);
if(brainsResponse)return brainsResponse;
```
Because the existing router may contain early returns for static/public routes, verify the placement in the production router. **Do not auto-apply this to live service.**

## Critical rollout requirements
1. Review a backup of Render Postgres `scotty_memory` before migrations. Render free database expiry was reported as 2026-11-07; establish durable backup/plan.
2. Run CI. Check that all tests, especially Render login gating, pass. Run a real Postgres integration test against disposable staging database for transaction/rollback behavior; SQLite tests are not a substitute.
3. Validate that only *new* `scotty_agent_brains`/`scotty_brain_proposals`/`scotty_brain_memories` tables are added and the existing `scotty_agents` rows/counts/IDs do not change.
4. Keep new routes disabled until a verified owner session can sign in, load proposals, approve and reject; test CSRF and unauthorized requests.
5. Test no accidental roster replacement by the legacy `ensureRoster/importLegacy` bootstrap on production; the current code can replace a fallback roster with legacy import.
6. Do not rely on the Railway Postgres database for this Render integration unless a migration is explicitly planned.

No production deployments or live migrations have been performed by the development branch.
