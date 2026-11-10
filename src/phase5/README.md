# SCOTTY Phase 5 — Staging-only owner preview (development draft)

## Scope
This branch adds a **read-only preview** for existing SCOTTY workspace assignments and agent biographies. It is not the full Phase 5 transactional assignment engine, and it does not activate agents, connect Activepieces, publish, grant memory access, or migrate a database. It intentionally does **not** reuse the existing workspace bearer-admin token or production `DATABASE_URL`.

## Endpoints (GET only)
- `/api/phase5/owner/portfolio?projectId=...`
- `/api/phase5/agents/<canonical-agent-id>/biography?projectId=...`

Both require a pinned RS256 public key, exact issuer, audience, owner subject and short-lived token. The query adapter only reads existing `scotty_projects`, `scotty_missions`, `scotty_agents`, and `scotty_project_agents`. It makes no tables and performs no writes. Other methods return 405.

## All gates are deny-by-default
Only on a separately reviewed staging deployment should an administrator **consider** configuring:
- `SCOTTY_ENV=staging`
- `SCOTTY_PHASE5_STAGING_ENABLED=true`
- `SCOTTY_PHASE5_READ_ONLY=true`
- `SCOTTY_PHASE5_OIDC_ISSUER` — exact reviewed identity provider issuer
- `SCOTTY_PHASE5_OIDC_AUDIENCE` — dedicated staging audience
- `SCOTTY_PHASE5_OWNER_SUB` — owner's verified immutable IdP subject
- `SCOTTY_PHASE5_OIDC_KID` — exact pinned key ID
- `SCOTTY_PHASE5_OIDC_PUBLIC_KEY_PEM` — reviewed >=2048-bit RSA public key; never commit private keys
- `SCOTTY_PHASE5_STAGING_DATABASE_URL` — independently verified **staging-only** database with no production data, and preferably a read-only database role

**Do not set these on production or reuse a production database URL.** A database hostname/branch verification and IdP enrollment approval are still required. The repository files do not establish a safe hosted environment.

## Local test command
`node --experimental-strip-types --test src/phase5/phase5.test.ts` (Node 22+) or test with Bun after verifying compatibility. No network or real accounts are used. The initial 28-case Node suite passed locally on November 10, 2026. The GitHub branch has not been independently CI-verified.

## Release / security gate
**DENY.** To complete Phase 5, integrate the existing transactional job ledger using a real reviewed owner IdP, staged grants and revocation, independently isolated staging persistence and HUD, end-to-end signed assignment -> accepted work -> biography history, recovery, and 185-roster checks. No branch merge, production deploy, billing, OAuth, Activepieces activation or owner profile certification is authorized by this draft.
