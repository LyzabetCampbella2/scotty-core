# S.C.O.T.T.Y. Core

This repository is the new maintainable source of S.C.O.T.T.Y. It replaces the legacy single packed Railway Function architecture with ordinary source files.

## Architecture
- `src/eyes/` — Eyes On / vision
- `src/voice/` — speech, listening, ElevenLabs
- `src/memory/` — shared memory
- `src/server.ts` — thin router only

## Migration safety
The existing production Function remains live until its legacy routes are mapped and verified against this modular service. Do not delete the legacy Function during migration.

Secrets are never committed. Configure them as Railway environment variables.
