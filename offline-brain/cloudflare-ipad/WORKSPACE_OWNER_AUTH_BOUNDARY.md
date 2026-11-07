# Owner-authenticated workspace staging boundary

Repository inspection confirms `src/auth/cloud.ts` exposes `isCloudAuthenticated(request)`, checking the existing hashed session cookie against `scotty_sessions` and expiration. The owner-session context factory in this branch is **not yet wired to that module**. A future trusted server adapter should pass `isCloudAuthenticated` as `verifyOwnerSession`, a server-side project membership loader as `loadAuthorizedProjectIds`, and `crypto.randomUUID` as `newId`.

No project permissions are accepted from a request body. Missing authentication or project membership fails closed. A same-origin write guard is provided, but real deployment also needs CSRF token strategy, trusted host configuration, session expiration/revocation tests, rate limits and server-side authorization at every endpoint.

Existing `src/agents/postgres-store.ts` has live brain and memory tables. The workspace PostgreSQL schema remains additive, unapplied and deny-by-default. No database connections, deployments, production code modifications or secrets are involved.

Next: review actual project-membership table schema and staging database role; wire verified owner session to an isolated route behind a disabled-by-default flag; enforce RLS with a project context; validate integration in synthetic staging; connect live HUD subscriptions after QA.
