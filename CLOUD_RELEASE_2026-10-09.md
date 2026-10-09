# S.C.O.T.T.Y. Cloud Release Snapshot — 2026-10-09

## Production
- HUD: Vercel project `scotty-cloud-hud`
- Core API: Render service `scotty-core`
- Memory / resources / auth: Render Postgres
- 3D Forge worker: Render `scotty-forge-worker`
- Brain / STT: Groq cloud provider
- Voice: ElevenLabs
- Vision: cloud Eyes On path

## Verified release state
- Owner cloud account provisioned.
- Runtime legacy fallback count: 0.
- Agent matrix: 128 agents, 12 chiefs.
- Functional Part 8 QA: 100% (7/7).
- Brain round trip: pass.
- Memory write/read/delete round trip: pass.
- Groq reachability: pass.
- ElevenLabs reachability: pass.
- Forge cloud artifact verification: pass.
- Windows Desktop Commander was offline while cloud QA completed, so the verified cloud path did not depend on the Windows gateway.

## Canonical launch
- Production HUD: https://scotty-cloud-hud.vercel.app/
- Operations / Release Center: https://scotty-cloud-hud.vercel.app/system
- Forge: https://scotty-cloud-hud.vercel.app/forge

The HUD includes a web-app manifest whose start URL points to the canonical Vercel HUD so new iPad home-screen launches no longer depend on the old Tailscale/Windows URL.

## Runtime retirement status
Railway is no longer used by the current cloud runtime. Legacy Railway fallback environment variables were cleared from the Render core service and runtime fallback routing was removed from `src/server-cloud-v2.ts`.

Railway resources are intentionally not deleted in this release snapshot. They remain only as an emergency historical rollback source until explicitly retired.

## Rollback snapshots
- `rollback-cloud-release-main-2026-10-09`
- `rollback-cloud-release-core-2026-10-09`

These branches preserve the production HUD and core state before any future retirement or cleanup work.

## Release commits
- Frontend launcher release: `c81216bb34ae973fb7eb97d67d60bbd0331a284f`
- Core automatic recovery release: `3a8fa818b0b0934a1dcc4d0ec59908db932645de`

## Part 8 result
S.C.O.T.T.Y. is operating on the cloud stack with the old Windows/Tailscale/Railway runtime dependency removed from the active path. Railway deletion is deliberately deferred because it is destructive and unnecessary for cloud independence.


Voice/approval diagnostic checkpoint: 2026-10-09.
