# Conversational project teamwork — development candidate

This extends the existing Scottish-voice command entry in the original HUD. It does not install a new speech engine, microphone, model, assistant or separate application. Visual controls remain for reviewing text and as an accessible fallback. Speak using the existing armed voice controls; the same commands may also be typed.

## Voice workflow

1. “Scotty, list my projects.” Then “Use project one,” or “Use my writing project.”
2. “Build a project team.” Scotty asks for a goal. Say “Project goal is …” or “Recommend agents for …”
3. Hear existing permitted members and reasons; say “Use agents one and two,” then “Lead chief one.” Names resolve exactly; ambiguous choices are rejected.
4. “List project evidence,” then “Use evidence one,” or explicitly “No project evidence.” “Compare chiefs” requires at least two selected project chiefs.
5. “Save project plan.” Hear the exact goal, project, agents, lead and evidence. Repeat the exact one-use confirmation phrase Scotty gives. Saving, approving and starting are separate actions. These voice plans always reserve zero real model calls.
6. “Read mission progress,” “Choose mission one,” “Approve selected mission,” “Start selected mission,” “Pause selected mission,” “Resume selected mission,” “Reject selected mission,” or “Cancel selected mission.” Each write has its own confirmation.
7. “Read selected draft,” or “Choose draft one,” then “Draft review note is …” and “Release selected draft,” “Reject selected draft,” or “Revise selected draft.” Exact output and revision are checked again before review submission.
8. “Read chief disagreements,” “Read my daily briefing,” “Explain what needs my approval,” “Who's helping with my writing project?” and “Read my weekly project review.” These are on demand, not scheduled background delivery.

## Documents, notes and records

- “List my Google Docs” / “List Google documents matching …” / “Search Google Docs for …”
- “List my Notion pages” / “List Notion documents matching …”
- “Preview document one,” “Share with agents one and two,” then “Attach document.” Provider documents are read-only. Only existing authorized provider resources are listed. Snapshot/source/recipient validation remains server-side.
- “List project sources,” “Preview source one,” then choose recipients and attach.
- “Project note is …,” “Note title is …,” “Share with agents …,” then “Attach project note.”
- “List project evidence,” then “Revoke evidence one,” with a specific confirmation.
- “List agent records,” “Choose record agent one,” “Project lesson is …” or “Project correction is …,” then “Save development record.” Records do not train a model or overwrite instructions.
- “List available agents,” then “Add agent [exact name] to project” prepares one explicit membership grant. It does not share private memories, provision credentials, create agents or grant other projects.
- “List handoff approvals,” “Choose handoff one,” then “Approve selected handoff” or “Reject selected handoff.” Voice reads only the current first page (30); if more exist it says so and retains the complete paginated visual inbox. No blanket approval.

## Confirmation and safety boundaries

- Each pending change binds one project, conversation thread, specific payload and a one-use numbered phrase, expiring after three minutes. A general “yes” cannot approve it.
- A different project command, panel project change, conversation thread change, explicit cancellation or global Stop invalidates pending consent.
- “Repeat project request” reads back the pending change. “Cancel project action” discards it. Cancellation does not undo already submitted requests.
- Confirmation is blocked while Scotty is speaking. Existing microphone capture, echo handling, language settings, Scottish audio queue and gesture code are unchanged.
- Mission approval revalidates both revision and status; draft review revalidates the exact output; source and membership checks remain on the existing server. Changed sources, revoked grants or stale revisions can still reject the operation.
- Same-origin owner cookies and existing CSRF headers protect writes. No background approval, model execution, provider write, credential update or permission inferred from a chief's rank.
- Voice reads text in bounded sections. “Read more project text” continues; untrusted document text is treated as content, not parsed as commands.
- No automatic retries after uncertain writes. Verify current state before attempting again.
- Projects, documents and agents are listed with the first twelve spoken numbers, with exact names usable beyond that. Duplicate names require an unambiguous choice. Large handoff queues still require the paginated visual inbox.
- Physical iPad speech recognition / accent / audio timing must still be checked by the owner. Automated tests inject recognized utterances at the existing HUD command entry; they do not prove microphone recognition.

## Verification and release

19 deterministic voice tests pass locally, covering consent, explicit recipients, thread/project/expiry changes, late responses, mission revision changes, draft output changes, model-off behavior, membership grants, speech-time confirmation blocking and legacy pass-through. Chromium/WebKit and full isolated PostgreSQL regression CI is pending. Separate development branch only; no merge, deployment, production flag/data/credential changes or paid services are performed by this build.
