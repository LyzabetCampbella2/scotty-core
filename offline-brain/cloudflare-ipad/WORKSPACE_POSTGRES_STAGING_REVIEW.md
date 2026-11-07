# Staging PostgreSQL integration review

Inspected existing repository: `src/agents/brain.ts` defines memory scopes and actor permissions; `src/agents/postgres-store.ts` already creates agent brain, proposal and approved memory tables on connection; `src/agents/agent-runtime-api.ts` uses authenticated agent credentials and feature flags. **Do not replace or migrate those existing stores without schema and security review.**

This draft adds a separate, opt-in PostgreSQL workspace-records adapter and additive SQL schema, without running migrations or connecting to a database. The SQL enables FORCE ROW LEVEL SECURITY with **no permissive policies**: it intentionally denies all normal access until a reviewed trusted database role and project-level RLS policy exist. Even with a confirmed staging flag, the adapter is not usable with that schema alone.

Required integration work: inspect the actual staging schema and server session/agent authentication; design role and project RLS policies; verify existing DB role cannot bypass RLS; configure a separate staging connection; ensure trusted context cannot be client-supplied; test concurrent transactions, audit immutability, pagination, revoked permissions and backup recovery; then connect to existing HUD routes. Never point staging code at production credentials.

No production connection, paid resource, migration, deployment, real user data or secrets were used.
