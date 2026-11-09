# SCOTTY Phase 5 — isolated authorization adapter (draft)

**Status:** Development-only. **Not connected to any live route, agent, SCOTTY database, OAuth provider, memory store, or production environment.** Synthetic code is tested against disposable PostgreSQL containers in CI. No real authorization is issued. Do not merge, deploy, or enable without additional review and explicit owner approval.

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

- `phase5-synthetic-postgres-gate.mjs`: injected Postgres.js `sql.begin` transaction, grant row `FOR SHARE`, parameterized SQL, unique nonce claim, and audit insert in the *same transaction*. Audit failure rolls back the nonce claim. Its result is still never a real access grant.
- `phase5-synthetic-postgres-schema.sql`: test-only SQL reference, applied **only** in a disposable GitHub CI PostgreSQL service; it explicitly aborts unless the database name is `scotty_phase5_synthetic_test` and revokes public table access. This is not a production migration.
- `phase5-synthetic-postgres-gate.test.mjs`: 18 local tests using a serialized **fake Postgres transaction**, not a real database. This tests fail-closed logic, not actual DB isolation, row locks, or multi-instance durability.

The new module does **not** create a database connection, read environment variables, run the schema, register an HTTP route, or activate any agent.

**Further acceptance blockers:** implement trusted owner authentication and signed approval proof, durable denial auditing, RLS and agent-level isolation, cross-host revocation security, actual backend integration, plan/billing verification, and obtain explicit owner approval before deployment. `enabled` remains `false` by default. The database adapter is intentionally NOT imported into an executable runtime.

## Verified disposable PostgreSQL integration (November 9, 2026)

- GitHub Actions [run 42665515613](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42665515613) ran against an ephemeral PostgreSQL 16 service container inside GitHub Actions. The integration test requires an exact loopback host, port, synthetic database name and two synthetic database-role usernames.
- The schema was **applied only in this disposable CI database**. The CI job deliberately attempted the same schema in the wrong local database; the database guard refused it and left that database unchanged.
- **12/12 integration subtests passed** (Node TAP reports 13 when counting their parent). The other two mock test suites previously passed **46/46**.
- The real database tests exercised committed nonce and audit rows, replay rejection across two connection pools, eight concurrent attempts with exactly one eligible preview, grant revocation and expiration, object/project scope, audit-insert failure and full nonce rollback, and restrictions against modifying grant authorization fields.
- PostgreSQL `SELECT FOR SHARE` requires some `UPDATE` privilege. The disposable runtime role has `UPDATE` **only on constrained inert `lock_pad`** (cannot be changed to true), not on the grant's approval, project, action, expiry or revocation fields. CI proved attempts to modify approval fields were denied. This is a testing workaround, not a final production privilege architecture.
- No actual signed owner approval, identity-provider token, agent execution, media/account connection, memory store, or production database was accessed or integrated. The tests deliberately stub grant signature verification and owner session checks. A synthetic eligibility result is **never a real permission**.
- **Important remaining gap:** the demonstration logs eligible-preview transactions but does not yet durably log every denied attempt. Persistent privacy-safe denial auditing, backend RLS, stronger least-privilege roles (possibly a security-definer service), cryptographic proof verification, and tests across actual distinct backend machines remain outstanding.
- No production migration, deployment, merge, or live permission grant was performed. GitHub Actions may consume included usage credits; account billing was not independently verified.

## Synthetic Ed25519 owner proof and subject-bound signed sessions (November 9, 2026)

