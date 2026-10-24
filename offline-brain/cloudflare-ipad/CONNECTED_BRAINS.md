# Connected team brains — release candidate

SCOTTY oversees 25 chiefs and 160 specialists. The Worker now exposes the expanded roster, per-member brain profiles and relevant specialist/chief plans. Every original ID/name/chief link from the production source fallback has been retained. This is NOT an export or verification of the live database roster. Existing production memory/HUD/voice/credentials are untouched.

## What works in this build
- Owner-authenticated iPad catalog and individual brain inspection.
- Transparent assignment matching across 25 departments.
- Cloudflare-only team inference: one matched specialist, their actual chief, then SCOTTY synthesis; at most three calls, 220 output tokens each. Stops with retained findings if the provider fails, with no retry/fallback or fabricated final answer.
- Optional dedicated D1 memory: individual, department and team scopes; explicit owner review; citations; 1–365 day freshness. No production DB and no automatic model-output promotion.
- On-demand, exact-allowlist public feed headlines, with bounded downloads, no redirects, 8-second timeout and discovery-only labels. No scheduled updates activated and no automatic knowledge approval.

## Cloudflare activation
This build is merged to the isolated Cloudflare-connected branch, not main or cloud-independent-voice. The configured Worker remains scotty-independent-ipad-brain-lab; root offline-brain/cloudflare-ipad; branch dev/ipad-cloudflare-staging-gates-20261024.

The existing Free-plan build attestation, owner bearer authentication and default-off AI remain. Account sign-in is required to verify Worker deployment, Free plan, secret and binding. After deployment and Free-plan verification, activate AI in the dedicated Worker only. No paid upgrade is permitted. Live inference is not verified until a bounded real test succeeds.

For optional durable memory, create a new D1 database named scotty-independent-brain-memory on Workers Free, apply memory-schema.sql, bind it to the dedicated Worker as BRAIN_DB and record its actual database ID in Wrangler d1_databases before the next Git deployment. Never use an existing production database. This build does not provision D1 or claim memory is connected. The preflight must be deliberately updated to validate the exact approved dedicated database ID before a config containing that new binding can deploy. Until then, memory controls report unavailable and planning/inference work without persistence.

Git build command should run all tests:

    node staging-preflight.mjs && node --test *.test.mjs

Deployment command remains:

    npx wrangler@4 deploy --config wrangler.jsonc

Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
D1 binding API: https://developers.cloudflare.com/d1/worker-api/

## Validation
33 local Node checks passed, including real SQLite persistence/isolation/freshness, sequential specialist/chief/SCOTTY execution with stubbed AI, retained partial findings, auth/default-off behavior, all 128 source fallback identities, exact 25/160 expansion counts and bounded feed downloads. No real provider, private content or production database was used. Physical iPad, real D1, source availability and hosted Workers AI need live validation after sign-in.
