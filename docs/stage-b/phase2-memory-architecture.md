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
