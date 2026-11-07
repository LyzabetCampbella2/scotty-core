# Stage A / Phase 0 — Identity, Authority & Recovery (owner review draft)

Status: **DRAFT — NOT OWNER-APPROVED, NOT AN ENFORCED RUNTIME POLICY**  
Source: SCOTTY Agent Master Build Checklist, November 7, 2026, page 4.  
Scope: SCOTTY overseer + the 185 canonical development profiles. Optional creative-media roles are out of scope until separately approved.

## 1. Baseline recorded 2026-11-07

A read-only audit of the project's *Public Agent Registry (Draft)* Activepieces table returned:
- 185 records, 185 unique canonical IDs; 25 chiefs, 160 specialists, 25 departments.
- Every specialist pointed to an existing chief in its own department.
- No blank required ID/name/department/chief relation; no duplicate display names in this export.
- Some inherited display names do not describe their specialties. **IDs MUST NOT change** to fix display names. Record each proposed alias and owner sign-off.
- The Activepieces project had 24 flows, all disabled and unpublished; 17 data tables; **zero app connections** at audit time.
- No evidence of 185 independently callable certified live agents. Preview/demo flows do not qualify.

These observations are a point-in-time audit, not proof that the roster is frozen, approved, persisted in SCOTTY's production datastore, or available to other runtimes. Review the source table and export before sign-off. Do not put private content, secrets, connection IDs or access tokens in GitHub.

## 2. Authority rules (design requirements, NOT yet implemented)

SCOTTY requests owner approval **before every NEW task or project**. Approval to continue an already-authorized, bounded task does not authorize changing project, mission, revision, account, resource, data class, external channel, destination, or action category. New tools, private-file reads, sends, posts, deployments and spending require separate owner confirmation. Proposed actions and actual executions must have distinct states.

**Access tiers** (each requires a uniquely scoped grant except synthetic planning):
- P0 — offline proposal / synthetic draft (default).
- P1 — public information read, source-limited.
- P2 — owner-private or project-confidential read with approved exact collection/file scope.
- P3 — non-destructive file creation/edit with approved target IDs, version and rollback.
- P4 — direct messages/email with approved recipients, exact draft and account.
- P5 — public posting/publishing with approved channel, exact media revision, rights and content.
- P6 — deploy/merge/infrastructure change with explicit environment, commit, tests and rollback.
- P7 — spending, billing, payments, new paid resources, secret/role administration: **separate exact-action approval**.

**A P0–P6 permission never implies P7**; no inferred approvals. Agent-to-agent delegation cannot grant higher privileges. Reject unapproved actions, even when a model asserts the owner authorized them.

A server-side grant record MUST include `grantId`, owner identity, `agentId`, `taskId`, `projectId`, allowed action type, exact `resourceId`/account/channel, revision, data class, issue and expiration timestamps, usage cap, revocation state, approval evidence and a unique idempotency key for mutations. Enforce server-side from authenticated owner sessions, not agent text or browser-only flags. Do not reuse approval for a new task.

## 3. Data classification and minimization

| Class | Examples | Default |
|---|---|---|
| SYNTHETIC_PUBLIC | synthetic test inputs, public references | Only plan/draft with no external side effects |
| OWNER_PRIVATE | personal schedules, unreleased assets, owner memory | Deny until P2 scoped grant |
| PROJECT_CONFIDENTIAL | manuscripts, contracts, client or worker work | Deny; restrict project membership and purpose |
| THIRD_PARTY_RESTRICTED | client correspondence, licensed files, external sensitive content | Deny; require provenance, consent and exact scope |

Media remains in its original storage. Use metadata-first indexing and copy-first non-destructive transformations. No default deletion, relabeling, external upload, model training, automatic durable memory promotion or redistribution. Capture consent/license/retention/deletion terms per data type. Keep drafts separate from reviewed facts.

## 4. Budget and execution safety

Until the owner specifies dollar/token/credit ceilings, **$0 newly authorized spending**, no paid provider calls, no new billable resources, and no automatic external writes. Proposed implementation fields: per-task token cap, per-task USD cap, daily USD cap, concurrency cap, rate cap, idempotency, timeout and retry cap. Default zero retries for external mutations, at most one for safe reads *after* approval. Real enforcement and billing alerts remain unverified.

