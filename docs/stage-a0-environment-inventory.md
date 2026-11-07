# Stage A0 — Read-only systems and environment inventory

Date of observation: 2026-11-07. **Draft / owner review pending.**
This inventory records existence, not production authorization, complete source-of-truth mapping, security certification, or end-to-end operation. It contains no credentials.

## Confirmed systems

| System | Read-only finding | Blocker / owner decision |
|---|---|---|
| Activepieces (Lizzy's Project) | 24 manual-trigger flows; all disabled/unpublished. 17 tables. 0 app/OAuth connections. | Keep drafts off; choose authoritative registry and task ledger. |
| Activepieces Public Agent Registry (Draft) | 185 records, 25 chief IDs, 160 specialist IDs, 25 departments; unique IDs and intact chief links in current dataset. | Owner must review display-name mismatches, sign exact version, and freeze a separate immutable canonical snapshot. |
| GitHub `scotty-core` | Public modular code repo, default `main`. Brain, workspace, memory, HUD, voice and eyes modules are present; feature-gated prototypes, not certified live agents. | Identify deployment SHA and reconcile branch vs. actually deployed router. |
| GitHub `scotty-encrypted-db-backup` | Private separate repository with documented encrypted Render PostgreSQL backup kit. | Verify current backup artifact, custody, restore proof, retention and exact database source out of band. |
| Railway project `SCOTTY` | Has `production` and `Eyes on test` environments. Service names include Postgres, two scotty-core variants, memory and voice diagnostics. | Determine which services actually run which code; verify isolated credentials and storage. |
| Railway project `SCOTTY Reliability Staging` | A staging environment exists; no services returned in list at this audit. | An environment name alone is not an independently running staging copy. |
| Vercel project `scotty-cloud-hud` | Found; latest reported deployment READY but `live=false` in its project details. Project-level password/SSO protection were reported disabled. | Audit exact production vs preview URL, auth, client secrets, and Git branch. Do not put sensitive owner information in a public HUD. |
| Vercel rewrite in `scotty-core` | Source config routes `/api/*` to `scotty-core.onrender.com` (config presence only). | Verify real deployment and origin/route authentication before interpreting as active. |
| Render | At least one workspace visible; service/database inventory not performed because the connector requires explicit workspace selection. | Owner chooses workspace before further Render inspection. |
| Neon | Accessible projects are named Eirden Atelier and The Standard by Stefanie. | Neither is established as SCOTTY's canonical database. Do not query or repurpose. |
| Supabase | Accessible projects are named ECRJR Atelier and ECRJR. | Neither is established as SCOTTY's canonical database. Do not query or repurpose. |
| D1 / local files / iCloud | Not confirmed in this audit. | Map precise owner-authorized source, data class and retention policy. |

## Distinct systems of record to choose

- **Agent identity:** currently the Activepieces draft registry; choose freeze version and owner-signed manifest.
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
