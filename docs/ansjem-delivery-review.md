# ANSJEM additions 5–9

These additions extend the approved request and agreement records from additions 1–4. They preserve the existing HUD, voice transport, roster, project data and scoped memories.

| Addition | Behavior |
| --- | --- |
| 5. Staffing and capacity | Recommend existing project members from recorded specialties. Show live execution claims, other planned ANSJEM assignments and each profile's limit. Save named roles, deliverables and reasons only after review. Busy agents require a capacity acknowledgment; paused or unauthorized agents cannot be assigned. |
| 6. Acceptance evidence | Assess each agreed criterion as met, unmet or not verified. Record reviewer, date and supporting URLs or approved project evidence IDs. Revalidate approved evidence at acceptance; changed or revoked sources become unverified. |
| 7. Delivery handoff | Submit an exact version, artifact links, outcome, testing, limitations and remaining work. Operational handoff fields cover deployment, prerequisites, recovery, post-release checks, monitoring, support and maintenance. Read or download a plain-text handoff record. |
| 8. Acceptance desk | Accept or request corrections against a particular delivery fingerprint and current request revision. All criteria need current evidence marked met for acceptance. Corrections identify criterion IDs. Changed assessments require resubmission. Acceptance never authorizes production release. |
| 9. Scope changes | Propose revised requirements with reason and scope, timing, risk and budget impacts. Keep the existing commitment active until the receiving team response and requester agreement both refer to the same proposal. Applying it creates a new revision and resets staffing, evidence assessments and acceptance; earlier deliveries remain in the audit history. |

## Boundaries

Staffing records are plans, not execution reservations or model runs. These tools neither grant project membership nor start agents. Recommendations do not change data. No external system is contacted for artifact or evidence URLs. Evidence assessments and team responses are owner-entered records with explicit source references; they do not authenticate a remote team or independently verify external findings. No emails, account connections, paid services or credentials are created.

Owner authentication, same-origin checks, CSRF protection, explicit review, optimistic versions, project locking, transactional audit records and idempotent command IDs remain in the existing ANSJEM API. Each change increments the work version. Retrying the same command returns its prior result; conflicting input is rejected. Review previews are discarded on project changes and expire after three minutes.

The additive `scotty_ansjem_delivery` table stores per-work revision state. Existing ANSJEM columns are unchanged. Initialization is gated by `SCOTTY_ANSJEM_DELIVERY_ENABLED=true` and occurs alongside the existing request tables. The default is off; additions 1–4 continue to work when it is off. The delivery flag does not enable real project drafting or alter release authorization.

## Voice and tablet use

Choose an existing project and ANSJEM work item first: read the development board, then say “choose ANSJEM work one.” Commands include:

- “Recommend agents for this ANSJEM work.”
- “Plan ANSJEM staffing with agents one and two.”
- “Prepare ANSJEM criterion assessment.”
- “Prepare ANSJEM delivery.”
- “Explain ANSJEM acceptance readiness.”
- “Read ANSJEM handoff.”
- “Prepare ANSJEM acceptance.”
- “Prepare ANSJEM scope change.”
- “Read ANSJEM scope changes.”

Scotty asks one question at a time and stages a readback with a unique “confirm ANSJEM change N” phrase. A generic yes does not save. Speech echo, a different project or conversation, expiry and cancellation cannot confirm the staged change. The existing Scottish speech transport remains in use. Full scope editing, approved evidence ID selection and recording both parties' scope responses are also available in the tablet workspace.

## Verification and release

The isolated suite covers PostgreSQL state transitions, current source checks, stale decisions, capacity and membership limits, scope agreement, rollback on audit failure and roster/memory preservation. Synthetic tablet flows run in Chromium and WebKit, alongside prior HUD, project and voice regression tests. Node voice tests cover exact confirmation, cancellation and stale context.

This branch disables Vercel preview deployment. Publishing its PR does not merge, deploy or enable the new production flag. Production activation requires an approved core-only release, the additive table initialization and owner-session smoke checks. Browser tests simulate tablet interaction; actual iPad audio still requires a physical-device check.

Verified on October 19, 2026: **209 passing isolated checks** (21 unit, 45 Node voice/gateway, 105 PostgreSQL and 38 browser checks). Both Chromium and WebKit passed the five new delivery review flows. Production router/storage imports also passed. The deliberate audit-failure exceptions in database logs are rollback fault-injection checks, not failed tests.
