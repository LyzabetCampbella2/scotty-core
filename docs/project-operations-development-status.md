# S.C.O.T.T.Y. project operations development status

Date: October 18, 2026. Review candidate: [draft PR #9](https://github.com/LyzabetCampbella2/scotty-core/pull/9), branch `dev/project-operations-20261018`, stacked on the Part 4 development branch. This implements the four owner-requested additions; it does not replace historical specifications or claim production activation.

## Implemented behavior

| Requested feature | Development implementation |
| --- | --- |
| Real project teams | Recommends existing project members using their recorded specialty, goal fit and current workload eligibility. Explains recommendations; owner edits the team and selects a permitted chief. Saves a revision-bound plan for explicit approval. Internal draft execution uses the existing Groq provider adapter when separately enabled. |
| Daily chief-of-staff briefing | On-demand project briefing lists overdue and upcoming tasks, mission blockers, pending decisions and handoffs, and saved project-linked calendar/document snapshots. Shows data gaps and snapshot freshness. No live connected-app fetch or recurring delivery is configured. |
| Mission progress in the HUD | Optional owner-only drawer shows authors, step states, deliverables, retained drafts, citations, blockers, approvals and reserved call/output budgets. Includes approve, start, pause, resume, generate and review actions. The production router explicitly serves the drawer's JavaScript asset. |
| Project evidence workspace | Owner previews and approves document/note/reference snapshots for explicit current project recipients. Plans select approved evidence; findings retain supplied source IDs and missing-evidence notes. Edited/deleted sources or revoked/regranted memberships invalidate the old authorization. Reference-only links cannot substantiate findings. |

The mission editor retains evidence selections and reviewed generation limits when revising a plan. Revisions require their own approval. Model output remains an unverified draft until owner review; it is not automatically promoted into memories or external actions.

## Boundaries and runtime controls

- Existing owner authentication and project membership checks apply. Chief rank adds no permission. Evidence approval never grants project membership.
- Existing brain and mission flags remain required. New operations UI/API requires `SCOTTY_PROJECT_OPERATIONS_ENABLED=true`. Real generation additionally requires `SCOTTY_REAL_PROJECT_DRAFTS_ENABLED=true`, chiefs coordination enabled, and the existing `GROQ_API_KEY`. No credential value is included here.
- Real calls default off. The prepared real-plan limits are one attempt per step, 120 seconds per mission, up to one call per planned step, 16,000 input characters per call and 800 output tokens per call. Server validation caps calls at eight. The provider timeout is at most 45 seconds or the remaining mission deadline.
- Claims and call/output reservations are transactional. Concurrent requests cannot exceed the reviewed call budget. Uncertain provider outcomes require owner reconciliation; there is no automatic retry. Revocation or pausing during a provider call holds the returned output.
- Displayed output-token usage is reserved capacity, not measured provider billing. Test providers are injected stubs; no live model request was made for this work.
- Briefings are project scoped, with bounded lists of up to 100 tasks, mission records and saved app snapshots. They do not represent an account-wide live inbox or a scheduled notification service.
- Evidence URLs are references only; the feature does not fetch arbitrary remote URLs. Existing source text must be explicitly approved for its recipients.

## Preservation and validation

The isolated PostgreSQL suite uses a guarded disposable localhost database and synthetic fixtures with 128 agents including 12 chiefs. Integrity assertions compare the entire roster, brain records and approved memories before and after operations. Tests exercise recipient scope, edited-source invalidation, membership revocation/regrant, disabled generation, selected-context drafting, citations, concurrent budgets, prompt bounds, uncertain outcomes, owner-only API access and project-scoped briefings.

Tablet Chromium tests exercise evidence approval, editable team creation, owner approvals, disabled generation controls, HUD drawer isolation, and mission editor evidence/budget preservation. Existing Parts 2–4 tests remain in the same combined workflow. The HUD retains its existing canvas, Scottish voice and gesture code; its source change is an optional script include plus the dedicated static asset route. Physical iPad/Safari and live provider validation remain outstanding.

Final tested source: `25e19a41a67bcbd403adc02faec6dfdf930a707c`. [Isolated CI run 39171546730](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39171546730) completed successfully: **84 passed, zero failed** (17 unit, 63 PostgreSQL integration, four browser checks), plus storage/bridge import checks. The preceding implementation passed 82 checks at `dba7e5cd5c22bbe6c689fb1ef97005fc42766fca` in [run 39166757842](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39166757842).

Production `cloud-independent-voice` remained at `d8f8ee2d52db192ce0294d42eb91437b657b2ba3`; staging `staging/agent-brains-render-part1` remained at `bd009d62a8624f37e3ff11472e9719031ae5e39a` when rechecked after final validation. PR #9 remained draft, open and unmerged.

## Readiness

This is a draft review candidate, not an activated production feature. Review the stacked Parts 3–4 dependency changes, additive schema initialization, source permissions and budget choices before any activation. Perform a staging Safari/iPad walkthrough and an explicitly approved bounded live-provider smoke test before claiming live readiness.

No merge, deployment, production migration/data mutation, credential update, paid service creation or backup activation was performed by this development task. Preview deployment is disabled for this development branch.
