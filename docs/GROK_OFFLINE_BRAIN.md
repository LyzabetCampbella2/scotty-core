# SCOTTY — Grok brain compatibility: disconnected review build

This is an offline blueprint and NOT a working Grok AI model. It never calls xAI, never imports the existing Groq backend, and is not registered in any runtime router, dashboard or voice path. The current Groq brain, Render PostgreSQL, 128 agent records, 12 chiefs, memory, Scottish voice and HUD remain unchanged.

Files:
- src/brain/grok-offline.mjs: fail-closed synthetic request planner, not an AI API client.
- src/brain/grok-offline.test.mjs: tests that request text and private document IDs are not disclosed, that project scope is required, and that there is no network activity.

Run synthetic tests with: node --test src/brain/grok-offline.test.mjs

Billing: using this offline code requires no xAI plan, key, or credit. If user ever opts in to actual Grok inference later, the xAI API is separately billed by usage. Do NOT enable it by environment flag or implicit authentication. Future activation would require explicit reviewed connection code, permission-scoped data minimization, server authentication, hard spending limits, testing and human authorization for a separate merge/deployment. No private memories, client content, ANSJEM documents or agent instructions are ever sent to xAI by this version.

Database recovery is planned in the separate private scotty-encrypted-db-backup review branch. This PR does not query, dump, migrate or change production memory.
