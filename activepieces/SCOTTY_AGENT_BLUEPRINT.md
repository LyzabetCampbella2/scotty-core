# SCOTTY agent architecture within Activepieces (design guide, not live agents)

## Ownership and identity
SCOTTY remains central coordinator. Existing source in scotty-core defines 25 chief and 160 specialist development profiles. Never treat an Activepieces flow, integration or generic AI call as a verified person/agent with production authorization. Agent identity and project permissions must be issued and enforced by SCOTTY server-side.

## SCOTTY control flow (future after security gate)
Owner request -> create draft mission -> pick team by project-authorized skills -> present planning and expected cost -> await explicit owner approval -> enqueue approved specialist work -> chief review -> SCOTTY synthesis -> quality check -> owner final approval -> persist durable checkpoints and bio activity.
Failure -> stop, retain checkpoints, ask owner whether to retry, do not auto-upgrade or charge.

## Chief prototype tasks
- RIKER: break approved project goals into dependency-aware work packages and check assignments.
- TROI: identify user communication preferences, draft balanced feedback, ask permission before acting on private context.
- DATA: evaluate evidence quality, document uncertainty, cross-check citations and produce research tables.
- SCOTTY: route to appropriate chiefs, make choices auditable, request approval before new projects and external changes.

## Agent bio requirements
AgentId, reporting chief, exact role and tasks, independently reviewed skills, assigned projects, submitted questions, approved missions, handoff records, collaborators (distinguish proposed from verified), completion evidence, memory scopes, freshness timestamps and owner review status. A flow completion alone is not evidence of verified knowledge.

## Memory and security
- Individual memories visible only to permitted agent and owner.
- Department memory requires chief approval; shared memory requires explicit owner review.
- Project/client data subject to independent project permissions; never infer authorization from labels in automation payload.
- Never send raw medical, financial, personal, client manuscript or private account records to cloud AI steps without separate informed approval and adequate safeguards.
- No autonomous purchases, email sends, public posts, destructive actions, repository merges or production deployments.

## Free plan constraints
Design for low run frequency and keep AI use optional. A large 185-agent fleet could exceed free credits quickly. Keep AI steps off by default; measure observed usage in the Activepieces dashboard. Avoid automatic polling of hundreds of agents.
