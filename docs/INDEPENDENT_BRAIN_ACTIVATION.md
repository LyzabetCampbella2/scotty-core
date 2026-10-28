# SCOTTY Cloudflare independent brain — owner integration

## What this integration actually deploys
- A separate `/brain-lab` observatory reachable from the original HUD.
- An owner-authenticated, same-origin, server-side proxy for an independently deployed Worker.
- Only exact routes for status, readiness, catalog, sources, missions, memory, planning, source discovery and explicitly approved AI tasks. Worker owner tokens never enter a browser.
- **Off by default.** Merging this code never creates Cloudflare infrastructure, never connects the production database to D1 and never switches Groq off on the original HUD.
- Original agents, HUD, Scottish voice, gestures, file storage and backups remain untouched.

## Prerequisite: activate the isolated Cloudflare Worker
GitHub branch: `dev/ipad-cloudflare-staging-gates-20261024`; root: `offline-brain/cloudflare-ipad`; Worker name: `scotty-independent-ipad-brain-lab`.
**The dedicated Worker project already exists in the owner's Cloudflare dashboard, and GitHub was connected; do not create a duplicate Worker.** Previous dashboard checks showed no workers.dev URL and no verified new build. The Cloudflare dashboard is NOT accessible through the connected GitHub and Render tools. On that existing Worker, confirm **Workers Free** in billing (do not choose Workers Paid), verify the exact dedicated GitHub branch/root under Settings > Builds, complete the staging preflight in `IPAD_STAGING_SETUP.md`, and inspect the latest deployment. Enable its unique workers.dev route only when the dedicated Worker has a successful safe build. Cloudflare Git builds may deploy every push.

In the isolated Worker set secret `OWNER_BEARER_TOKEN` with a **unique random 32+ char value**, stored only in a password manager and Cloudflare. Never put it in source, a GitHub PR, or a ChatGPT message. AI remains off by default. Check the Worker `/health` endpoint and owner-authenticated `/api/readiness` before proceeding. Private content must remain out of the isolated lab.

For durable memory only: provision a **new** Free-eligible D1 database, e.g. `scotty-independent-brain-memory`; never link an existing Render/Postgres or ANSJEM database. Apply `offline-brain/cloudflare-ipad/memory-schema.sql` only to that dedicated D1 database. An explicit Worker binding `BRAIN_DB` with the actual verified D1 UUID must be added to Wrangler and approved in `staging-preflight.mjs` before deployment (the current preflight deliberately blocks D1); never weaken that gate with a wildcard or a guessed UUID. Readiness must show the correct dedicated brain installation marker and schemas. D1 creation/application has **not** happened merely because this integration merged.

## Render activation, only after the Worker exists and is verified
In Render > scotty-core > Environment, add these as **private** variables:

- `SCOTTY_INDEPENDENT_BRAIN_ENABLED=true`
- `SCOTTY_INDEPENDENT_BRAIN_URL=https://<your actual dedicated Worker>.workers.dev` (HTTPS URL with root path only)
- `SCOTTY_INDEPENDENT_BRAIN_TOKEN=<same unique secret held in Cloudflare OWNER_BEARER_TOKEN>`

Do **not** set up variables or values in a public file. This creates server-side access on behalf of the already authenticated SCOTTY owner, but does not copy private histories or database records into Cloudflare. If you need absolute zero cross-service shared credentials, keep this bridge disabled and use the independent Worker UI with its own local owner token instead.

To enable AI tasks only after Free plan confirmation, AI binding/readiness checks and a capped synthetic prompt test, set `AI_ENABLED=true` in the dedicated Worker **after** its source preflight and deployment config are updated to keep default-off safely when unconfigured, then set `SCOTTY_INDEPENDENT_BRAIN_AI_PROXY_ENABLED=true` in Render. Both owner approval and explicit permission to share a non-private prompt with Cloudflare remain mandatory on every request. Avoid paid services or over-quota usage. Workers Free quotas are provider-enforced, not a cost guarantee if the account becomes Paid.

For Cloudflare memory writes *after* D1 is ready, set `SCOTTY_INDEPENDENT_BRAIN_MEMORY_PROXY_ENABLED=true` in Render; each write still requires `approved:true` and `noPrivateDataConfirmed:true`. Do not sync production memories automatically.

## Live smoke checks
1. Visit `https://scotty-core.onrender.com/hud`, log in, and open **Independent Brain** in the HUD navigation.
2. Initially, the dashboard truthfully reports `BRIDGE_DISABLED` or a connection error. This is expected until the Worker is live and the private Render config is set.
3. After activation, click Refresh; verify **25 chiefs, 160 specialists**, Cloudflare release, whether actual live roster identities are verified, AI switch state and D1 state. Code profiles alone do not certify the live roster.
4. Click Recommend agents with a *synthetic* task, and load approved public publishers. These actions require zero model inference and no memory writes.
5. After readiness and consent, run a synthetic team task and verify specialists' findings, chief reviews and SCOTTY synthesis. Check saved missions only when D1 is ready.
6. Confirm the original HUD, Scottish voice, agents, files and existing memories still work; never claim D1 persistence unless it passes a real write/read smoke test.

## Testing
`node --test src/brain/independent-bridge.test.mjs` uses a synthetic Worker transport, no network, secrets, production data or billable AI. Github Actions runs this suite on the PR. Do not merge if checks fail.

## Rollback
Set `SCOTTY_INDEPENDENT_BRAIN_ENABLED=false` in Render; this immediately blocks proxy operations when that configuration is active, without touching the original SCOTTY services. Separately disable the Cloudflare Worker if needed. No private-memory migration was part of this integration.

## HUD integration update (2026-10-27)
The existing Worker is now live at `https://scotty-independent-ipad-brain-lab.lizzybee246.workers.dev`, with the dedicated `scotty-brain-memory` database. Owner screenshots confirmed a three-stage mission and saved-mission retrieval. Earlier setup instructions above describe the historical default-off setup, not its current activation state.

The HUD Team Brain page now exposes profile inspection, scoped reviewed-memory reads/writes, and a read-only comparison of original HUD identities against the Cloudflare catalog. That comparison does not migrate production records or set the Worker's liveRosterVerified flag. Existing conversational/voice and production-agent execution paths remain separate from explicitly approved Team Brain missions.

The proxy allows 120 seconds for a team mission; other requests retain a 15-second timeout. The page disables duplicate submissions and retains a mission ID after transport errors so the Worker can deduplicate retries. Closing the tab loses this pending ID; consult Saved missions before resubmitting.

Activation still requires the matching Worker owner token in Render's private SCOTTY_INDEPENDENT_BRAIN_TOKEN variable. Never paste it into chat or source. Configure only scotty-core; other shared-branch services do not need deployment.
