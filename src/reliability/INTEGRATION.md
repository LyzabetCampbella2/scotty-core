# Stage 2: control API and monitoring
Endpoints (disabled without SCOTTY_CONTROL_KEY):
- GET /api/control/health
- POST /api/control/stop
- POST /api/control/resume
- POST /api/control/approve with JSON { "actionId": "...", "approved": true, "expiresAt": <epoch milliseconds within 5 minutes> }

All endpoints require Authorization: Bearer <SCOTTY_CONTROL_KEY>. Never expose the key in browser code. Use a server-side authenticated owner session to proxy these endpoints; do not use this shared key as a public HUD credential.

runApprovedAction is an integration adapter, NOT automatically applied to legacy connector/agent execution paths. Production connector actions must call it after server-side authentication and authorization. The emergency stop only blocks gated actions and cannot abort external operations already underway.

ServiceMonitor provides independent, opt-in health probes with timeouts and backoff reporting. Do not mark an external provider healthy merely because its local route exists. Wire actual probe functions after reviewing each service.

Current limitations: in-memory approval and idempotency state; single-process emergency stop; no persistent audit or backups; no distributed locking; no recovery of in-flight provider calls. Do not deploy this branch as production-ready. Test with separate staging credentials and test data first.