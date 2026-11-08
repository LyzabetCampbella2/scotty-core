# SCOTTY Stage B / Phase 3 — Offline Knowledge Catalog Draft

**Status:** DEVELOPMENT STARTED / OWNER REVIEW PENDING. Based on SCOTTY Master Build Checklist, Stage B Phase 3, with 185 frozen role identities and 25 departments.

**Dependent PRs:** Stage A0 #76; Stage B Phase 1 #77; Stage B Phase 2 #78. All are draft/unmerged. Their real operational acceptance is pending.

## Current implementation

- `src/knowledge/phase3-draft-catalog.mjs` creates **185 role-level knowledge review packs** from source-attributed internal working procedures already drafted in Stage B Phase 1. Each contains a methodology section, explicitly fictional worked example, known limitations, and three outstanding knowledge-verification requirements. None are externally verified.
- The same module creates **25 department-level reference guides** from the corresponding chief's earlier authored procedures. They remain unapproved candidate standards and are not promoted into live shared memory.
- Each candidate preserves the exact immutable canonical agent ID and department. Internal origin provenance points to authored method files and their recorded predecessor Git blob SHA. This proves only the development file/version used, **not that any professional fact has been independently verified**.
- Specialist candidate external references (if present) stay marked `verified:false`, `checkedAt:null`, `contentRetrieved:false` and `citationReady:false`. No external URL or private file is fetched by the module.
- A read-only, purely local search checks only the requesting canonical agent's role pack and its department's chief guide. Search hits explicitly say `isProfessionalCitation:false` and `trustworthyExternalEvidence:false`. It is not an authenticated runtime permission system.
- Fictional project/brand knowledge may be described in a non-executable proposal; projects must have `synthetic-` IDs and sample content must begin `SYNTHETIC:`. These labels are **developer conventions, not privacy guarantees**. Never place real customer documents, creative manuscripts, photos, secrets or private media into these fixtures.
- No live tools, durable search index, model/provider calls, production data, memory writes, OAuth links, real project permissions or activation were added.

## Safe offline checks

```bash
node --test src/knowledge/phase3-draft-catalog.test.mjs
node scripts/phase3-export-draft-catalog.mjs > /tmp/scotty-b3-knowledge-candidates.json
```

The exporter verifies the SHA of the owner-approved 185-roster Git blob before printing. The output consists of review candidates, not verified facts.

## Phase 3 pass/fail checklist

- [x] Assemble source-attributed internal methodology candidates for all 185 role IDs
- [x] Assemble 25 department-guide review candidates
- [x] Track missing external source verification and explicitly suppress professional citations
- [x] Add offline, role/department-limited search and synthetic project-proposal tests
- [ ] Curate and independently approve 185 accurate source-grounded specialty libraries
- [ ] Verify authoritative source contents, exact citation support, dates, licenses and trust levels
- [ ] Add permitted media metadata indexing and real per-project/brand knowledge boundaries
- [ ] Integrate actual authenticated retrieval with Phase 2 server-enforced membership and access
- [ ] Test 185 role-appropriate retrievals, refusal/uncertainty when sources are missing, and citation correctness
- [ ] Add automated freshness checks for changing laws, APIs, prices, medicine and standards under an approved zero-cost policy
- [ ] Obtain individual owner acceptance of knowledge packs and Phase 3 safety evidence

**Phase B3 is NOT certified.** Synthetic CI tests do not prove real factual expertise, source correctness, production privacy, or durable retrieval.

**Owner constraints:** $0 newly authorized infrastructure spending. Separate owner approval is required before accessing/exporting production data. No real agent activation or merges/deploys from this draft.
