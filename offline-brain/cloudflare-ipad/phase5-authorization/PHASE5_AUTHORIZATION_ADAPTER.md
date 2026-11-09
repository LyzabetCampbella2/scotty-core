# SCOTTY Phase 5 — isolated authorization adapter (draft)

**Status:** Development-only. **Not connected to any route, agent, database, OAuth provider, memory store, or production environment.** No real authorization is issued. Do not merge, deploy, or enable without additional review and explicit owner approval.

## Location and dependency

This module imports `createOwnerWorkspaceContextFactory` and `rejectUnsafeWorkspaceRequest` from the existing draft owner-session boundary in PR #72 (`feat/workspace-owner-auth-boundary-20261106`). The new branch must be reviewed as a **stacked change** before PR #72 is merged.

The adapter rejects all requests by default (`enabled: false`). An explicit *test-only* enable switch permits only `workspace:read` and `knowledge:propose` for `synthetic-only` resources whose IDs begin `SYN-`. Its result is `SIMULATED_ELIGIBLE` (never `ALLOW`), with `actualPermissionGranted: false` on every path.

## Required injected dependencies

- `verifyOwnerSession(request)`: trusted server session verifier (not the browser body).
- `loadAuthorizedProjectIds()`: trusted server project-membership loader; does not accept client-provided IDs.
- `newId()`: server-generated ID factory for owner context.
- `readGrant(grantId)`: server-authoritative grant lookup, object/project/action scoped; not user-editable records.
- `verifyGrantProof(grant)`: independently verifies owner-issued proof or signature. The development tests stub this; no real signing is implemented.
- `claimNonceAtomic(key, expiry)`: durable, atomic, cross-instance uniqueness reservation with expiration; development tests use a local `Set` **only to exercise the interface**.
- `recordAudit(event)`: redacted, persistent, access-restricted audit writer; if it fails for an otherwise eligible request, the adapter returns `DENY`.
- `now()`: trusted clock; development tests use a fixed date.

**Critical:** Merely supplying callbacks with these names is not evidence they are trustworthy. No production service should call this module until concrete backend implementations and independent security tests are in place.

## Test

From the repo root, using Node.js 22 or later:

```sh
node --check offline-brain/cloudflare-ipad/phase5-authorization/workspace-authorization-adapter.mjs
node --test offline-brain/cloudflare-ipad/phase5-authorization/workspace-authorization-adapter.test.mjs
```

Local checks: **28/28 passing** using isolated synthetic data and no external calls.

## Remaining blockers

1. Trusted session validation must be connected through server-side authentication and proven against real, isolated authentication fixtures; no cookie or token is accepted from test strings.
2. Real owner approvals require independently signed, versioned, revocable records bound to action, project, resource and principal.
3. The replay interface needs a **durable atomic** database-backed implementation. In-memory `Set` is not sufficient across instances or restarts.
4. Project membership, resource ownership, least privilege, row-level database policies, and agent-to-agent memory restrictions need server-side verification.
5. Audit records need durable, privacy-safe storage, retention, and failure-mode testing.
6. A later deployment must be separately authorized and run only in an isolated staging environment. Production access, agent activation, app connections, publishing, paid AI, and actual memory operations remain prohibited.

## Safety

No credentials, calls to cloud providers, live memory, external app access, publishing, or infrastructure changes are implemented by these files. The `knowledge:propose` label only produces a synthetic **preview result**; it does not save a proposal. Draft PR only, with no merge or deployment approval implied.

## Follow-up: disposable PostgreSQL transaction reference (Phase 5)

Two new **unwired** files complement the existing adapter:

- `phase5-synthetic-postgres-gate.mjs`: injected Postgres.js `sql.begin` transaction, grant row `FOR UPDATE`, parameterized SQL, unique nonce claim, and audit insert in the *same transaction*. Audit failure rolls back the nonce claim. Its result is still never a real access grant.
- `phase5-synthetic-postgres-schema.sql`: unapplied SQL reference; it explicitly aborts unless the database name is `scotty_phase5_synthetic_test` and revokes public table access. This is not a production migration.
- `phase5-synthetic-postgres-gate.test.mjs`: 18 local tests using a serialized **fake Postgres transaction**, not a real database. This tests fail-closed logic, not actual DB isolation, row locks, or multi-instance durability.

The new module does **not** create a database connection, read environment variables, run the schema, register an HTTP route, or activate any agent.

**Further acceptance blockers:** test SQL against a dedicated disposable PostgreSQL server; enforce least-privilege DB roles, RLS, and isolation; implement independent cryptographic owner-grant verification; record all denied attempts in a durable redacted audit store; test revocation and nonce uniqueness across actual concurrent PostgreSQL transactions; prove $0 plan/billing scope; get separate owner approval before any installation or deployment. `enabled` remains `false` by default. The database adapter is intentionally NOT imported into an executable runtime.
