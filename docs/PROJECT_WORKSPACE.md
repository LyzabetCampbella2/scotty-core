# SCOTTY Project Workspace API (feature branch)

This is a staged backend + HUD foundation for four capabilities. The first owner-facing screen is available at `/projects` in the SCOTTY HUD preview.
- **Project teams:** team membership is restricted to the existing `scotty_agents` roster. Goal-based suggestions are transparent keyword matches over existing agent profiles; they are not represented as an AI judgment.
- **Chief-of-staff briefing:** the project overview groups blocked missions, due-soon work, pending approvals and review items with missing approved evidence.
- **Mission progress:** missions persist assignment, status, blocker, due date and draft output. Moving a mission to `review` creates a pending approval item.
- **Evidence workspace:** evidence is project-scoped and starts unapproved. Only explicitly approved evidence is treated as authoritative.

## Safety defaults

- Feature flag `SCOTTY_WORKSPACE_ENABLED` must be set to `true` before routes respond.
- Requests require the existing owner session cookie (`scotty_owner_session`, verified server-side against `SCOTTY_BRAIN_OWNER_SESSION_TOKEN`) or a server-to-server bearer token (`SCOTTY_WORKSPACE_ADMIN_TOKEN`; `SCOTTY_BRAIN_ADMIN_TOKEN` is a temporary fallback). Never place the bearer token in browser code.
- Cookie-authenticated writes require `X-Scotty-CSRF: 1`. Browser origins must match the server origin, configured `SCOTTY_WORKSPACE_ALLOWED_ORIGINS`, or the documented SCOTTY HUD Vercel preview pattern.
- `DATABASE_URL` must point to the intended non-production/test database during validation.
- No external provider is called by this module. It does not publish or send drafts.
- Project child reads and writes are filtered by project ID.
- Do not enable this on production until the HUD integration, authentication model, migrations, and cross-project isolation tests have passed.

## Routes

- `/projects` — owner-facing workspace UI for project teams, briefing, mission status, approvals and evidence.
- `GET /api/workspace/projects`
- `POST /api/workspace/projects` — `{ "id": "my-project", "name": "My project", "goal": "..." }`
- `GET /api/workspace/overview?projectId=my-project`
- `GET /api/workspace/recommend?projectId=my-project&goal=...`
- `POST /api/workspace/projects/:projectId/team` — `{ "agentId": "existing-roster-id", "assignment": "..." }`
- `POST /api/workspace/projects/:projectId/missions` — `{ "title": "...", "goal": "...", "agentId": "...", "dueAt": "...", "requiresApproval": true }`
- `PATCH /api/workspace/projects/:projectId/missions/:missionId` — `{ "status": "working|blocked|review|done", "blocker": "...", "outputMarkdown": "..." }`
- `POST /api/workspace/projects/:projectId/evidence` — `{ "title": "...", "sourceUri": "...", "sourceType": "document|note|url", "excerpt": "..." }`
- `POST /api/workspace/projects/:projectId/evidence/:evidenceId/approve`
- `POST /api/workspace/projects/:projectId/approvals/:approvalId` — `{ "decision": "approved|rejected", "note": "..." }`

## Not yet complete

This branch is the API/data foundation, not a finished end-to-end release. The HUD has not yet been connected to these routes, live agent execution has not been wired to mission assignment, and integration-specific evidence importers/automatic scheduled briefing delivery are not implemented. The Vercel HUD source repository must be located and updated separately. Do not claim a feature is live until the preview build and end-to-end checks succeed.
