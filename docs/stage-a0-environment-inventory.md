# Stage A0 — Read-only systems and environment inventory

Date of observation: 2026-11-07. **Draft / owner review pending.**
This inventory records existence, not production authorization, complete source-of-truth mapping, security certification, or end-to-end operation. It contains no credentials.

## Confirmed systems

| System | Read-only finding | Blocker / owner decision |
|---|---|---|
| Activepieces (Lizzy's Project) | 24 manual-trigger flows; all disabled/unpublished. 17 tables. 0 app/OAuth connections. | Keep drafts off; choose authoritative registry and task ledger. |
| Activepieces Public Agent Registry (Draft) | 185 records, 25 chief IDs, 160 specialist IDs, 25 departments; unique IDs and intact chief links in current dataset. | Owner approved all 185 IDs and current display names without changes. Versioned Git snapshot and immutable blob lock created; runtime Activepieces registry unchanged. |
| GitHub `scotty-core` | Public modular code repo, default `main`. Brain, workspace, memory, HUD, voice and eyes modules are present; feature-gated prototypes, not certified live agents. | Identify deployment SHA and reconcile branch vs. actually deployed router. |
| GitHub `scotty-encrypted-db-backup` | Private separate repository with documented encrypted Render PostgreSQL backup kit. | Verify current backup artifact, custody, restore proof, retention and exact database source out of band. |
| Railway project `SCOTTY` | Has `production` and `Eyes on test` environments. Service names include Postgres, two scotty-core variants, memory and voice diagnostics. | Determine which services actually run which code; verify isolated credentials and storage. |
| Railway project `SCOTTY Reliability Staging` | A staging environment exists; no services returned in list at this audit. | An environment name alone is not an independently running staging copy. |
| Vercel project `scotty-cloud-hud` | Found; latest reported deployment READY but `live=false` in its project details. Project-level password/SSO protection were reported disabled. | Audit exact production vs preview URL, auth, client secrets, and Git branch. Do not put sensitive owner information in a public HUD. |
| Vercel rewrite in `scotty-core` | Source config routes `/api/*` to `scotty-core.onrender.com` (config presence only). | Verify real deployment and origin/route authentication before interpreting as active. |
| Render | Owner-authorized read-only audit of **My Workspace** completed. Five SCOTTY web services, one backup cron job and one Render PostgreSQL instance identified; see addendum below. | Verify real executor branch/permission boundaries; no production data access or exports authorized. |
| Neon | Accessible projects are named Eirden Atelier and The Standard by Stefanie. | Neither is established as SCOTTY's canonical database. Do not query or repurpose. |
| Supabase | Accessible projects are named ECRJR Atelier and ECRJR. | Neither is established as SCOTTY's canonical database. Do not query or repurpose. |
| D1 / local files / iCloud | Not confirmed in this audit. | Map precise owner-authorized source, data class and retention policy. |

## Distinct systems of record to choose

- **Agent identity:** Activepieces remains draft source metadata. Owner-approved frozen Git roster `docs/a0/roster-frozen-2026-11-07.json`, blob `476f396a709de64e75169ed0ff504526cc0233ef`, locks the 185 IDs and names for development; it has not been deployed as a live registry.
- **Owner approval:** demo ledger is not an enforceable grant registry; need authenticated owner session and transactional grant table.
- **Current assignments:** synthetic or proposed assignments must not become real job history.
- **Memory:** distinguish on-device private storage, Railway Postgres, source control and proposed SQLite/Neon. No automatic sharing.
- **Project and client files:** never infer that a ChatGPT connector grants access to Activepieces. Store original media in place.
- **Audit and revocation:** append-only transactional log + external action receipts + verified stop-all controller.

## Review & rollout gate

1. Owner designates SCOTTY identity and database sources and confirms environment separation.
2. Implement privileged owner account sessions and write-path grant enforcement with atomic idempotency, budget reservations, revocation and evidence logging.
3. Verify independent recovery: download, decrypt, disposable isolated restore, schema/row checks, encrypted retention policy and rollback rehearsals.
4. Owner signs proposed aliases, zero/unlimited ceilings decision (default zero paid spending), data protection policy and enabled workflows.
5. No new automatic agent tasks, public posting, message sending, production merges or spending before separate authorization and negative-permission tests.

**A0 is BLOCKED** pending these proofs. Reading an environment or drafting a policy is not equivalent to enabling a safe one.

## Further read-only deployment audit (2026-11-07)

- Railway `SCOTTY / production` and `SCOTTY / Eyes on test` expose the **same Postgres service identity and mounted volume**. The service is attached to `postgres-volume` in both environment inventories; **isolation must not be assumed**. Until confirmed by a DBA, prohibit migrations, restore drills and synthetic workload testing on either shared reference.
- Railway `SCOTTY Reliability Staging` has a `staging` environment with zero listed services, volumes and buckets. An empty staging environment is not a ready isolated database.
- Railway `SCOTTY / production` has a staged patch on `scotty-core-plqe`; do not accept/commit the patch as part of Phase A0.
- GitHub CI operates against an **ephemeral disposable PostgreSQL container only**, with a synthetic backup and isolated restore check. This is valuable engineering evidence but not proof that any real encrypted backup can be independently decrypted and restored.
- Required owner decision: exact non-shared staging PostgreSQL service and resource identity, exact authorized source system, recovery-key custodian, backup retention, and whether/how to resolve current Railway environment overlap.

## Render read-only audit (owner authorized, 2026-11-07)

The owner explicitly confirmed read-only access to Render workspace **My Workspace**. Inspected only service configurations, deployment metadata, and PostgreSQL instance metadata — no SQL, environment-variable values, backup contents or production records.

| Resource | Connected Git branch or service state | Last metadata observation |
|---|---|---|
| `scotty-core` | `cloud-independent-voice`, auto-deploy yes | Live deployment at commit `b200c4b315ca26f063deee8dca10eeab5cf39c00` (2026-11-06) |
| `scotty-forge-worker` | Same branch, auto-deploy yes | Same live commit |
| `scotty-scottish-voice-awb` | Same branch, auto-deploy yes | Same live commit |
| `scotty-workspace-staging` | `feat/scotty-project-hud`, auto-deploy yes | Live deploy metadata from 2026-10-18, commit `83ac4315dae5bde3cdcf5c642491dc5a44275a27` |
| `scotty-encrypted-backup` | `test/isolated-docker-age`, auto-deploy no | Cron job has live deployment metadata from 2026-11-02; successful execution/export/restore **not** verified |
| Render Postgres `scotty-memory` | Free plan, Oregon | Status **suspended**, NOT established as isolated available A0 staging database |

The Render web services are deployed from branches/commits other than PR #76 and might still use legacy provider workflows. A `live` deployment means Render reported a deployment as live, **not** that the endpoint is secured, operating correctly, or subject to A0 owner approval controls.

**Staging isolation remains unresolved:** Railway production and Eyes on test share the same Postgres service/volume in provider inventories, and the Render free Postgres is suspended. Do not reuse the suspended database, repurpose other projects, or provision a new database without a new explicit owner decision. The owner chose **$0 new infrastructure spending**.

### Owner approvals and data boundary

- Canonical identity version: 185 current IDs and names **approved**, future aliases deferred.
- Render: metadata-only read access to My Workspace **approved and completed**.
- Spending: **$0 for new infrastructure**. No new persistent service, database, storage or paid provider call.
- Production data: **no access, export, decryption, migration, or restore authorized**. Separate exact-scope owner approval required.
