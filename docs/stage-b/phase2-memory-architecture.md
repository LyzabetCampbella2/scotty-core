# SCOTTY Stage B / Phase 2 — Offline Memory Architecture Draft

**Status:** Development blueprint only. Stage A Phase 0 and Stage B Phase 1 have not passed operational acceptance. No new database, durable memory store, production-data access, paid provider, migration, deployment or live agent activation was authorized.

**Workbook:** Phase 2 is Individual and Shared Memory. Its exit gate requires durable memory that survives restart, true cross-agent/project isolation, corrections and deletion, owner-consented shared promotion and tested encrypted recovery.

## Implemented in the dependent draft branch

- Exact 185-ID source mapping from the owner-approved frozen roster (25 chiefs, 160 specialists).
- Proposed scopes: **individual**, **department**, **project**, **explicit_shared**, **owner_only**.
- Data classes: **SYNTHETIC_PUBLIC**, **OWNER_PRIVATE**, **PROJECT_CONFIDENTIAL**, **THIRD_PARTY_RESTRICTED**.
- Proposed memory fields: memory and agent IDs, department, project, provenance, scope, data class, consent reference, source, timestamps/expiry, supersession/version and content reference.
- A pure scope evaluator that rejects forged departments, unknown IDs, scope mismatches and owner-only/shared/restricted data. A structurally matching request returns **NEEDS_EXTERNAL_PERMISSION_VERIFICATION**, never authorization for actual data access.
- Proposed correction/supersession/archive/deletion actions that do not mutate records or revoke/restore anything.
- Synthetic negative tests and a read-only JSON blueprint export.

## Safe offline commands

```bash
node --test src/memory/phase2-policy.test.mjs
node scripts/phase2-export-memory-plan.mjs > /tmp/scotty-b2-memory-blueprints.json
```

These are synthetic architectural artifacts, not actual private memory, an API server or a production access policy.

## Acceptance checklist

- [x] Model the five scopes and four data classes in a default-deny design
- [x] Define provenance, consent, expiry, correction and deletion schema requirements
- [x] Create synthetic negative tests for unauthorized roles, agents and projects
- [x] Produce non-executable memory lifecycle plans
- [ ] Verify independently isolated staging and authoritative memory store before migrations
- [ ] Obtain separate owner approval before any real production-data access or export
- [ ] Implement authenticated, durable server-side records and row-level enforcement
- [ ] Prove reliable retrieval, deduplication and persistence across sessions/restarts
- [ ] Implement owner-approved shared promotion and revocation
- [ ] Prove actual correction, deletion, retention and encrypted backup/restore
- [ ] Complete owner HUD memory review/correction with provenance and permissions
- [ ] Independently test cross-agent/project isolation and collect owner acceptance

**Stage B Phase 2 started as a design and test branch; operational memory has not been built or certified.** The owner’s $0 new infrastructure spending cap remains in force. The real system must use a trusted session and verified owner grants, never a caller's asserted identity, department or approval flag.

## New: ephemeral synthetic-memory laboratory

The separate `src/memory/phase2-synthetic-lab.mjs` module now offers a **process-local, entirely fictional** test harness. It has no database, external tool, model connection, network API, filesystem integration or persistent memory. It is not imported by SCOTTY's HTTP server.

The laboratory exercises:
- Candidate memory creation with source and project metadata, explicit test-owner acceptance before search visibility, and same-agent/project content deduplication.
- Individual, department, project and explicitly named recipient sharing; project-tagged records require the reader's matching synthetic project membership, even when promoted to departmental sharing.
- Forged test-context denial, 185 canonical agent IDs, cross-department isolation and synthetic consent before sharing.
- Correction/version linking, separate acceptance of corrected drafts, archival and synthetic tombstone deletion.
- Erasure **across an entire correction lineage** in the simulated store, plus expiry hiding and explicit fake-retention purge, with receipts clearly stating that *real backup reconciliation was not performed*.
- Fictional snapshot serialization and **simulated restart** into a second in-memory object. Test sessions are intentionally not transferred to the new object.
- Refusal of unexpected request fields, real data-class arguments, malformed snapshots, tombstones that still contain text and fake encrypted backup claims.

The special `SYNTHETIC:` prefix is only a **developer convention**, not a privacy classifier or detector; it cannot reliably prevent someone from putting real personal information inside a fixture. Never feed live user information, manuscripts, audio, production backups or API credentials into this laboratory. The simulated test-owner context may be minted by test code and therefore **is not authentication or owner approval**.

### Additional tests

```bash
node --test src/memory/phase2-policy.test.mjs src/memory/phase2-synthetic-lab.test.mjs
```

CI runs both suites without any configured database credentials or network endpoints. Passing them verifies the behavior of an **ephemeral synthetic simulator**, not actual session-persistent memory or authorization.

### Operational Phase 2 completion remains blocked

This still requires an independently isolated durable database, trusted owner/agent session authentication, server-side row-level and project permission enforcement, genuine retrieval across process restarts, deletion/retention throughout independently recovered backups, consented shared-memory promotion/revocation, audit receipts, owner HUD controls and independent real-data recovery—only after the owner's separate production-data access approval. No migration or production integration was attempted.

## Disposable PostgreSQL persistence and independent synthetic restore

An additional CI-only fixture is implemented in `src/memory/phase2-postgres-fixture.mjs` and `migrations/b2_ephemeral_ci_fixture_001.sql`. The connection is **refused unless** running under GitHub Actions with `SCOTTY_B2_EPHEMERAL_DB_TEST=yes`, the exact PostgreSQL loopback URL, the `b2_ci` role, and the exact disposable database `scotty_b2_ci`. Production and A0 staging connection reuse is rejected. The fixture uses the existing `postgres` library; no new permanent provider or persistent infrastructure was provisioned.

This is the first **real SQL persistence test of fictional memory** in this phase. It has synthetic-only database constraints; transaction-based test-owner acceptance and corrections; SQL WHERE-level restrictions for individual, department, project and named-recipient searches; fixed source/TTL metadata; same-owner/project active-content dedupe; synthetic share revocation; correction-lineage deletion; and synthetic expiration cleanup.

A newly constructed fixture-store instance can retrieve previously committed fictional records from the same ephemeral PostgreSQL database but **cannot reuse the old test-session objects**. SQL source and fake approval flags are excluded from ordinary query results. This is narrower than real session/restart persistence because the database lives only during CI and the owner/agent test identities are not independently authenticated.

The dedicated CI integration suite also:
- Rejects wrong agent/project scopes, unrecognized input fields and fictitious private-data classifications.
- Tests correction histories, second acceptance, revocation and deletion across versions.
- Dumps the synthetic SQL fixture and independently restores it into a **second disposable database** named `scotty_b2_ci_restored`; compares record counts and event receipts and verifies restored deletion tombstones carry no text.
- Uses **no real credentials or production information**. The copy/recovery rehearsal is not encrypted and is *not* a real-production recovery test, nor a proof that the data is protected from a privileged database administrator.

**Latest verified CI at functional commit:** <https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42497823547> — both offline policy tests and disposable PostgreSQL integration/independent restore passed.

**Acceptance gap remains:** this test owner session is explicitly mintable by test code; production-grade auth, server-side per-record grants/row-level security, real durable hosting, data lifecycle, real backups, live memory search and original owner approvals are NOT implemented. The database is destroyed after the CI job.
