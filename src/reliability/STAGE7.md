# Stage 7 — Production compatibility and recovery gate

## Confirmed observations, 2026-10-12
- Production `scotty-core` Railway Function runs Bun and uses a split packed loader with a remote chunk URL at `scotty-core-plqe-production.up.railway.app/scotty-core-chunk`. The deployed Function source is 83,459 characters.
- The remote modular GitHub service `scotty-core-plqe` points to branch `cloud-independent-voice` and its most recent deployment was FAILED. Do not assume that its GitHub branch matches this feature branch.
- The production Railway environment has one staged change: adding `OPENAI_API_KEY` to `scotty-core-plqe`. No changes were accepted.
- The legacy Function has a previous successful Railway deployment ID `0f545960-a26f-4943-8b3a-85386468e150` that Railway reports as rollback-capable. A rollback has not been attempted.
- GitHub Actions reliability workflow runs 38297412100, 38297412124, and 38297410717 completed successfully.

## Safe migration sequence
1. Snapshot the live Function source and remote chunk source; verify both checksums, retaining them in protected storage (never public GitHub).
2. Confirm the remote chunk URL is reachable and capture its version; inspect any authorization and secret handling.
3. Map the legacy routes and gesture/voice state machine from decoded source without modifying live production.
4. Deploy this feature branch to a **separate staging environment**, not to the production service or its remote chunk provider.
5. Run voice and Eyes On smoke tests, multi-hand gesture regression tests, agent approvals, and backup restore drills.
6. Implement owner session proxy; do not embed SCOTTY_CONTROL_KEY in browser scripts.
7. Only after staging passes, plan an incremental route-by-route cutover and documented rollback.

## Hard stops
- Never overwrite the legacy Function with modular `src/server.ts`: its voice and memory adapters are incomplete and would cause regressions.
- Do not accept the existing staged Railway change as part of this migration.
- Do not promise agent or HUD integration without locating and testing the live execution code.