- `phase5-owner-proof.mjs` verifies a domain-separated, exact-field Ed25519 signature on a **synthetic owner grant**. Project, resource, action, status, expiry, version, issuer and key ID are all included in the signed payload. Public keys come from an independently supplied trusted test keyring, **not** from an editable database record. A missing, rotated, invalid or mismatched public key denies verification.
- `phase5-signed-owner-session.mjs` verifies a separate short-lived **synthetic signed owner session**: fixed issuer, audience and token purpose; Ed25519 only; maximum 10-minute lifetime; canonical subject/session identifiers; independent revocation callback. It loads project membership **for that authenticated subject**, not by trusting roles/project IDs in the HTTP request or from a global workspace list. This avoids subject/project cross-request confusion in the earlier abstract PR #72 adapter.
- The isolated PostgreSQL authorization gate accepts an optional `resolveTrustedOwnerContext` callback for this subject-bound path. Its earlier workspace factory path remains only to preserve previous isolated test fixtures and should **not** become a production authorization source without separate review.
- [Node CI run 42679546475](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42679546475): **113/113 synthetic unit tests passed**. Includes signed grant tampering and key rotation; signed session issuer, audience, expiry, revocation, untrusted project claims, identity isolation, concurrent subject mapping and malformed tokens.
- [Disposable PostgreSQL run 42679546629](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42679546629): **31/31 subtests passed** (34 Node TAP counts including three parent suites). Includes an end-to-end **signed synthetic owner session + signed synthetic grant + scoped project lookup + transaction preview**. A different signed owner, revoked session or tampered session cannot use a valid grant. The preview always reports `actualPermissionGranted:false`.
- Temporary Ed25519 private keys exist only inside isolated CI test processes; **no real owner key, session, credential, production account or production data** is involved. Signed sessions do **not** use a durable session-revocation backend yet; that remains an injected contract, not production enforcement.

### Activation blockers after this milestone

Real owner login and identity-provider integration, secure public-key distribution and rotation, authoritative owner grant issuance, durable session revocation and audit, row-level per-agent memory authorization, multi-instance threat testing and independent security review remain unimplemented. SCOTTY's 185-agent roster and all existing disabled workflows must remain unchanged. PR #80 stays a draft stacked on draft PR #72; the Vercel build-rate status remains unresolved. Do not upgrade/pay, merge, deploy, connect apps or activate agents without separate owner permission.

## Phase 5 — Disposable per-agent memory row-level isolation

This is an **unconnected memory security reference**. Neither a live SCOTTY memory table nor an existing production/staging DB was read or written.

- `phase5-synthetic-memory-rls.sql` creates a disposable, test-only PostgreSQL 16 memory table and a database-login-to-project-and-agent ACL table. The test schema explicitly rejects any database other than `scotty_phase5_synthetic_test`. Its contents are exclusively `SYN-`-prefixed fictional values.
- The memory table uses **ENABLE ROW LEVEL SECURITY** and **FORCE ROW LEVEL SECURITY**. The read policy checks *both* project and owning agent against an active ACL mapping. A search-path-locked, security-definer helper uses PostgreSQL `session_user`, not a client-settable custom session variable, browser-supplied role, or arbitrary request field.
- In disposable CI, four separate *synthetic* database logins demonstrate individual-agent access, another project's access for the same agent identity, and a completely unmapped identity. Those roles have SELECT privilege on memory and narrowly scoped EXECUTE on the RLS helper; they cannot read/modify the ACL or insert/update/delete memory.
- `phase5-synthetic-memory-rls.integration.test.mjs` runs against the disposable database, covering cross-agent and cross-project reads, direct guessed-ID access, session variable spoofing, `SET ROLE` impersonation, `row_security=off` attempts, immediate ACL revocation, simultaneous isolated reads, privilege checks, and schema rejections. The initial run [42680760556](https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42680760556) passed **15/15 new memory subtests** as part of **50/50** PostgreSQL TAP checks (four suite-parent counts included). A follow-up expands negative scope/classification tests; inspect the latest CI before declaring them passed.
- **Departmental and shared memories are deliberately unsupported**: the synthetic table enforces `memory_scope='individual'`. These other scopes need separate verified owner approvals, policy definitions, RLS rules, and audits before enabling any read path. No real memory grants exist.
- **Critical architectural limitation:** the CI isolation depends on each agent principal using a separate PostgreSQL login. That is **not** equivalent to authenticating a SCOTTY agent in the application. A backend identity-to-DB-role mapping, secure short-lived credentials or approved security-definer service, 185-agent roster reconciliation, department permissions, and per-read audit enforcement are not yet built. Production must never use test credentials or a common superuser connection to stand in for individual agents.
- Test roles, passwords, grants and schema exist **only** in short-lived GitHub Actions CI containers, with no production connection strings, live memory, external app calls, deployments, paid AI, or agent activation. GitHub Actions may consume plan usage minutes; billing was not independently inspected.
