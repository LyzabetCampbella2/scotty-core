# SCOTTY Phase 5 staging draft — release gate DENY

This review branch adds a **disabled-by-default GET-only owner preview** plus a separate, **dormant assignment lifecycle**. No production release, paid AI use, OAuth, migration or live-agent execution is authorized.

## Read-only owner preview (PR #81)
- `/api/phase5/owner/portfolio?projectId=...`
- `/api/phase5/agents/<agent-id>/biography?projectId=...`
- Requires `SCOTTY_ENV=staging`, `SCOTTY_PHASE5_STAGING_ENABLED=true`, `SCOTTY_PHASE5_READ_ONLY=true`, pinned RS256 JWT verification and exact owner issuer/audience/subject.
- Reads through `SCOTTY_PHASE5_STAGING_DATABASE_URL` only; no production DATABASE_URL fallback.

## New dormant job lifecycle (V18)
- `lifecycle.ts`: proposed -> owner-approved -> assigned -> specialist submission -> chief review/revision -> accepted -> owner closure; reassignment/revocation and version checks.
- `assignment-store.ts`: transactional task/event contract, atomic rollback and compare-and-swap version enforcement.
- `postgres-assignment-store.ts`: PostgreSQL implementation not connected to live routes. Extra write flag and emergency stop must explicitly permit staging writes, otherwise DENY.
- `staging-schema.sql`: **UNAPPLIED migration draft**, requiring a verified separate staging database.
- `src/workspace/phase5-policy.test.ts`: regression cases included in repository workspace tests.

## Acceptance blockers (do not enable staging writes yet)
1. Real identity provider, bound owner approvals, chief/specialist identities and permission proof.
2. Independently proven isolation of staging database and read/write roles; RLS and revocation verification.
3. Explicit owner-approved migration, backup and restoration; immutable audit retention.
4. Real Postgres multi-request tests and verified end-to-end HUD biography updates.
5. Owner sign-off for each new task; 185-agent roster retained unchanged.

The local V18 package passed 82 offline tests, but the real Postgres adapter and OIDC integration have **not** passed live staging acceptance.

**RELEASE DECISION: DENY. Do not merge or deploy without review.**
