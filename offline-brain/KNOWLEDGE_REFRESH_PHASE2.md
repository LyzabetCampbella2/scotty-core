# SCOTTY Independent Brain — Phase 2: Public Knowledge Refresh

**Review-only, isolated and offline-from-Groq.** Adds a *public-source discovery index*, not a trained model or universal encyclopedic knowledge. Nothing here is routed to the live SCOTTY HUD, live PostgreSQL memory, backups, voice, or any production agent.

## What updates
- 14 explicit HTTPS RSS/Atom sources grouped across 12 departments, discoverable through their 128 fallback-aligned synthetic agent profiles.
- NASA science, NIST topic feeds, SEC news and arXiv scholarly-category metadata.
- Headlines, publication timestamps, attributable HTTPS links, source IDs and refresh status. **No article bodies, PDFs, scraped webpages, tokens, client data or personal memories are imported.**
- Per-agent filtered public source references. Specialists can find relevant new sources, but the index remains **pending-review**, never a verified fact.
- Status and freshness: failed feeds are marked as failures; undated or older-than-90-day items are flagged as stale for the agent view. An older public index may be supplied explicitly for fallback and remains unverified.

## Exact data-flow
Approved fixed public feed -> bounded network retrieval (manual run only) -> constrained RSS/Atom metadata parser -> pending-review JSON snapshot -> independently selected agent sees department-only public references.

**There is no connection to Groq or xAI Grok.** No AI is being trained and there are zero inference-provider calls. There is no access to production database or the encrypted backup.

## Run (Node 22, independent environment)
From the repository root:

    node --test offline-brain/offline-brain.test.mjs
    node --test offline-brain/public-refresh.test.mjs

To intentionally fetch ONLY public publishers into an untrusted source index:

    node offline-brain/refresh-cli.mjs --refresh-public --output /tmp/scotty-public-updates.json

To inspect agent-specific source references:

    node offline-brain/refresh-cli.mjs --view /tmp/scotty-public-updates.json --agent agent-geordi-01

The sample synthetic corpus from Phase 1 is kept separate; metadata from public sources is *not* silently inserted into reviewed, factual memory.

## Planned daily refresh
The "SCOTTY Public Knowledge Refresh (Isolated)" GitHub Actions workflow includes a **daily UTC schedule**, with a public-only artifact output and 14-day artifact retention. GitHub only runs scheduled workflows from a repository's default branch: a draft stacked PR cannot trigger recurring scheduled updates. PR validation runs synthetic-only tests and never fetches public data.

To enable recurring public discovery later, first review the workflow, source terms of use and metadata, then intentionally install it on an authorized default branch. For a persistent, confidential system, add a separate, owner-approved private storage/snapshot import layer; don't commit private information to this public repository. GitHub Actions minutes and artifacts are subject to the account's free quota; there is no new paid Render instance.

## Public feed limitations and editorial checks
- External content is untrusted and is NEVER executed as an instruction.
- Publishers can redirect, block or discontinue feeds; those failures are reported, not hidden.
- Scholarly arXiv postings can be preprints and are not peer review.
- NIST health-related research is not patient-specific care guidance, and SEC press releases aren't independent investing recommendations.
- Strategy, creative writing, command and operations feeds are adjacent research discovery sources, not exhaustive discipline textbooks.
- Source dates may be missing. No false publication/freshness timestamp may be invented.
- Retrieval is not learning in model weights. Each area also needs curated textbooks/standards, licensed reference materials, freshness review and qualified specialized evaluation before relying on specific factual answers.

## Privacy/recovery safety
- Do NOT add October 18/24 .age PostgreSQL archives, private age keys, client files, personal memories, or secrets to this public repo.
- Your October 24 encrypted export had successful upload and checksum verification, but independent restore testing is still required; retain the separately tested October 18 archive.
- Do NOT restore into the live Render production database. That free production database is marked to expire on November 7, 2026.
- The live SCOTTY remains on Groq until you separately approve an audited model switch; an independent private language-model runtime is a future project and requires suitable hardware.
