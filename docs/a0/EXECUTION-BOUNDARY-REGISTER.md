# SCOTTY Stage A0 — Execution Boundary Register

**Audit:** 2026-11-07. **Status:** owner review; draft PR #76 is not deployed. This file describes modular `scotty-core` source on the A0 development branch, **not** confirmation of the code currently serving users from Railway or Render.

| Route or integration | Observed source behavior in draft | Permission status | Release condition |
|---|---|---|---|
| `GET /health` | Returns service health | Public diagnostic, no restricted data expected | Verify no secret disclosure |
| `GET /api/eyes/status` | Returns feature flags only | No camera analysis allowed | Keep status honest about unavailable analysis |
| `GET /api/eyes/test` | Returns a camera-preview test page | User-controlled browser camera access; analysis request now rejected server-side | Add identity/consent to future authenticated page |
| `POST /api/eyes/analyze` | **New Stage A0 behavior: HTTP 503, no request body parsed, no model call** | Default deny on draft branch | Authenticate owner, verify exact image/data scope and approve provider and charges before re-enabling |
| `src/eyes/vision.ts` | Retains legacy local/cloud provider implementation | Not reachable through A0 `handleEyesOn` analysis route | Do not import from any other live executor without gate; no implicit cloud fallback |
| `GET /api/voice/status` | Returns configuration booleans | Public diagnostic | Auth before any private voice data |
| Other `/api/voice/*` | Compatibility adapter returns 501 | Inactive in modular app | Owner-verified permission gate before speech provider use |
| `GET /api/memory/status` | Returns configuration boolean | Public diagnostic | No memory content disclosure |
| Other `/api/memory/*` | Compatibility adapter returns 501 | Inactive in modular app | Owner/project-scoped memory access checks |
| `/api/agents/*` | Feature flag + admin token or interim owner session path | Prototype owner auth, **not** independently certified | Trusted session identity, immutable 185-ID roster reconciliation, scoped roles, CSRF and row-level denial tests |
| `/api/workspace/*` | Feature flag + admin bearer; can mutate workspace DB | Owner-only prototype | Real owner auth and task-level authorization before autonomous execution |
| `/api/a0/*` | Separate staging-only token, disabled by default | Approval record backend, no external actions | Trusted owner evidence verifier, isolated staging, migrations, database tests and end-to-end executor checks |
| Activepieces (24 flows) | At last audit all disabled/unpublished, zero app connections | No autonomous SCOTTY flow was certified | Inventoried, tested and explicitly approved per integration |
| Railway legacy Functions and Render upstream | Some deployed code is not from the current modular branch | **Unknown until exact deployment SHA and runtime are verified** | Audit and gate every real provider call, credential, data store, queue and scheduler |

## Critical security finding and mitigation

The earlier modular `/api/eyes/analyze` route accepted image data and could pass it to `analyzeFrame`, which attempts a local provider and can then fall back to the OpenAI cloud provider if configured. **That was an unacceptable approval and budget bypass for Stage A0.** The A0 branch now rejects `POST /api/eyes/analyze` with HTTP 503 before frame parsing. The status endpoint also reports `visionExecutionAuthorized=false` and `visionConfigured=false` until owner-scoped authorization is integrated. The browser camera test page remains accessible, but attempting to submit a frame will receive an error.

The safeguard is **only source-code protection in an unmerged draft PR**, not proof that already deployed legacy apps no longer invoke provider APIs. No service environment variable, credential, production route or deployment was changed.

## Next execution enforcement work

1. Inventory **actual** running Render/Railway/Vercel/legacy Functions and provider calls; correlate deployed commit SHA and configured ingress with owner-approved source-of-truth register.
2. Integrate SCOTTY's authenticated owner session and trusted grant evidence in every read/write/provider executor, not only `/api/a0`.
3. Enforce zero-new-spend by default at provider boundaries; capture request content hash, agent/project/task scope, data class, privacy/consent, explicit provider, max token/credit/$, retry cap, remote receipt, idempotency and expiry.
4. Stage in independently isolated PostgreSQL; test revocation while competing requests run, cross-agent/project attempts, missing auth, expired grants and kill-switch propagation across workers/flows.
5. Test emergency stop on all real endpoints and queues, including in-flight actions and external credentials; record owner's recovery key custody and real encrypted isolated restore proof.
6. Collect owner signature for roster ID freeze, aliases, data policy, monthly spend authorization and Phase A0 acceptance.

**Final gate: BLOCKED.** Do not merge the A0 branch or enable autonomous Phase B agents on the strength of static source tests alone.
