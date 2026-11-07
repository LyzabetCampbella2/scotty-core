# SCOTTY Stage A / Phase 0 — Recorded Owner Decisions

**Recorded:** 2026-11-07. **Basis:** Explicit user instructions in this conversation.  
**Scope:** Only the decisions below; no general authorization for live external actions.

## Decision 1 — Render inspection: APPROVED AND COMPLETED

The user approved **read-only** inspection of Render workspace **My Workspace**. The connected workspace was confirmed and metadata-only listing of services, deploys and Postgres instance was performed. No environment-variable values, production database records, backups, or logs containing user data were requested.

Render metadata identified SCOTTY resources:
- `scotty-core`, `scotty-forge-worker`, `scotty-scottish-voice-awb`: auto-deploy enabled, connected to `cloud-independent-voice`, last reported live deploy at commit `b200c4b315ca26f063deee8dca10eeab5cf39c00` (2026-11-06).
- `scotty-workspace-staging`: auto-deploy enabled, connected to `feat/scotty-project-hud`, live deployment metadata from 2026-10-18.
- `scotty-encrypted-backup`: cron-job service present with auto-deploy disabled, live deployment metadata from 2026-11-02. **No successful encrypted backup or real restoration has been verified.**
- `scotty-memory`: Render PostgreSQL, free plan, region Oregon, status **suspended** at inspection time.
- Eirden services also exist in the workspace but are outside SCOTTY Phase A0 scope; no interaction with their data or configuration occurred.

A Render service's `live` deployment status does NOT prove the service is security-certified, its backup job successfully ran, or its real executor respects the A0 approval ledger.

## Decision 2 — Canonical agent identity freeze: OWNER-APPROVED, VERSIONED

User expressly approved **all 185 permanent IDs and current display names unchanged**, with alias changes reviewed later. Source: Activepieces Public Agent Registry (Draft); read-only exact-field comparison found all 185 records identical to the previously captured candidate, with 25 chiefs, 160 specialists, 25 departments and no orphaned links.

Approved frozen version:
- `docs/a0/roster-frozen-2026-11-07.json`
- Git blob SHA: `476f396a709de64e75169ed0ff504526cc0233ef`
- Version lock: `docs/a0/roster-freeze-lock-2026-11-07.json`
- Original candidate SHA: `84a6ed45838c11ed4e703d4cfc92d83c02326128`

The owner approval was explicit in conversation, **not a cryptographic identity signature**. This freeze applies to a Git version only. No Activepieces record, running agent name, personnel permissions, connected apps, or deployment was changed. Any rename, alias or canonical roster edit needs a new approved version. Six proposed creative-media extensions remain separate from the 185.

## Decision 3 — New infrastructure spending: $0

The user expressly chose **$0 new infrastructure spending**. No new paid/free-trial persistent databases, hosting services, storage, deployment environment or additional resource will be provisioned in Phase A0. Continue using source-only and disposable CI tests only, without adding paid provider usage. Existing infrastructure may continue to have existing charges; this decision does not change subscriptions, quotas or already-running services.

Separate model token/credit budget, per-task USD ceilings and per-day USD ceilings **were not approved**; the staged safety policy remains at zero new external-provider spend unless separately approved and technically enforced.

## Decision 4 — Production data access/export: NOT AUTHORIZED

The user explicitly directed **separate approval before accessing or exporting production data**. Accordingly:
- No production SQL query, data export, backup download, decrypt/restore, migration, secret listing, or production file inspection was authorized.
- Read-only service and deployment metadata does **not** convey access permission to any underlying data.
- The synthetic encrypted CI recovery drill is useful proof of test mechanics only; it is not an actual SCOTTY restore.

A real backup proposal must identify exact production source and read-only scope, encrypted destination, retention, key custody, cost and isolated recovery target, and must receive separate owner authorization before any real-data access.

## Decisions still necessary, but **not** authorized by this response

- A genuinely isolated, existing zero-new-cost staging environment or separately approved infrastructure alternative.
- Exact source-of-truth selection for missions and memory, plus owner-authenticated runtime permissions.
- Full real emergency-stop across agent workers, queues and external providers.
- Real encrypted backup-and-restore acceptance after separate production data authorization.
- Final privilege/data/retention policy approval and explicit final Phase A0 sign-off.

**Overall:** Git roster freeze approved and Render metadata audit completed, $0 new infrastructure spending enforced as a project scope decision, while Stage A0 operational certification remains BLOCKED.
