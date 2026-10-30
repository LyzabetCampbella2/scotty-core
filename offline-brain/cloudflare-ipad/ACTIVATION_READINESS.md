# Brain activation readiness

The owner-only Activation Status panel and /api/readiness now distinguish AI configuration, stateless inference, a bound database and a usable persistent memory schema. No AI call is used by the check. The public health endpoint includes a release marker to identify this build.

When a database is bound, the lab requires its brain_installation marker and both brain_notes and brain_missions schemas before reading/writing records or invoking AI with memory. Missing or incorrect initialization returns a clear 503 setup reason. The check performs no CREATE, INSERT or migration automatically. memory-schema.sql now includes an additive installation marker; apply it only to the dedicated lab database after verifying the binding belongs to that lab.

This marker checks application identity and schema shape, not Cloudflare account billing or the actual database ID. Free-plan verification remains manual. An unbound Worker can still plan and, if enabled, infer without persistence. A bound but invalid storage installation stops inference until repaired.

45 local Node tests passed, including wrong installation, missing schema, zero-write/zero-provider checks and the previous identity, auth, scoped memory and mission tests. GitHub QA must pass before merging to the dedicated Cloudflare branch. No remote database or Cloudflare account has been modified. Cloudflare is still at sign-in in the available browser, so hosted activation is not verified.

iPad continuation: Cloudflare > Workers & Pages > scotty-independent-ipad-brain-lab > Overview. Verify the latest build is from dev/ipad-cloudflare-staging-gates-20261024. The root remains offline-brain/cloudflare-ipad. On the deployed page, unlock and open Activation Status to inspect the actual next steps. No paid upgrade, production database connection or private content import is included.
