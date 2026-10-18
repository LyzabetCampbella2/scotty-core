# S.C.O.T.T.Y. Parts 3–4 development status

Date: October 18, 2026, Pacific. Scope: the new proposal v1 approved by the owner for isolated development. This replaces the earlier missing-specification blocker for these new proposals; it does not claim to recover historical specifications.

## Review candidates

| Candidate | GitHub review | Behavior |
| --- | --- | --- |
| Part 3 | [Draft PR 7](https://github.com/LyzabetCampbella2/scotty-core/pull/7), `dev/part3-project-missions-20261018` | Project-linked plans, explicit team and sources, dependencies, revision-bound approvals, reviewed drafts, retained revisions and transactional audit records |
| Part 4 | [Draft PR 8](https://github.com/LyzabetCampbella2/scotty-core/pull/8), `dev/part4-chief-coordination-20261018` | Stacked on Part 3: lead/supporting chiefs, approved cross-chief handoffs, bounded workload claims, review gates, checkpoints/recovery, reconciliation and complete approval inbox pagination |

Both PRs remain drafts and unmerged. Branch preview deployment is disabled. No Render or Vercel deployment, feature activation, production migration, credential update, paid service creation or recurring backup activation was performed.

## Implemented and verified boundaries

- Uses the existing plan, mission, owner-session, collaboration, handoff and workload records. The original HUD runner refuses project-managed plan execution and recovery; its legacy interruption scan leaves those records alone.
- Assigned agents must have current project membership. Chief rank adds no permission. Selected context contains only explicitly selected approved project memories owned by the author or actively shared with that author, including source/reviewer provenance.
- Approvals bind to the exact revision and full-precision membership/share timestamps. Changes to team, purpose, sources, dependencies or coordination require a new reviewed revision. Revocation and regrant cannot resurrect an old approval.
- Every dispatch and draft release checks authorization again within the project transaction lock. Coordinated work also checks current profile project restrictions; profile pause or permission changes hold late output.
- Drafts are never promoted to approved learning automatically. Owner decisions retain review notes and revision history. Optional review points prevent dependent work until the owner releases that draft revision.
- Cross-chief prerequisites link the existing owner-approved handoff for the exact project and source/recipient. The lead chief review depends on the other authors and still requires owner release.
- Step claims and existing workload slots commit together, preventing duplicate claims and respecting existing capacity. Priority controls project queue selection.
- Completed work survives recovery. Known failed internal steps can be explicitly recovered below the reviewed attempt limit. Interrupted/uncertain claims are held for owner reconciliation; no automatic retry or exactly-once external-action guarantee is claimed.
- The existing inbox has project filters, keyset pagination beyond 100 items, pending/unread counts, read markers and membership/evidence blockers. The cursor test covers 137 identical timestamps without duplicates or missing requests.
- The tablet interface selects existing projects by name, project members, approved evidence, prerequisite steps and handoff records. It uses text rendering for user content and the existing same-origin CSRF guard.

## Validation evidence

Part 3 source: `f5756444afd4373997ca233826c54462492d2f09`, [CI run 39159534729](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39159534729). **48 passed, 0 failed**: 12 unit tests and 36 disposable PostgreSQL integration tests; storage/owner-bridge imports also passed.

Combined source: `af84281bb38fc4060de9143b913262f50a0fbfd4`, [CI run 39164481934](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39164481934). **64 passed, 0 failed**: 13 unit tests, 50 disposable PostgreSQL integration tests, and 1 synthetic tablet browser walkthrough; storage/owner-bridge imports also passed. This report is a subsequent documentation-only commit; tested source code is unchanged.

Tests use disposable localhost PostgreSQL 18, synthetic fixtures, stubbed providers and a touch-enabled Chromium tablet viewport. No production connection or runtime secret is loaded. The browser test covers project selection, team/evidence/dependency selection, revision approval, simulated chief coordination, draft release, CSRF headers, content injection protection and viewport fit. Database tests cover competing claims, duplicate decisions/completions, cross-project access, source and membership revocation, sub-millisecond grant changes, pause/resume/cancel, profile restrictions, review gates, ceilings, recovery, reconciliation, audit rollback and legacy bypass attempts.

## Preservation and release status

Read-only branch verification found production `cloud-independent-voice` at `d8f8ee2d52db192ce0294d42eb91437b657b2ba3` and staging `staging/agent-brains-render-part1` at `bd009d62a8624f37e3ff11472e9719031ae5e39a`, unchanged by this work. The diff changes agent workflow code, tests, documentation and preview suppression; it changes no public HUD assets, Scottish voice implementation, gesture controls or legacy memory/workspace modules. SQL tests compare all columns of the 128-agent fixture, including its 12 chiefs, and preserve brain and approved-memory records.

This is a **simulation development candidate**, not a live AI or production release. No real model/tool execution is wired into the new coordinator. Development defaults are 8 steps, 1 attempt per step, 120 seconds elapsed and zero model calls; activation limits still need owner review. Real provider budgets, credential-bound workers and external actions require separate implementation/authorization. Existing voice clients are not newly wired to these mission APIs in this increment; voice/gesture runtime verification remains outstanding.

Before any release: review the draft diffs and additive database initialization, approve an isolated staging deployment/feature enablement, then perform a hosted Safari/iPad owner-login and HUD/voice/gesture walkthrough with synthetic project data. The Chromium viewport check is not a real-device or production compatibility claim. Existing automatic table initialization includes additive mission columns when the legacy runner initializes; default-off feature flags do not replace schema review before deployment.

Final validation: **PASSED for isolated simulation development.** Draft review candidates are ready for code review. Live AI operation and production deployment remain unverified and disabled.
