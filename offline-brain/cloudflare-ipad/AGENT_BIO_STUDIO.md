# Agent Bio Studio — isolated SCOTTY development

**Status:** draft, not deployed, no production access, no automatic migration.

## Owner-specific project categories

The reviewed migration seeds project *labels* only: Eirden Atelier, Bloodpool Trilogy,
Golden Hour Creative, SCOTTY AIOS, and Learning & Coursework. The owner can create
more public/synthetic project labels through the authenticated interface.

No private manuscripts, user memories, production files, client data, contact lists,
secrets, model-generated findings or project source excerpts are inserted into
agent portfolios. Do not record sensitive details in project names, focuses or
assignment titles. Project entries are metadata, **not** authorization grants.

## Agent biography structure

All 185 agent identities (25 chiefs and 160 specialists), plus SCOTTY oversight, can show:

- Brain profile: department, specialist role, reporting line, methods and review policy.
- Assigned projects: persistent owner-approved project links.
- Activity timeline: owner-approved project / question / mission assignment metadata.
- Suggested partners: deterministic complementary specialties and chief reviewers;
  explicitly marked as **recommendations**, never fake work history.
- Co-assigned teammates: people listed on the same project. This does **not** prove
  they collaborated.
- Verified collaborators: agents in the same **durably verified** executed mission
  checkpoint, not merely people nominated to a proposed team.

The `/api/plan` route only proposes agents and writes no activity.
Owner-approved manual activity is never confused with an executed AI mission.
Live completed/incomplete missions record **actual result stages only** after
checkpoint readback. Single-agent AI questions log a generic question label,
not the submitted question text. These records do **not** promote new
findings into agent knowledge.

## Required owner-reviewed migration

1. Review `agent-portfolio-v1.sql` carefully.
2. Confirm the target is the isolated Cloudflare D1 binding `BRAIN_DB`
   on `scotty-independent-ipad-brain-lab`, and **not** Render/production PostgreSQL.
3. Take an approved isolated D1 backup/export before applying it, if that
   deployment exists. Never create a paid resource to do so.
4. Apply the SQL **once to that isolated D1 database** using Cloudflare's
   authenticated admin console or reviewed migration workflow.
5. Verify `GET /api/status` reports `agentPortfolioReady=true`;
   otherwise bio endpoints fail closed with 503.
6. Perform one approved synthetic assignment and check all recipient bios,
   project member counts, and no update in unrelated agent bios.

The schema is additive. No Worker request applies SQL automatically.
No promotion into Render, existing production HUD or ANSJEM is authorized.
No new R2 buckets, Render databases, or paid inference providers are needed.

## Owner-authenticated endpoints

- `GET /api/projects`: list projects with **proposed** teams and actual member counts.
- `POST /api/projects`: create reviewed project metadata, no document access.
- `GET /api/agent-bio?agentId=...`: portfolio and collaboration history for one agent.
- `POST /api/agent-assignment`: explicitly assign up to eight known agent IDs,
  one project, activity kind and non-private label, using a unique reference ID.
  The operation is D1-batched and independently read back. Exact replays are
  idempotent; conflicting replays fail.
- `POST /api/team`: existing approved AI workflow; logs actual participants only
  after a verified mission checkpoint.
- `POST /api/ask`: existing AI workflow; records a generic question activity label
  only when the new schema is present.

All endpoints require the existing in-memory owner bearer token; failures
do not leak token or private content. The live roster remains unverified;
profile competencies are authored method guidance, not validated expertise.

## Launch checklist

- [ ] All synthetic tests pass with Node 22 and no provider token.
- [ ] `wrangler deploy --dry-run` bundles the changed Worker.
- [ ] Owner reviews and explicitly approves separate isolated D1 migration.
- [ ] Verify the existing SCOTTY encrypted production backup *independently*;
      this bio branch does not change that backup workflow.
- [ ] Test selected agent / team assignments, projects and collaborator display.
- [ ] Review source permissions before any private project integration.
- [ ] Owner explicitly approves any future merge or deployment.
