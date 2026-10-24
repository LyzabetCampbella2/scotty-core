# Team connections and mission memory

Adds two-department missions under SCOTTY. Each department contributes one matched specialist and its chief review. SCOTTY then synthesizes the chief-reviewed findings. One department uses at most three model calls; two use at most five. Existing model, token ceilings, explicit prompt approvals and no-provider-fallback policy remain.

Every consumer retrieves its own allowed notes. Another specialist's raw individual notes are never inserted into chief/peer/SCOTTY reference lists. Submitted findings are handed to the assigned chief and overseer as part of the approved mission; references remain untrusted data.

With the dedicated BRAIN_DB binding and memory-schema.sql applied, missions are claimed by unique request ID, checkpointed after every returned finding, and listed in Saved Missions. Replays return retained results; an in-flight duplicate returns conflict without a second AI run. A checkpoint error stops later calls and returns partial findings. Generated work is kept in mission records, not promoted into reviewed shared knowledge. Interrupted work is retained for inspection, not automatically resumed.

Without BRAIN_DB, team mode remains explicitly stateless; memory/mission controls are unavailable. No database is provisioned by this PR. An existing D1 lab needs the additive CREATE TABLE/INDEX statements in memory-schema.sql applied before using mission mode. Production databases, credentials, voice and HUD remain untouched.

Validation: 40 local Node tests passed, including SQLite claims/replay/races, knowledge-scope isolation, two-department call budgets, partial failure, browser controller mocks and the prior preservation/auth/source checks. CI must also pass before merge. Real iPad, Workers AI and Cloudflare D1 validation remain blocked until Cloudflare account sign-in.

Deployment target remains scotty-independent-ipad-brain-lab, branch dev/ipad-cloudflare-staging-gates-20261024, root offline-brain/cloudflare-ipad. User has authorized merge and live activation. Deployment is not verified; the browser still shows Cloudflare login and AI source default is still off. Existing source fallback identity preservation is not verification of the live database roster. No paid service or production migration is performed.
