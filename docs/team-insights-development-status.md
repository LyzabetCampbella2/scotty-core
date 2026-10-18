# S.C.O.T.T.Y. chief reviews and team insights

Date: October 18, 2026. Development branch: `dev/team-insights-20261018`. Review: [draft PR #12](https://github.com/LyzabetCampbella2/scotty-core/pull/12), stacked on the project operations work in PR #9.

## What was built

| Feature | Behavior |
| --- | --- |
| Chief review and disagreements | The owner selects at least two existing project chiefs, approved evidence and a lead chief. Independent chief reviews precede the lead comparison. Exact cross-chief handoffs must already be approved. Each real review returns a qualified recommendation, attributed contradictions and open questions. Output stays an unverified draft until owner review. |
| Voice-controlled teamwork | Existing voice navigation recognizes “Who's helping with my writing project?”, “Explain what needs my approval”, and “Read my weekly project review”. It resolves an authorized project by name or the selected HUD project, asks for clarification on ambiguous/missing context, and speaks through the existing conversation output. Commands perform GET requests only. They do not approve work, start missions or change voice settings. |
| Agent development records | Current project members show recorded specialties, owner-approved project lessons, owner-entered lessons/corrections, review corrections and owner-released mission work with links. Saving a development record requires explicit owner consent and creates an audit entry. Optional mission/step references must belong to that project and assignee. These records do not retrain models, alter instructions or automatically write memories. |
| Weekly project review | On-demand rolling seven-day view shows recorded activity, recently updated missions, unfinished commitments, overdue tasks and suggested next steps linked to actual missions or approvals. It is a read-only report; no recurring delivery is activated. Updated time is not presented as a completion timestamp. |

## Using the development UI

Open Project teams & briefing in the HUD after the existing owner login and feature flags permit it. For a chief comparison, select only relevant current chiefs in Build a project team, choose the lead and approved evidence, check Chief comparison, and save for revision review. Real comparisons additionally require a reviewed real-draft budget and separately enabled provider controls. The collaboration inbox remains the place for cross-chief handoff approval.

The weekly review and agent development panels load only when requested. Mission links preserve project selection and focus the actual mission card. Project changes clear the development consent and form. Voice responses use the current project context, retain existing conversation cancellation tokens, and do not select a replacement accent or TTS service.

## Permissions, data and compatibility

- Uses existing brain, mission, operations and coordination flags, owner authentication, same-origin CSRF protection, project grants, evidence snapshots, revision approvals and bounded model-call reservations. Live model generation stays disabled unless explicitly enabled through existing controls.
- Adds only `scotty_agent_development_records`; existing roster, brain, memory and project data are not rewritten. Lessons/corrections are project-bound append-only owner-approved records.
- Chief comparison structure is retained in mission results and included in prerequisite review context. Unknown or invented source attribution fails validation. Private/reference-only sources remain unavailable for citations.
- Agent views currently show bounded current mission revisions: up to 100 missions, 200 development records and 200 approved project lessons. Older revisions remain in the existing mission history. There is no numeric “intelligence” score or claim of measured model improvement.
- Weekly activity is bounded to 200 audit events and 100 current missions. It reports the recorded state, not continuous agent activity or live connected-app freshness. Existing app information remains labelled snapshots/references.
- The sidebar change adds one early dispatch to the scoped teamwork handler; the Scottish voice pipeline, original microphone, gesture and canvas handlers remain in place. Real audio on the owner's iPad still needs a walkthrough after any approved staging activation.

## Validation and readiness

Validation runs only in the isolated CI workflow using synthetic fixtures, disposable PostgreSQL 18 and stubbed model responses. Tests cover approved cross-chief handoffs, retained disagreement and questions, source attribution, consent, project/assignee references, revoked membership, weekly time/project boundaries, work links, authentication/CSRF and preservation of all 128 agents (including 12 chiefs), brain records and approved memories. Tablet browser tests cover review panels, explicit record consent and existing voice-router dispatch without mutation requests.

Final tested source: `7781d919889b333cb07a4298642b778bf9aabc71`. [CI run 39172370190](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/39172370190) completed successfully with **96 passed, zero failed**: 18 unit checks, 72 disposable PostgreSQL checks and six Chromium browser checks, plus storage/bridge import checks. The initial run stopped on a test-fixture syntax error; the corrected fixture and full suite passed on this source. No live provider calls were made.

After validation, production `cloud-independent-voice` remained at `d8f8ee2d52db192ce0294d42eb91437b657b2ba3` and staging `staging/agent-brains-render-part1` remained at `bd009d62a8624f37e3ff11472e9719031ae5e39a`. PR #12 is draft, open and unmerged, stacked on PR #9. The subsequent documentation commit records these results without changing tested application code.

This remains a draft review candidate. No merge, deployment, production data migration, credential update, paid service creation, recurring schedule or backup activation was performed. Preview deployment is disabled for this branch. Review the stacked dependencies and additive schema before activation; physical iPad/Safari and live-provider validation remain outstanding.
