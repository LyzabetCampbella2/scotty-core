# Read-only mission → agent biography projection

Existing backend inspection: `src/agents/project-mission-model.ts` defines goal, steps, agent IDs, dependencies and chief coordination; `src/agents/project-missions.ts` already checks project membership, approved handoffs and approved project evidence. `src/agents/project-operations.ts` already recommends eligible project teams.

This isolated module transforms *trusted, already-authorized* project mission records into biography cards: mission status, assigned tasks, questions, collaborators, approved handoffs and approved unrevoked knowledge/memory. It does not query the database, verify the records' provenance, authenticate a user or render a UI. In particular, the caller must enforce memory sharing permissions, not merely a project match. Never pass raw cross-client records into the projection.

Before production: connect the existing server-side project membership and evidence filters, map real DB field names, add pagination and revocation tests, render accessible bio and HUD UI, and confirm end-to-end behavior with synthetic staging records. No production files modified, no database queried, no secrets or paid resources used.
