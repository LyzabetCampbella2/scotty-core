# S.C.O.T.T.Y. Independent Offline Knowledge Brain — Phase 1

**Status: source-only proof of concept. NOT deployed, not an AI model, not Groq-connected, not xAI Grok-connected.** This folder is not imported by SCOTTY's live Render router.

## What has been built

- 12 chiefs and 116 subordinate synthetic profiles derived from SCOTTY's documented fallback ID hierarchy; production identities are **not** read or replaced.
- 12 disciplinary methodology packs and 128 profile-specific starter guides = 140 original knowledge-method records.
- Retrieval by subject, optional source-provenance tracking, chief/team recommendations and isolated project/department/private access checks.
- Explicit reviewed-source ingestion of owner-supplied JSON, with required evidence/citation/date and authorization scope.
- No generation or internet knowledge claims. A plan is not an answer, and an agent profile is not a trained AI.
- No DATABASE_URL usage, file export, backup decryption, external API requests, Groq calls, Grok calls, purchases or paid plan.
- No new database, no deployment, no changes to existing voice, HUD, PostgreSQL, agent roster or project data.

## Run locally (Node.js 20+)

From repository root:

    node --test offline-brain/offline-brain.test.mjs
    node offline-brain/cli.mjs demo
    node offline-brain/cli.mjs catalog
    node offline-brain/cli.mjs query "review manuscript pacing and plot" agent-zora-01

Try approved synthetic documents only:

    node offline-brain/cli.mjs approved-json offline-brain/example-approved-documents.json "fiction pacing" agent-zora-01 fiction-demo

The input file is read by the CLI **only when explicitly named**. It cannot be an encrypted .age database backup. The CLI has no network client.

## Building ACTUAL domain knowledge

The 140 seeded guides are methodological starting points, not an encyclopedia. To gain useful real knowledge, each specialty needs reviewed, properly sourced and licensed facts, examples, updated official references, approved project notes and clear boundaries. A retrieval index or on-device language model can later use these records. Without a connected language model, this prototype can rank, quote approved snippets, and plan specialist work; it **cannot generate nuanced conversational answers**.

Recommended next phases, each requiring separate review before any integration:

1. Complete safe source acquisition, with owner-approved offline JSON/Markdown uploads, provenance metadata, version dates, license checks, stale-source re-review, conflict detection and explicit per-agent recipients. Keep private owner folders and client data out of the repository.
2. In an isolated machine, test semantic retrieval with embeddings and factual evaluation datasets; keep network use disabled.
3. Offer an optional **local** LLM runtime (e.g. an explicitly installed Ollama model). A local model can generate responses from the knowledge corpus without using Groq, subject to local RAM/compute.
4. Optional future, separately authorized GroqCloud or xAI Grok adapter. These are two different products. An adapter is not required to keep developing the knowledge brain. API billing and privacy must be reviewed before any live calls.
5. Create read-only, owner-controlled roster snapshot mapping from verified records without accessing production unless separately approved. Synthetic names/IDs are NOT assumed to match imported production metadata.
6. Only after explicit approval: evaluate a deployment with a **separate** staging backend and separate storage, preserving live SCOTTY.
7. Do not connect ANSJEM/Dawna, private files, passwords, personal memories or documents by default.

## Encrypted recovery files — important

- The October 18 and October 24 encrypted PostgreSQL \`.age\` archives are **disaster-recovery artifacts**, not "brain training files". Never commit or upload them to this repository, Groq, Grok or any public service.
- Keep the encrypted archive in your private SCOTTY recovery folder and secure independent secondary storage; keep the passphrase-encrypted emergency private key copy in a **separate** secure storage location and its passphrase in your password manager.
- The October 18 archive passed a prior isolated restore test. The **October 24** upload has not yet had a verified isolated restore, so do not delete the earlier known-good archive.
- Use an isolated, disposable PostgreSQL 18 instance to test a real restore; NEVER restore into the existing Render \`scotty-memory\` database.
- The free production Render database currently lists expiration **2026-11-07**. Recovery is a priority independent of this separate offline-brain project.

## Knowledge-source format

Each source needs \`approved:true\`, explicit \`sourceType\`, \`citation\`, \`reviewedAt\`, \`scope\`, \`title\`, \`content\`, \`id\`. Supported scopes: \`shared\`, \`department\`, \`project\` or \`private\`. Project sources need a \`projectId\` and nonempty \`allowedAgentIds\`. Private sources are deliberately inaccessible to agents. No source gets automatic cross-project access. Human approval for reading a source does **not** authorize a provider upload or an external action.

## Security review

This code is intentionally detached from production. Tests are synthetic only and no secrets are included. Read and review the diff. **Do not merge or deploy this PR** without a separate explicit discussion of integration, costs, privacy, and test results.
