# S.C.O.T.T.Y. Parts 2–4 development verification
Updated: October 18, 2026 Pacific

## Current status
Part 2 implementation and isolated regression verification are complete on staging. Production release readiness remains pending owner-facing staging checks and an approved release plan. The separate production database snapshot restore drill passed. Parts 3–4 implementation is blocked by missing concrete approved specifications.

| Boundary | Verified state |
| --- | --- |
| Production branch | cloud-independent-voice at d8f8ee2d52db192ce0294d42eb91437b657b2ba3; unchanged |
| Staging branch | staging/agent-brains-render-part1 at bd009d62a8624f37e3ff11472e9719031ae5e39a |
| Part 2 PR | #6 merged into staging only under prior explicit approval |
| Current readiness review | review/parts-2-4-readiness-20261018; documentation and branch preview suppression only |
| Production-facing PR #4 | No merge or deployment authorized by this readiness review |

Read-only GitHub checks reconfirmed production/staging heads and PR #6 merge status on October 18. No application feature, production data, credential, schema migration, live owner session, or registry was changed by this review.

## Part 2 behavior preserved and verified
Existing owner-session and default-off feature gates protect administrative routes. Runtime submissions require their separate feature gate and a project-bound credential. Runtime agents can propose pending requests; human approval remains required for delivery, sharing, or execution of sensitive actions. Browser credential issuance remains disabled.

Implemented fixes, preserved on staging:
1. Source-agent membership revocation revokes outgoing project-memory shares as well as recipient shares and credentials. Regranting membership does not resurrect revoked shares.
2. A common project transaction advisory lock serializes collaboration authorization mutations, credential provisioning/revocation, requests, decisions, messages, and shares.
3. Runtime credential validity is rechecked under the project lock before a request is enqueued.
4. Request creation and credential issue/revoke are audited atomically; audit details omit raw tokens and token hashes. Audit GET exposes IDs and timestamps.
5. Owner snapshots expose share IDs and revocation timestamps.
6. Share requests require an approved memory belonging to the source and scoped to the project. Owner review shows the actual memory text, reference, and reviewer. Private and wrong-source memories reject.
7. Handoff title/summary separation uses an actual line break.
8. Additive brain tables initialize before collaboration foreign keys, including a cold collaboration-first open.
9. Roster import no longer deletes existing brain-referenced agents. It serializes initialization, verifies the exact identity set for existing rosters, and preserves matching registry rows and brain/memory data. Changed, partial, or duplicate identity sets reject and roll back.

Matching incoming roster profile changes are deliberately ignored to preserve owner records. Intentional roster/profile migrations require a separate reviewed path.

## Tests and evidence
- Successful final Part 2 code CI: https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39099671456
- 9 unit tests plus 23 disposable PostgreSQL integration tests: 32 passing, zero failures; storage/bridge import checks passed.
- Synthetic fixture contains 128 agents and 12 chiefs. Full registry, brain, and approved-memory snapshots are compared before/after import; concurrent initialization produces one complete roster.
- Covered membership/share revocation and regrant, duplicate concurrent approvals, 25 concurrent submissions capped at 20, reviewed-memory evidence, stale credential rejection, audit failure rollback, cold initialization, owner-session/feature gates, same-origin CSRF, cross-project/impersonation rejection, and roster foreign-key compatibility.
- Earlier local Node 24 syntax and security/evidence smoke checks passed.
- No new code tests were run for this documentation/configuration-only review; prior code results are identified above rather than presented as new results.

The separate private backup verification report records a real production snapshot restore to disposable PostgreSQL 18 with expected table/sequence inventory and 128 agents/12 chiefs. Provider logs confirmed success and runtime cleanup. The owner subsequently confirmed removal of the temporary remote secret, encrypted transfer object, and specified disposable iPad restore artifacts. The original recovery identity and production ciphertext were preserved. Backup/restore execution remains disabled. This closes the previously pending snapshot restore prerequisite; it does not enable ongoing backups or prove application recovery, external-media recovery, or provider-global recovery.

## Parts 3–4 specification recovery
The owner selected the CURRENT agent-brains sequence, not the older October 6 eight-part build.

| Evidence | Finding | Consequence |
| --- | --- | --- |
| PR #3 | Phase 1 isolated agent brains and learning review | Preserve completed foundation |
| PR #4 | Owner-session staging integration targeting production | Preserve; no production merge |
| PR #5 and #6 | Part 2 collaboration plus reviewed fixes on staging | Preserve and release only after remaining checks |
| Current-sequence history | Part 3 labeled Next Development Stage; Part 4 labeled Agent Network Expansion | Labels alone do not define implementation requirements |
| Older October 6 sequence | Agent Matrix and chief hierarchy discussed/reported built | Do not substitute for current Parts 3–4 or rebuild |
| October 18 follow-up retrieval | No exact approved current-sequence feature lists recovered | Requirements remain blocked |

Repository documentation, PR descriptions, earlier spec-path scans, and prior-context searches did not recover specific approved Parts 3–4 feature requirements. An approval to continue does not supply missing feature definitions. No new agents/chiefs, permissions, sharing capabilities, or tool-execution features have been invented or implemented as Parts 3–4.

Required input: the original approved Part 3 and Part 4 feature specifications, or an explicit request to develop a new proposal for owner review. Until then, track the missing requirements separately from completed Part 2 work.

## Deployment readiness and remaining checks
- Owner-facing staging QA: actual owner login/session behavior, project assignments, review queue, scoped memory shares/revocation, and audit visibility.
- Release-specific compatibility/migration review using the existing schema assessment and approved development changes. No production migration is authorized here.
- Trusted runtime credential provisioning and real provider-action execution remain disabled/unverified.
- Snapshot/queue bounds remain: owner queue capped at 100, bounded message/share/audit snapshots; richer pagination and abuse monitoring are limitations, not newly approved requirements.
- Conservative project-lock serialization still needs representative load/latency assessment.
- Ongoing encrypted backup schedule, retention, cost, and credential lifecycle remain separate decisions; the successful snapshot drill does not authorize recurring exports.
- Preserve all 128 agents, 12 chiefs, HUD, Scottish voice, voice and gesture controls, projects, and memories.
- No production merge, deploy, production data/credential changes, or new paid services under this readiness review.