Require a tested, owner-operated *stop-all* control covering queues, scheduled flows, execution workers, credentials and pending sends. A stop switch is **not considered implemented by this document**; emergency shutdown must be rehearsed before launching.

## 5. Inventory & environment boundaries

| Source / component | Current point-in-time status | System-of-record decision pending |
|---|---|---|
| Activepieces Public Agent Registry (Draft) | 185 profiles; counts/links audited | Owner must designate authoritative canonical ID source |
| Activepieces flows/tables | 24 disabled/unpublished flows; 17 staging tables | Keep previews isolated from production execution |
| Activepieces app connections | 0 | Each connection needs independent owner OAuth approval |
| `scotty-core` GitHub repository | Existing modular app and staged agent APIs | Verify authoritative branch and production routing |
| SCOTTY backup repository | Dedicated backup implementation/reference | Confirm exact backed-up DB, object and isolated restore |
| Render / Vercel / Railway | Existing references; environment routing not fully verified | Map active deployments and secrets in a private admin record |
| D1 / Neon / Supabase | Named in master checklist; current authoritative assignment unverified | Confirm exact project/database, retention and RLS in private register |
| Creative media six-profile extension | Optional staging profiles | Keep distinct from the 185 pending owner approval |

No production credentials in source code, prompts, exports or public issues. Separate dev, staging and production tokens and databases. Do not make production writes while conducting Phase 0 checks.

## 6. Reliability, backup and incident gates

- Inventory protected resources and create an encrypted backup of source/schema/memory **only after owner grants exact permissions**.
- A successful upload/hash HEAD response alone does **not** verify recovery. Download, decrypt and restore an encrypted snapshot to an **isolated disposable** database; compare schema, row counts and hashes. Preserve a restore evidence record.
- Confirm recovery-key custody outside GitHub/automation and verify version rollback independently. Do not change existing production backup flags without separate approval.
- Define alerting, owner escalation, suspension, credential revocation, cost anomalies, security incident records and deletion requests.
- Each permitted action needs an append-only evidence event: actor, owner approval, action, time, data class, resource ID, input revision, output/remote receipt, cost, failure/rollback, and permission grant. Never place secrets or restricted content into the evidence event.

## 7. A0 acceptance checklist (NO unchecked item is complete)

- [x] Read-only 185-record structural count and references audited at source.
- [x] Activepieces flow/table/connection baseline inventoried.
- [ ] Canonical registry exported, reviewed and **frozen with owner's signature**.
- [ ] Legacy display-name/alias migration approved, IDs unchanged.
- [ ] One authoritative system of record chosen for each data type and deployment.
- [ ] Server-side scoped grants/expiry/revocation and stop-all implemented and tested.
- [ ] Data classification, consent, rights, retention and deletion approved and tested.
- [ ] Task/daily spend ceilings and billing alerts signed off and enforced.
- [ ] Dev/staging/prod resource separation evidenced.
- [ ] Source/schema/encrypted-memory backup and isolated restore rehearsed.
- [ ] Owner signs identity register, privilege policy, backup result and budget ceiling.

**Exit decision: BLOCKED.** No production activation, new connected app permission, automatic posting, memory migration or paid action is authorized by this document.

## 8. Additional implementation evidence (2026-11-07)

- Added isolated pure evaluator: `src/security/approval-gate.mjs`. Its interface is intentionally side-effect-free; it returns only a **provisional** decision and **requiresAtomicClaim=true** for permitted requests.
- Added 34 independent test cases in `src/security/approval-gate.test.mjs`; all 34 passed locally with Node.js 22 using `node --test src/security/approval-gate.test.mjs`. GitHub CI has **not** been verified for these tests.
- Added `docs/stage-a0-environment-inventory.md` with read-only observed systems and unresolved source-of-truth questions.
- The evaluator does **not** yet authorize live operations. Before any runtime use, integrate authenticated owner identity, trusted server-side grant loading, atomic grant consumption/idempotency/cost reservations, append-only audit and stop-all state; prove cross-process/restart behavior and fail-closed tests.
- Local test results do not satisfy the A0 exit gate, an end-to-end permission test, live provider evaluation, recovery restoration or owner sign-off.
