# SCOTTY Stage A0 — Recovery, Emergency Stop and Incident Runbook

**Status:** DRAFT / OWNER REVIEW. This document records required operator procedures, **not evidence of a completed production drill**.

## 1. Current safe baseline

- Activepieces SCOTTY flows audited: 24 flows, all DISABLED and unpublished; zero OAuth app connections.
- Draft GitHub PR #76 is unmerged; no live agent runner is connected to the A0 reservation ledger.
- A0 staging schema defaults to `stop_all=true`, `enabled=false`, `budget_approved=false`, zero spending and `paid_actions_enabled=false`.
- `POST /api/a0/stop-all` affects **the staging reservation ledger only**. It does not interrupt remote jobs or revoke third-party access. Never call it a universal kill switch.
- Do not attempt to restore into a Railway database until its production/test shared-resource ambiguity is resolved.

## 2. Stop-all sequence (owner-operated, after verifying exact scope)

1. Stop accepting new tasks, new agent permission grants and scheduled automation. Preserve the active incident timestamp and scope.
2. For the *A0 staging* ledger, invoke the authenticated stop-all endpoint only if the owner previously configured an authorized staging-only environment. Record control-row receipt. Never copy admin bearer credentials into issue comments or chat.
3. Check all Activepieces SCOTTY flows and pause any newly enabled flow. Do not assume disabled drafts have no separately running code outside Activepieces. Record before/after flow IDs and confirmations.
4. Freeze relevant external send/publish/deploy/payment queues. Owner identifies and revokes the specific third-party credentials if compromise is suspected, using provider admin UI; record revocation and remote receipts.
5. Validate execution workers and deployment origins individually (Railway, Render, Vercel and any local bridge) and inspect existing in-flight tasks. An A0 grant revocation does not cancel already executed remote operations.
6. Establish which data classes may have been accessed; do not expose user/client/private content in incident notes. Escalate to owner/security reviewer, and notify affected parties when policy or applicable law requires it.
7. Preserve immutable metadata evidence (who, timestamp, mission/project, permission, remote receipt and redacted error); establish recovery point and root cause before reopening any workflow.
8. Recovery/opening is a **new scope approval** requiring confirmed credentials, controls, tests and owner authorization; do not automatically re-enable.

## 3. Safe backup procedure — owner approval required

The private `scotty-encrypted-db-backup` repository provides a proposed `pg_dump -Fc` plus `age` encrypted export design. The repository's documentation explicitly states it was not deployed/tested against real Render/R2, requires independent readback/decryption/restore, and keeps the private age key outside the cron service, GitHub and object storage.

For a real backup, first record the exact owner-approved database instance, schema and encryption recipient; verify scoped read permissions and storage credentials only in provider secret settings; confirm data retention and billed resources. Do not reuse the shared Railway testing reference, and do not include plaintext dumps or decryption keys in GitHub. The real export remains separately owner-gated.

**Recovery evidence must include:**
- Source service/database identity and timestamp, backup schema version and row/table counts.
- Encrypted object identifier, object hash/size, retention and access control.
- Proof of separate private-key custody and an owner-controlled download/decryption.
- Isolated disposable destination DB identity, successful archive restore, schema/row-count comparisons, RLS/roles/extensions review, sampled integrity checks and explicit destruction/retention of disposable test data.
- Restore duration and recovery objectives; reviewed deviations; signed owner acceptance.
- Test independent deployment/rollback/revert of application source without changing the original database.

The A0 GitHub Actions synthetic test may prove PostgreSQL export/restore **mechanics** on disposable dummy records. It does **not** prove production backup encryption, retention or successful real-data restoration.

## 4. Incident categories, initial severity and escalation

| Condition | First action | Mandatory evidence |
|---|---|---|
| Unexpected file mutation, outbound send or public post | Stop relevant producer and revoke exact permissions | Resource ID, revision, remote receipt and approval lookup |
| Agent reads outside owner/project grant | Disable principal and stop all new grants | Agent/project IDs and access decision trace |
| Model token/credit or billable usage anomaly | Pause paid providers/automatic retries, alert owner | Task ledger, spend window, provider receipt |
| Lost or leaked key/token | Immediately rotate/revoke through provider, audit exposures | Secret identifier only, rotation timestamp, access logs |
| Backup missing or restore mismatch | Suspend migrations and rollout, investigate backup chain | Source/target hashes, schema and failure record |
| Shared staging/production resources | Abort destructive tests and migrations | Environment IDs, storage service/volume IDs |

## 5. Data handling policy pending owner review

- **Synthetic/public:** test inputs and public references; no external effects without an approved grant.
- **Owner-private:** private notes, appointments, voice/media or account data; default deny and exact access restrictions.
- **Project-confidential:** manuscripts, client contracts, worker records; project membership is mandatory and cross-project access must fail.
- **Third-party restricted:** client data, licensed images/audio, customer communications; verify consent, license, provenance and contractual retention before access.
- No default publish, move/delete, external upload, automated shared-memory promotion or model training on unreviewed content.
- Capture per-resource consent, license, deletion requests and retention schedule with minimum necessary scope; purge/rectification must generate an auditable confirmation without retaining forbidden content.

## 6. Release and resumption prerequisites

Owner verifies the global emergency-stop implementation in **every real executor**, with cross-service and already-running-job behavior; passes an adversarial permission suite; confirms staging/prod isolation, trace evidence, no exposed credentials, real encrypted backup restore, and financial alerts. Only then approve an explicit, limited release and separately sign the Phase 0 exit gate.
