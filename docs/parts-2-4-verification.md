# S.C.O.T.T.Y. Parts 2–4 development verification
Date: 2026-10-18 UTC / October 17, 2026 Pacific

## Scope and branch boundaries
- Production: cloud-independent-voice, observed at d8f8ee2d52db192ce0294d42eb91437b657b2ba3.
- Existing staging: staging/agent-brains-render-part1 at 01d6769d25c39cf5e53f2db7773f24b2df77afa5 (PR #5 already merged there).
- New work: review/agent-collaboration-part2-verification-20261018, based on that exact staging commit.
- No merge, provider deployment, credential installation, production SQL, data export, or paid resource creation is authorized by this continuation.
- No HUD, voice, gestures, existing agent registry, chief hierarchy, project records, or legacy memory code was edited.
- Vercel git.deploymentEnabled is false for this review branch only, included in its first commit to prevent automatic previews. Production deployment configuration remains unchanged.

## Part 2: reviewed existing behavior
Existing owner-session bridge and default-off feature flag protect administrative routes. Runtime submissions additionally require the second feature flag and a project-bound bearer credential. Browser credential issuance stays disabled.
Existing project grants, owner-mediated messages, pending handoffs, reviewed project memories, recipient sharing/revocation, and decision transactions were preserved.
A runtime can propose a pending handoff; it does not independently deliver or execute tools.

## Part 2: fixes in this review
1. Revoking a source agent now revokes its outgoing project-memory shares, as well as recipient shares and credentials. Re-granting membership does not resurrect old shares. A fresh owner share is required.
2. A common transaction advisory lock serializes project authorization mutations, credential provisioning/revocation, pending requests, owner decisions, messages, and shares. This closes membership-check/write races among these code paths.
3. The runtime's authenticated credential is rechecked under that project lock before enqueue. A credential revoked after HTTP authentication cannot enqueue later.
4. Request creation and explicit credential issue/revoke actions are audited transactionally without storing tokens or token hashes in audit details. Audit records expose IDs and timestamps; the existing audit route now supports GET.
5. Owner project snapshots include share IDs and revocation timestamps so a share can be identified for revocation.
6. Memory-share requests validate that the source owns an approved memory scoped to that project. The owner queue and inbox show its actual text, reference, and approving reviewer before approval. Private and wrong-source memories cannot be proposed through this route.
7. Handoff title and summary use a real line break.
8. Collaboration initializes the additive brain tables before creating foreign keys to them, even when the collaboration inbox is opened first.

## Verification
- Local Node 24 TypeScript syntax checks passed for all downloaded agent-brain modules; private-memory isolation and inbox security/evidence smoke checks passed.
- Initial expanded PostgreSQL 18 CI run passed at b881a483f87bc070eb20d72582b9a4516f7700b9:
  https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39099317078
- CI creates disposable localhost PostgreSQL, seeds 128 synthetic registry entries including 12 synthetic chiefs, and never connects to Render or loads provider secrets.
- Regression coverage: source/recipient revocation and re-grant, duplicate concurrent approvals, 25 concurrent submissions capped at 20, approved-memory review evidence, stale runtime credential rejection, audit failure rollback, and exact fixture roster preservation.
- Existing brain isolation, owner-session/feature-flag checks, learning approvals/rejections, impersonation/cross-project rejection, and production-adapter import checks remain in CI.
- Final code verification PASSED at 31a240945218bb05af633f6b8c50ba30216a4a68: https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39099456523
- Final results: 9 unit tests + 20 disposable PostgreSQL integration tests = 29 passing, 0 failures; adapter/storage import checks passed. This run includes cold initialization and owner-session/same-origin CSRF checks.
- Draft PR #6: https://github.com/LyzabetCampbella2/scotty-core/pull/6 (targets staging only, unmerged).
- Final read-only branch check confirmed production and existing staging heads are unchanged from the SHAs above. Blob comparison confirmed all public HUD assets, voice-service files, voice/gesture/control modules, legacy memory/workspace modules, and src/agents/cloud.ts are unchanged from staging.

## Parts 3–4 specification recovery
The owner selected recovery of the CURRENT agent-brains sequence, rather than the older October 6 eight-part build.

| Evidence | Finding | Implementation consequence |
| --- | --- | --- |
| PR #3 | Phase 1 isolated agent brains and learning review | Preserve completed foundation |
| PR #4 | Render owner-session staging integration; targets production and warns against premature merge | Leave unmerged and untouched |
| PR #5 | Part 2 collaboration and memory-sharing gates, already merged to staging | Review/fix incrementally |
| Current-sequence conversation recovery | Part 3 was described generically as Next Development Stage; Part 4 as Agent Network Expansion | These labels do not define approved features |
| Older October 6 sequence | Agent Matrix and 12-chief orchestration were previously discussed/reported built | Do not reuse as new requirements or rebuild completed work |

No specific approved Parts 3–4 feature specifications were recovered from the current-sequence conversations, repository documentation, main-branch spec-path scan, or available PR descriptions. This is an unresolved requirement, not permission to invent a scope. No new agents or chiefs were added or renamed.

## Deployment readiness and remaining issues
Part 2 is a tested development candidate, not production-ready.
- Current production data, real agent IDs, live owner-login browser behavior, and actual project/memory compatibility have not been inspected or changed.
- A verified production backup and isolated restore of its real archive remain required before release. The separate encrypted backup service built successfully but remains execution-disabled with no DB/R2 credentials.
- No trusted runtime secret provisioning or real provider-action execution has been enabled.
- The owner queue still caps results at 100 and shares/messages/audit snapshots are bounded; richer pagination and abuse monitoring remain documented limitations, not completed features.
- Project-lock serialization is intentionally conservative; load/latency testing remains pending.
- The source still uses additive CREATE TABLE initialization. Production schema/permissions review and any migration execution require separate approval.
- The existing legacy roster import uses delete-and-reinsert. Once additive brain rows reference roster IDs, its compatibility with foreign-key restrictions must be verified before enabling Part 1/2; this review deliberately does not rewrite that legacy importer.
- Review and merge, hosting, any credential setup, feature enablement, production data access, and ongoing backup scheduling each remain approval-gated.

