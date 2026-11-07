# Agent workspace runtime — isolated integration

This branch adds an injected transactional store interface and a trusted-server-context contract for owner-reviewed assignments and source-backed knowledge proposals. Biography and HUD snapshots derive from records in the injected store, not hardcoded sample assignments.

## Not production-ready
The included SyntheticTransactionalStore is **in-memory and not durable**. It is not a database integration. `verifiedByServer` is an interface assertion, not actual authentication: production must construct the context from validated sessions and enforce tenant/project permissions at the database boundary. The store's synthetic transactions are not safe under concurrent writes. Do not expose this module directly to untrusted requests.

The HUD is still JSON data, not an interactive UI; there are no real events, autonomous agent execution, LLM calls, knowledge refresh or live voice routing. No real user data is read, stored or embedded.

## Integration checklist
- Identify and inspect the authorized existing database and its schema before writing migrations.
- Implement an encrypted transactional adapter with database RLS, audit logs, backups and retention.
- Wire authenticated backend routes and project-scoped permissions; test revocation and cross-tenant access.
- Connect project assignment UI and HUD subscription/events to approved persisted records.
- Add approved evidence ingestion, source freshness policies and reviewer sign-off.
- Validate synthetic tests and staging end-to-end behavior before requesting a production merge/deployment.
