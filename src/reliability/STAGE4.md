# Stage 4 — service probes and agent execution adapter
- Added local adapter probes for Eyes On, voice, and memory. Voice and memory deliberately remain degraded while their compatibility adapters are incomplete.
- Added runAgentTask wrapper with approval gate, watchdog bookkeeping, abort signal, and metadata-only audit records.
- A timeout cannot guarantee a third-party operation stopped; providers must honor abort and support idempotency. This wrapper is not yet connected to a real agent executor.
- Start probes only after the server is listening. Avoid internal HTTP probes in restricted or serverless environments.
- Control API still uses a server-side shared secret, not a browser-accessible credential.
- Snapshots still require configured durable storage, encryption, backup rotation and restore drills.
- Do not merge into production until the existing voice/eyes/agents runtime has been mapped, test coverage executed, and deployment validated.
