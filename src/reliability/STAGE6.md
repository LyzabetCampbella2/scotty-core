# Stage 6 — opt-in integration and production inventory

## Verified production topology (Railway inventory, October 12 2026)
- SCOTTY Railway project has a production Bun Function service named scotty-core. This is the live legacy app, not the modular GitHub service.
- Separate scotty-core-plqe service points to GitHub branch cloud-independent-voice; its latest deployment status was FAILED.
- Postgres has a persistent volume. No additional backup volume is present.
- There is already one staged Railway configuration change. Do not accept/redeploy it without reviewing its exact contents.
- Voice and memory diagnostic functions exist as separate services.

## What this stage wires
- Opt-in watchdog and local adapter monitoring start in modular src/server.ts only when SCOTTY_ENABLE_RELIABILITY_MONITOR=true.
- CI regression workflow for reliability modules.
- Monitoring remains disabled by default. No live Railway changes.

## Required before production
1. Review the legacy Function source and locate voice, Eyes On, and agent execution entrypoints.
2. Fix failing modular deployment on an isolated staging environment and run CI tests.
3. Wire action gating at every provider-side execution boundary; validate owner session and identity.
4. Use encrypted database backups and independent offsite storage; test restoration.
5. Provide rollback to known good production deployment.
6. Inspect the existing staged Railway change before applying any deployment.
7. Only then connect the control panel to the existing HUD design.
