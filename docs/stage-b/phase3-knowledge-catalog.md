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

## Evidence-review queue, freshness triage and citation integrity — November 8, 2026

**Phase 3 source review is now itemized for every agent.** The new `src/knowledge/phase3-evidence-queue.mjs` generates exactly **555 unverified source-evidence review items**, three for each of 185 canonical IDs. Each item retains an exact role and knowledge-requirement ID, proposed source candidates, separate source/rights/claim/independent reviewer/owner approval fields, and default-deny citation/index permissions. All **555 are still pending**, and no publication or claim has been externally read or verified.

The `previewSourceMetadata()` function examines **untrusted metadata only**: the claimed publication and review dates, public HTTPS URL format, role/requirement alignment and review recency. It rejects client-supplied approval/evidence claims, non-HTTPS credentials and unsuitable local/private hostnames. It classifies potentially stale metadata against **proposed**, not owner-approved, domain-dependent intervals (30, 60, 90 or 365 days). Even a recent or correctly shaped source is returned with `realSourceVerified:false`, `citationAllowed:false`, and `knowledgeApproved:false`.

The new `runPhase3OfflineRetrievalChecks()` exercises exactly **185 local draft searches**, one for each frozen agent. It checks the actor ID and restricts output to the agent's internal method section and its assigned department's chief guide. It is *not* a live indexed search service, cannot authenticate the calling actor, uses no real private/project data, does not run models and issues no professional citations.

The `src/knowledge/phase3-citation-fixtures.mjs` module creates **555 fictional citation-integrity cases**. Each test shows that an exact quotation appears at the expected location in the synthetic source text and that its SHA-256 text digest matches. Unsupported quotes, altered contents, forged agent identities, inserted approval flags and cross-requirement replays are rejected. Crucially, a matching fictional quotation **does not prove the meaning of the claim**, the original publisher, license, source freshness, real model behavior or owner approval: every test returns `realCitationValid:false` and `factualClaimVerified:false`. Citation assertions remain blocked.

### Read-only local exports

```bash
node scripts/phase3-export-evidence.mjs queue > /tmp/scotty-b3-source-review-queue.json
node scripts/phase3-export-evidence.mjs retrieval > /tmp/scotty-b3-retrieval-smoke.json
node scripts/phase3-export-evidence.mjs synthetic-citations > /tmp/scotty-b3-citation-qa.json
```

These commands verify the Git blob hash of the 185-ID frozen roster, print JSON, and do not fetch sources, create indexes, access credentials, spend on models or write production records. Do not import user information or protected customer materials into fictional fixtures: a `SYNTHETIC:` prefix is a convention, **not a privacy guarantee**.

The full combined Phase B3 source-review, retrieval and citation-integrity suites passed in GitHub Actions: <https://github.com/LyzabetCampbella2/scotty-core/actions/runs/42507621889>.

**Still missing for the real Phase 3 exit gate:** human source/content inspection and licensing checks; confirmed claim-to-quotation semantic support; source version hashes; independently authenticated owner approvals; real permissioned, persisted searchable knowledge; real per-agent retrieval/citation QA; evidence-backed update/freshness routines; and all A0/B1/B2 operational dependencies.
