# SCOTTY Stage A0 — Isolated staging approval ledger

**Status: review-only implementation; not deployed, not connected to tools, and not security-certified.**

## Added components

- `src/security/approval-gate.mjs`: pure deny-by-default scope evaluator from A0.
- `src/security/a0-ledger.mjs`: lazy-initialized PostgreSQL approval records, one-use claim reservations, owner revocation, stop-all row and append-only application audit inserts; all intended for a **separate staging database**.
- `src/security/a0-http.mjs`: owner-token-only HTTP adapter in SCOTTY's router.
- `src/security/*.test.mjs`: isolated tests; store mocked for HTTP tests; no live PostgreSQL execution in CI.
- `.github/workflows/a0-safety-tests.yml`: no-secrets unit tests on PR/push.

## Exact disabled-by-default configuration

Unset all of these in production. For an explicitly owner-approved, nonproduction validation environment only:

| Variable | Required behavior |
|---|---|
| `SCOTTY_A0_ENABLED` | Must be exactly `true`; otherwise responds 503. **Default absent/off**. |
| `SCOTTY_A0_ENV` | Must be `staging`; any other environment responds 503. |
| `SCOTTY_A0_ADMIN_TOKEN` | Separate randomly generated server-only bearer token, at least 48 chars. Never embed in browser JavaScript or commit. |
| `SCOTTY_A0_OWNER_ID` | Owner identity label assigned by authenticated administrator; not a secret. |
| `SCOTTY_A0_STAGING_DATABASE_URL` | Separate staging-only PostgreSQL connection, distinct from `DATABASE_URL`. Do not use production DB. |
| `SCOTTY_A0_STAGING_DATABASE_NAME` | Exact `current_database()` name. Reject mismatched database. |
| `SCOTTY_A0_CLAIM_TESTS_ENABLED` | Must be `true` to even accept a test reservation; **default absent/off**. |

**Not permitted by this PR:** connecting an agent or tool, arming the control row, accessing owner-private information, publishing, sending, spending, live agent execution, or a production migration.

## Staging schema preparation (separate explicit approval required)

Before configuring the API, independently verify the dedicated PostgreSQL database's identity, its access controls, and a usable schema/data backup. Then review and explicitly approve `migrations/a0_staging_001.sql` for **that staging database only**. Do not run it in production or point the dedicated staging URL at the ordinary SCOTTY `DATABASE_URL`. The service checks existing tables and fails closed if the migration has not been performed. This PR has **not** run the migration.

## API (staging owner only)

Every route is under `/api/a0/` and requires `Authorization: Bearer <server-only token>`; no cookie support. POST also requires `X-Scotty-A0-Csrf: 1` and JSON, rejects conflicting Origin. API request/response bodies are bounded to 16 KiB (request only).

| Method | Route | Description |
|---|---|---|
| GET | `status` | Shows staging control flags and aggregate counts; no credentials. |
| GET | `grants` | Lists up to 100 owner-scoped staging grant records. |
| POST | `grants` | Inserts an exact scope with evidence ID, owner approval intent, one use, expiry under 24 h and **zero** allowed spending. Records a staging grant; does not run a tool. |
| POST | `grants/:uuid/revoke` | Revokes one matching grant under PostgreSQL transaction. |
| POST | `stop-all` | Sets staging stop-all to true and disabled. No arm/enable endpoint. |
| POST | `claims` | Disabled separately; when enabled, creates a transactionally reserved staging claim **without performing external work**. |

**Staging database defaults:** `stop_all=true`, `enabled=false`, `budget_approved=false`, `paid_actions_enabled=false`, budget ceilings 0. These keep all claim reservations denied until a separate owner-authorized staging-only control/QA workflow is implemented.

### Important remaining limitations

1. The provisional check is *not yet called at the actual tool executor boundary.* It must never be construed as permission for a model or automation to execute.
2. The currently installed admin token is only an isolated administrative development credential. It is **not** a full production multi-user identity/session design. Strong server-side owner authentication, short-lived sessions, CSRF protections, and role proof remain required.
3. The ledger's **stop-all covers only its own new reservations**. It does not stop existing Activepieces flows, queued work, already-running actions or external applications. An actual global kill switch needs those integrations and testing.
4. Application startup and API reads **do not create schema**. The dedicated staging migration is `migrations/a0_staging_001.sql` and must only be applied manually after explicit owner approval and a verified staging backup. Schema migration, rollback and PostgreSQL transaction-level integration tests are **not yet verified**.
5. Only zero-cost single-use reservations are modeled in A0. Paid actions, concurrency reservations, refund/compensation, execution receipts, delayed external effects, timezone-aligned cost windows, budget release and idempotent external APIs need later phases.
6. Owner-authenticated grant creation has no verified match to the signed immutable 185-ID roster yet. Before enabling actual execution, reconcile identities against authoritative signed registry and project membership.
7. Current tests use in-process mocked stores (HTTP) and pure evaluation; do not treat them as genuine persistent DB isolation, restore/restart, cross-worker or live permission tests.

## Local test command

```bash
npm run test:a0
```

This runs Node's isolated tests without credentials, provider connections, deploys, scheduled workflows or mutations.

## A0 exit gate remains BLOCKED

Only after owner review, source-of-truth freeze, staging database isolation, test results, backup/isolated restore, durable audit enforcement, independent stop-all and signed zero/positive spending ceilings may the system be considered ready for the next phase.
