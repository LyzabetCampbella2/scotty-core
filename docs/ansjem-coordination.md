# ANSJEM additions 10–15

Source: *Ellie's ANSJEM Development Onboarding Package*, a proposed working agreement. These controls record explicit owner decisions; they do not appoint organizational roles, grant infrastructure permissions or adopt the agreement on anyone's behalf.

| Addition | Implemented behavior |
| --- | --- |
| 10. System ownership and authority directory | Per-project affected-system directory, accountable owner, maintenance and incident contacts; per-work delivery, acceptance, release and leadership contacts. Acceptance owner stays consistent with the agreed request. A system owner changes only with written receiving-owner acknowledgment and transfer date. Directory versions prevent stale overwrites. Future-effective transfers leave the current owner accountable; record the transfer on or after its effective date. Updating a contact preserves an existing transfer acknowledgment. |
| 11. Release readiness review | Check current accepted delivery, evidence freshness, assigned roles, affected-system ownership, operational handoff, access readiness and blocking issues. Readiness digest binds these exact records. Separately record the designated authority's decision; this never performs a deployment. Externally performed release results require the exact delivered version, release owner and post-release verification. Not-applicable releases require a reason and explicit authority record. |
| 12. Blockers and disagreements | Record findings, conflicting recommendations, affected systems, options, unresolved questions and next action. Technical matters route to the acceptance owner, priority/budget/resources/risk to leadership, and production/security incidents to the incident contact. Prepare an escalation packet; no notification or message is automatically sent. Assigned-owner resolution is source-linked. Open blocking issues prevent release and closure. |
| 13. Weekly coordination briefing | Current project priorities, requested/committed dates, late work, dependencies, decisions, pending acceptance, maintenance acknowledgment and agent capacity. Includes work links, project-wide status totals, seven-day activity and explicit pagination. Pacific calendar boundaries handle daylight-saving changes. It is an on-demand snapshot; no recurring job is enabled. |
| 14. Maintenance acknowledgment and closure | Record retained/transferred responsibility, documentation and access confirmation, obligations and support scope/duration. Transfers require written system-directory acknowledgments. Closure requires accepted current evidence, explicit release authorization or not-applicable decision, applicable verified release and current maintenance acknowledgment. Closed records are immutable. |
| 15. DEV workflow connection controls | Prepare only explicitly selected request/status/handoff sections for a named recipient and purpose; review/download the packet. Preview an external update, then save it only with an exact digest and source record. External updates do not override local scope, agreements, work status, acceptance or permissions. Manual receipts remain unsynchronized. |

## Item 15 connection status

**Live DEV synchronization is not connected.** The other system's interface, authentication and scoped permissions have not been supplied and verified. The exchange controls and proposed contract are implemented for review and manual interoperability. An owner-entered receipt is not a verified remote acknowledgment. No network client, endpoint guessing, credential collection, outbound message or automatic remote write is enabled.

The proposed versioned JSON contract is `scotty.ansjem.exchange.v1`. It is not claimed as an existing remote API. Outgoing snapshots contain a generated message ID, project/work/revision identifiers, selected `sections` and an allowlisted `payload`:

- `request`: title, outcome, scope, exclusions, deliverables, agreed criterion definitions and requested date.
- `status`: local work/release status, current progress, delivery owner and committed date.
- `handoff`: exact version, artifact links, testing, limitations and remaining work. Approved evidence bodies, private memories, personal folders, account credentials and operational access details are excluded.

Incoming updates accept only `protocol`, stable `messageId`, exact `projectId`, `workId`, `revision`, `kind` (`request`, `status` or `handoff`), `status`, `note` and up to ten HTTP evidence `links`. They are reference updates, not executable requests or authoritative delivery acceptances. Other fields and mismatched context are rejected. The preview hash binds normalized fields; reused remote IDs with conflicting content are rejected. These direction-specific schemas must be agreed with the DEV implementer before an authenticated adapter is added. Remote URLs are never fetched here.

## Data and controls

New flag: `SCOTTY_ANSJEM_COORDINATION_ENABLED=true`, default off; also requires the existing ANSJEM work and delivery flags. Adds `scotty_ansjem_coordination` and `scotty_ansjem_systems` beside existing tables. Initialization is gated; existing columns and roster/memory rows are unchanged. Directory updates and work changes share the project lock and work event/audit transaction. Work versions, command IDs, explicit review, same-origin/CSRF checks and existing owner authentication remain in force. Scope revision resets current authority, release and maintenance decisions while preserving them in earlier work events and retaining the project directory. Open issues carry forward for explicit resolution; old exchange packets are labeled superseded by the new revision and cannot receive a current transfer receipt.

No release API calls Render, changes credentials or changes service plans. `authorized`, `deployed`, `verification_failed` and `rolled_back` describe explicit owner records. Changed directory entries, roles, issues, accepted sources or delivery invalidate readiness, authorization and maintenance snapshots. Re-review before continuing. Readiness with gaps may be saved for planning; it cannot authorize a release. Recording another readiness review clears authorization and maintenance acknowledgment.

Weekly capacity shows current project members, live claim counts, project-local planned ANSJEM assignments and profile limits. Plans are not execution reservations. The briefing is a current snapshot with seven-day activity, not a historical reconstruction. It paginates up to 100 work records at a time (12 per spoken page) and returns project-wide totals separately; request all pages to review every item.

## Voice and tablet controls

Choose an existing ANSJEM work item for work-specific commands:

- Read ANSJEM ownership / release readiness / blockers / maintenance / DEV exchange.
- Prepare ANSJEM authorities / system ownership / release review / release authorization / release result.
- Prepare ANSJEM blocker / issue resolution / maintenance acknowledgment / closure / DEV packet.
- Read ANSJEM weekly briefing; read more ANSJEM weekly work. Only project selection is required for these briefing commands.

Each write asks one question at a time and reads the complete proposal before a unique `confirm ANSJEM coordination N` phrase. Generic yes, speech echo, expired context, project/thread/work changes and cancellation do not save. `cancel ANSJEM coordination`, `repeat ANSJEM coordination question` and global stop remain available. Existing Scottish speech transport is reused. Full exchange JSON previews, manual receipts and rich source editing are available in the tablet workspace.

## Verification and activation

Isolated PostgreSQL checks cover ownership transfers, stale reviews, authority/version binding, operational checks, maintenance/closure, blockers, source revocation, scope reset, transactional rollback, idempotency, exchange allowlists/conflicts, project pagination and roster/memory preservation. Synthetic Chromium/WebKit tablet checks and Node voice safety checks run beside the existing suite. These do not prove physical iPad audibility or live remote interoperability.

Branch preview deployments are disabled. Production merge, deployment and feature activation require a separate explicit approval of this release. No production configuration or data was changed while building this branch.
