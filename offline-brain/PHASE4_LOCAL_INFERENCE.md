# S.C.O.T.T.Y. Phase 4 — Independent Local Inference & Evaluations

**Status: DRAFT CODE / SYNTHETIC TESTS.** This branch is stacked on draft PR #24 (which is stacked on #23 and #22). It is **not running inside SCOTTY's HUD** and it does not remove or change SCOTTY's current Groq integration. No local language model has been installed on the owner's computer.

## Implemented

- `agent-inference.mjs`: approved-source retrieval using the Phase 3 private local store, synthetic agent validation, enforced owner opt-in and department/project access scope, local-model calls only through Phase 3's pinned 127.0.0.1 adapter. Generates nothing if there is no separately reviewed domain-specific evidence. The 140 Phase 1 "method" packs never count as trusted domain evidence.
- Explicit preview shows the selected agent, department, sources, and whether approved evidence is available.
- Local drafts require both model enabled and explicit human approval. Produces an **UNVERIFIED_LOCAL_DRAFT**, carries source IDs, warns about absent or invalid `[Source n]` references, never claims to have verified facts, and never executes the response.
- `local-readiness.mjs`: private local machine RAM/CPU summary with no telemetry or connectivity; optionally probes **only** local `127.0.0.1:11434/api/tags` after an explicit flag to verify a named non-cloud model is installed. Local model disk size is NOT a RAM capacity estimate.
- `phase4-cli.mjs`: local hardware status, explicit model presence inspection, source preview, consent-gated local answer, and a **fully simulated** model demonstration.
- Synthetic safety tests: all 128 fallback-aligned agent profiles counted; no provider fallback; no arbitrary endpoints; protected department/project access; explicit owner consent; immediate revocation; citation review; no real secrets, live DB, or real installed model.

## Why this differs from Groq

GroqCloud is an inference service. A local model runtime on a **separate owner-controlled computer** can provide AI responses without using GroqCloud or a Grok plan. This is not "training a new foundation model," and "updates to knowledge" are owner-approved references in the private store, NOT continuous changes to model weights.

The existing live SCOTTY, HUD, voice and production memory still use their current deployment. Do not point them at this experiment or delete Groq credentials without a distinct reviewed migration plan.

## Current safe commands (Node.js 22+, a trusted personal Mac/Windows/Linux computer)

Run ONLY on a computer you control, with this Phase 4 branch checked out. No Render shell required or recommended. Never paste database credentials, age private keys, or client data into test commands.

Run a **fully synthetic test**; no real model or Ollama installation needed:

```sh
node offline-brain/phase4-cli.mjs synthetic-demo
```

See this computer's local RAM and CPU information (no internet, no model calls):

```sh
node offline-brain/phase4-cli.mjs hardware
```

The commands below are available **only after** the owner chooses a supported local machine and separately installs an appropriate Ollama model. An example model identifier is not an installation. No `ollama pull` is performed by this repository.

Check an explicitly named already-installed local model:

```sh
node offline-brain/phase4-cli.mjs readiness --model llama3.2:3b --probe-local
```

Preview scoped knowledge from a private local store:

```sh
node offline-brain/phase4-cli.mjs preview --root "$HOME/scotty-private-knowledge" --agent agent-geordi-01 --question "test code reliability"
```

Ask an already installed local model using reviewed department evidence, after an explicit owner authorization:

```sh
node offline-brain/phase4-cli.mjs answer --root "$HOME/scotty-private-knowledge" --agent agent-geordi-01 --question "test code reliability" --model llama3.2:3b --enable-local-model --owner-approved-local-inference
```

The example commands use Unix shells. Paths differ on Windows. The standalone CLI is a **single-owner developer prototype**, not a networked multi-user authorization system. `private-store` locally verifies scope and recipient IDs but is not connected to actual production user credentials or the production agent roster.

## Release gates (must remain unmet until explicitly approved)

1. Identify the owner's chosen **local** machine with adequate RAM/storage and ensure the local Ollama runtime is private and not remotely exposed.
2. Confirm a real local model is downloaded voluntarily, its licensing and size are acceptable, and it can respond without cloud fallback.
3. Create owner-approved, correctly cited department/project documents in a **private local directory outside GitHub**. Do not import personal or client documents without specific authorization.
4. Run optional local inference and review each agent's responses. Synthetic CI tests cannot prove real model accuracy, safety, latency, memory footprint or source truth.
5. Establish durable private device backups and restore drills for the local knowledge store.
6. Only later, separately authorize connecting a verified independent model and its private store to the live HUD. No automatic switch or failover has been deployed.
7. Preserve the October 18 tested `.age` production backup and October 24 checksum-matched archive. Independent full restore verification of October 24 is pending; never restore to the current production database.

**Production warning:** the existing free Render PostgreSQL database was documented as expiring November 7, 2026. Confirm its expiration and secure the verified recovery plan separately from the independent knowledge/AI experiments.

## What is NOT built or claimed

- No full trained model or "all knowledge," no continuous self-training, no private data copied to the public repository.
- No real Ollama process or weights, no hardware evaluation on the owner's device and no model quality benchmarks.
- No live scheduled knowledge refresh or private source-sync automation.
- No speech/HUD connection, persistent conversation database, shared production agent state or external actions.
- No replacement of `scotty-memory`, no production changes, no paid services.

**Leave PRs #22–#25 unmerged until these gates are individually evaluated.**
