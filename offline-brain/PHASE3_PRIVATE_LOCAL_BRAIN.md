# S.C.O.T.T.Y. Independent Brain — Phase 3: Private Knowledge + Optional Local Reasoning

**Status: ISOLATED RESEARCH IMPLEMENTATION.** Source code only; no model installed or started, no external credentials, no Render/Vercel deployment, no connection to live SCOTTY, no Groq/Grok/OpenAI calls, and no changes to PostgreSQL or encrypted recovery copies.

## What this phase adds
1. Owner-reviewed documents persist on an owner-controlled computer in a dedicated local \`scotty-private-knowledge\` directory, permissioned to the local account (0700 directory, 0600 snapshot).
2. Each document has provenance, human review date, a hash, a revision number and an audit event (revision history records hashes/metadata, not previous full content). Updates require an expected revision and reject conflicts. Removing a record revokes it from the active corpus.
3. Existing Phase 1 agent-department/project filters are used when retrieving passages from saved records. All 128 profiles remain **synthetic** until a separate, authorized production-roster mapping is reviewed. The source store never reads the real roster or owner account.
4. Optional Ollama adapter can draft conversational answers from retrieved approved excerpts **only when explicitly enabled**, using an installed local model found at 127.0.0.1:11434. It refuses cloud-named models and never performs a model pull or signs into Ollama.
5. Owner must separately approve sharing retrieved evidence with the LOCAL model, even after choosing the model. Responses are marked unverified drafts with source IDs. A local LLM can still hallucinate and can be tricked by source text; no tools or external actions are exposed.
6. Public feed headlines and research updates from Phase 2 are **NOT** automatically promoted into this private store. The existing human-reviewed promotion step must produce an approved source first. There is no silent continuous retraining.
7. All scripts have no references to SCOTTY Core's \`DATABASE_URL\` at runtime and do not touch backup \`.age\` archives, identity keys, agent production tables, ANSJEM, or client folders.

## Hardware limitations
- **Ollama is an optional local runtime, not GroqCloud.** A supported computer with sufficient free RAM, disk, CPU/GPU and a locally installed model is needed for conversational inference. This change does not install Ollama, select compatible hardware, or download model weights. An iPad browser or Alpine iSH terminal is not assumed to be powerful enough for normal models.
- \`http://127.0.0.1:11434\` is pinned. Do NOT forward the Ollama port to the public Internet, expose it through Render, use a cloud-model tag, or sign in for cloud models. Ollama's local endpoint itself does not require authentication; keep it strictly on a trusted machine.
- Local development only, no multi-user security promises. Filesystem account access protects the prototype; disk encryption, backups and comprehensive access checks are required before sensitive client data.
- A local index is not a universal knowledge base. Real domain expertise requires licensed reviewed references and current verification; providers are not required for the storage and retrieval code.

## Developer commands (Node.js 22+; OFF your live server)
Use a separate trusted computer or sandbox, with repository source checked out from the **Phase 3 dev branch**. Do NOT run the Phase 3 CLI in SCOTTY's production container.

    node --test offline-brain/private-store.test.mjs
    node --test offline-brain/local-reasoner.test.mjs

Choose an absolute private path **outside** the public repository:

    node offline-brain/private-cli.mjs status --root "$HOME/scotty-private-knowledge"

To import a human-reviewed, authorized source JSON explicitly:

    node offline-brain/private-cli.mjs import-reviewed --root "$HOME/scotty-private-knowledge" --file /path/to/reviewed-source.json --expected-revision 0

To update that same record, use \`--expected-revision 1\` (and so on). Conflicting revisions are rejected.

To retrieve evidence without an AI model:

    node offline-brain/private-cli.mjs search --root "$HOME/scotty-private-knowledge" --agent agent-geordi-01 --question "software testing"

Plan agent assignments without AI inference:

    node offline-brain/private-cli.mjs plan --root "$HOME/scotty-private-knowledge" --question "review software architecture"

**Optional only, after YOU have independently installed a suitable local Ollama model on your computer:**

    node offline-brain/private-cli.mjs ask-local --root "$HOME/scotty-private-knowledge" --agent agent-geordi-01 --question "software testing" --model llama3.2:3b --enable-local-model --allow-local-evidence

The example name is not a model download and is not evidence that model is installed. The adapter checks \`/api/tags\` and refuses missing or cloud-tagged models. With no installed local model, the action fails closed.

## Example source JSON (NO personal data)

    {
      "id": "owner-reviewed-software-001",
      "title": "Synthetic software testing playbook",
      "content": "This is fictional test text that the owner has reviewed and explicitly approves for the assigned field.",
      "scope": "department",
      "department": "Engineering & Systems",
      "sourceType": "owner-file",
      "citation": "Owner's synthetic test playbook, revision 1",
      "reviewedAt": "2026-10-24",
      "approved": true,
      "allowedAgentIds": ["agent-geordi-01"]
    }

Project documents require \`scope: "project"\`, an explicit \`projectId\`, and an explicit recipient-agent list. A source in the \`private\` scope is never returned to agents. This CLI is single-owner; its \`--project\` option is owner-supplied scope, NOT production multi-user authorization.

## Scheduled knowledge updates
Phase 2 includes a *proposed* daily public-source discovery workflow. It is **not live** on the repository default branch. Even after activation, new references remain unverified until manually reviewed. Phase 3's private snapshot needs separate authorized local imports of approved records and is not a remotely synchronized database.

## Recovery files are separate and irreplaceable
Keep the October 18 previously restore-tested PostgreSQL \`.age\` archive and the newer October 24 downloaded/checksum-matched \`.age\` archive untouched. The October 24 file has not yet been shown to pass a complete independent restore test. Keep the password-protected recovery key on separate owner-controlled storage with its password in a manager. NEVER commit any archive, private key, or client data to GitHub or put it into the Phase 3 corpus automatically.

Render's free \`scotty-memory\` database had a listed expiration of November 7, 2026. Confirm verified recoverability and a replacement-storage plan well before that date. A standalone knowledge store is NOT a replacement for the production database.

## Acceptance status
- ✅ Source-only isolated Python-free Node.js storage and local-model adapter.
- ✅ Synthetic local persistence/revision/revocation/ACL tests (see Actions).
- ✅ No inference-provider account, no Groq or xAI connections, no paid service.
- ⬜ Real owner computer + hardware capacity chosen.
- ⬜ Model installed locally, audited and user-authorized.
- ⬜ Authorized/private documents reviewed and indexed.
- ⬜ Fresh public references reviewed and promoted.
- ⬜ Separate full PostgreSQL restore of the October 24 archive verified.
- ⬜ SCOTTY Core integration (deliberately prohibited until separate consent and safety review).

**Do not merge or deploy from this draft PR.**
