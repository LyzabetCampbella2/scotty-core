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

## First public-authority inspection pilot — November 8, 2026

Five *public, official online references* have been opened and inspected by the assistant, with a short original-language paraphrase of one relevant point, the publication or document version when shown, the page section, the date observed and a specific application boundary. This is a **manual source-inspection pilot**, not a third-party endorsement, independent human fact check, accepted citation library, copyright/license authorization, or proof of any deployed agent's competence.

The records are in `docs/stage-b/b3-public-source-pilot-2026-11-08.json`:

| Chief / knowledge need | Official page | Inspected point | What is still required |
|---|---|---|---|
| BONES (K1) | [MedlinePlus: Evaluating Health Information](https://medlineplus.gov/evaluatinghealthinformation.html) | Examine publisher, references, editorial practice and date before applying health information | Independent clinical-scope/claim review; not personal medical advice |
| TROI (K1) | [W3C: WCAG 2.2 Recommendation](https://www.w3.org/TR/2024/REC-WCAG22-20241212/) | Testable web accessibility criteria; not sufficient for every user's needs | Test exact SCOTTY interface criteria and verify conformance |
| WORF (K1) | [NIST SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final) | No implied trust merely because of network location or asset ownership | Actual live resource-by-resource authorization proof |
| GEORDI (K3) | [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) | Explicit `permissions` declarations narrow token scopes | Verify actual repository policy, job scopes and approval |
| TORRES (K2) | [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | RLS-enabled tables default-deny absent matching policies, subject to bypass caveats | Verify actual DB schema, grants, policies and denied operations |

The new module `src/knowledge/phase3-public-source-pilot.mjs` cross-checks all five pilot entries against exact immutable chief identities and one of their 555 outstanding knowledge requirements. It rejects incorrect domains/path/HTTPS, unexpected fields, forged owner approvals, claimed source certification, duplicate identities or missing source dockets. It **never performs HTTP requests**; it validates a manifest summarizing earlier public-page inspection. It does not write the contents to agent knowledge or alter the 555 pending source-review dockets.

**Read-only review report:**

```bash
node --test src/knowledge/phase3-public-source-pilot.test.mjs
node scripts/phase3-export-public-pilot.mjs > /tmp/scotty-b3-public-review.json
```

**Evidence distinction:** Five public documents were manually inspected and their claim context summarized, but **0** sources were independently human-reviewed, **0** claims were approved for live citations, **0** libraries became agent-readable, and **0** real model-based retrieval tests were performed. License/redistribution review and source freshness still need verification. The page URLs and short paraphrases are included for future review, not as production training materials. No private or production records were used.

The pilot is a step toward source-backed knowledge, not Phase 3 completion.

## Second public-source pilot — five additional chiefs, November 8, 2026

Five further public primary-publisher pages were inspected and recorded. These extend the earlier five-chief pilot to **10 unique chief identities**. Each item links to one existing requirement in the original **555** unapproved knowledge-source review dockets, and none is a validated, licensed or owner-approved library entry.

| Chief | Exact public reference | Inspected planning insight | Boundary |
|---|---|---|---|
| DATA | [NLM: PubMed User Guide](https://pubmed.ncbi.nlm.nih.gov/help/) | Search terms, filters, field tags and citation lookup methods; page last updated Sept. 30, 2026 | A search hit is not proof that a study conclusion is correct |
| JANEWAY | [NASA Science: What's a transit?](https://science.nasa.gov/exoplanets/whats-a-transit/) | A transiting exoplanet can cause a dip in a star's observed light curve | A brightness dip alone does not establish every planetary property or exclude alternatives |
| SEVEN | [NIST Technical Note 1297](https://www.nist.gov/pml/nist-technical-note-1297) | How to identify and express components of measurement uncertainty; 1994 edition | Not a blanket validation of dataset quality or statistical model assumptions |
| QUARK | [U.S. SBA: Plan your business](https://www.sba.gov/counseling/plan-your-business/) | Traditional and lean business plans; research, assumptions and projections | A proposed plan does not guarantee demand, profitability or funding |
| ZORA | [U.S. Copyright Office: What Does Copyright Protect?](https://copyright.gov/help/faq/faq-protect.html) | Protection of original creative expression, but not underlying ideas and methods | General U.S. guidance is not an individual legal opinion or a license to use others' works |

The addition is stored as `docs/stage-b/b3-public-source-expansion-2026-11-08.json`, preserving the original five-entry manifest unchanged. The module `src/knowledge/phase3-public-source-expansion.mjs` cross-checks both manifests against **10 different frozen chief identities** and 10 distinct source dockets. It rejects a wrong official domain/URL path, incorrect chief or requirement, duplicate public reviews, forged owner approval, unverified license/claim promotion, unexpected fields and invented publication-date metadata. It checks **only authored metadata**: there is no HTTP request or external model call in GitHub CI.

`src/knowledge/phase3-coverage-plan.mjs` now measures remaining work across all frozen agents:

- **185** canonical agent roles and **555** source-verification requirements still pending independent acceptance
- **10** manually inspected public-page candidates for **10 chiefs**
- **15** chiefs without any manually inspected public-page candidate
- **160** specialists without an inspected public-page candidate
- **545** dockets not yet associated with any assistant-inspected official page
- **0** independently reviewed/owner-approved live citations or validated knowledge packs

### Zero-network exports

```bash
node scripts/phase3-export-public-expansion.mjs review > /tmp/scotty-b3-ten-chief-public-review.json
node scripts/phase3-export-public-expansion.mjs coverage > /tmp/scotty-b3-uninspected-roles.json
```

**Important:** This is assistant-led page inspection and source candidate organization. It is neither an independent human review nor user approval. The `citationPromotionAllowed`, `ownerApproved`, and `citableByLiveAgents` flags remain false, and no personal or production source material was retrieved. Stage B Phase 3 remains a **development phase**, not a certified expertise service.

## All 25 chief reference candidates assembled — November 8, 2026

A third assistant-led public-source inspection round added **15 distinct** official reference candidates for the remaining chiefs. These are separate from, and leave unchanged, the two earlier five-chief manifests. New source manifests remain reference *candidates*, not owner-accepted model knowledge.

| Chief | Inspected official reference | Proposed role-specific methodological use |
|---|---|---|
| ARCHER 2 | [U.S. IES What Works Clearinghouse: Organizing Instruction and Study](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) | Spacing, retrieval, worked examples and explanatory questions, with evidence-strength distinctions |
| CRUSHER | [NIH: Rigor and Reproducibility](https://www.grants.nih.gov/policy-and-compliance/policy-topics/reproducibility) | Experimental controls, transparent biological-method interpretations and reproducibility |
| DAX 2 | [U.S. National Archives: Document Analysis](https://www.archives.gov/education/lessons/worksheets) | Establish primary-source context, examine source details, make cautious inferences |
| HOLOGRAM | [W3C WAI: Images Tutorial](https://www.w3.org/WAI/tutorials/images/) | Differentiate informative, decorative and functional image alternatives |
| NEELIX 2 | [CDC: Making an Emergency Plan](https://www.cdc.gov/disability-emergency-preparedness/people-with-disabilities/make-a-plan.html) | Household contingencies, supplies, contacts and tailored planning boundaries |
| OBRIEN | [Google SRE: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) | User-visible symptoms, hidden causes and actionable monitoring signals |
| PIKE | [PMI: What Is Project Management](https://www.pmi.org/about/what-is-project-management) | Scope, deliverables, risk and adaptive/predictive delivery methods |
| SISKO 2 | [SBA: Manage Your Business](https://www.sba.gov/counseling/manage-your-business/) | Small-business operational review, financial management and continuity |
| TUVOK 2 | [NIST SP 800-53A: Assessing Controls](https://www.nist.gov/publications/assessing-security-and-privacy-controls-information-systems-and-organizations) | Evidence-backed independent control assessment and risk reporting |
| KEIKO | [EPA: Quality Management Tools for Projects](https://www.epa.gov/quality/epa-quality-management-tools-projects) | Environmental data-quality assessment and quality-assurance planning |
| KIRK | [USFA/FEMA: NIMS Command and Coordination](https://www.usfa.fema.gov/a-z/nims/command-and-coordination.html) | Define incident responsibilities, resource coordination and escalation |
| PICARD | [UN Codification Division: Charter Article 2](https://legal.un.org/repertory/art2.shtml/art2_7.shtml) | Diplomacy context, good-faith commitments and peaceful dispute principles |
| RIKER | [U.S. Digital Services Playbook](https://playbook.usds.gov/) | Understand owner/user needs, coordinate full service journeys, iterate |
| SPOCK | [NIST AI RMF: Manage](https://airc.nist.gov/airmf-resources/playbook/manage/) | Compare risk, benefit, uncertainty and go/no-go decision options |
| UHURA | [U.S. Digital.gov: Plain Language Principles](https://digital.gov/guides/plain-language/principles) | Audience-matched communication and clear writing; translation accuracy still untested |

**Results:** 25/25 chiefs now each have **one assistant-inspected public official reference candidate**; all **160 specialists** still need individually relevant public-source inspections. These 25 items are a **subset** of 555 evidence requirements, leaving **530 dockets without inspected public candidate**. All 555 independent review decisions remain pending.

Implementation: `docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json` records 15 additional official references, roles, source sections, paraphrases, limitations and no-approval flags. `src/knowledge/phase3-all-chief-public-review.mjs` validates exactly 25 unique frozen chiefs across all three preserved manifests, exact URL host/path, K1 dockets for the added 15, date consistency and forbidden grant fields. CI and `scripts/phase3-export-all-chief-public-review.mjs` generate **read-only** review status.

All 25 candidate claims still need an **independent reviewer** to check current source pages, precise support, rights and limitations; then an exact trusted owner decision. None is licensed to power live agent retrieval, citation, private-memory promotion, legal/medical decision-making or autonomous execution. Public research never substitutes for the A0/B1/B2 acceptance gates.

```bash
node --test src/knowledge/phase3-all-chief-public-review.test.mjs
node scripts/phase3-export-all-chief-public-review.mjs > /tmp/scotty-b3-all-chief-review.json
```

**This completes chief initial public-source coverage only, not Phase 3 knowledge certification.**

## Next research queue — all 160 specialists, November 8, 2026

Chief initial reference coverage is now **25/25**, but each specialist must receive its **own evidence sources**; a chief's inspected page does not confer knowledge certification on its specialists.

The new `src/knowledge/phase3-specialist-research-backlog.mjs` creates **160 individual specialist briefs** directly from the frozen roster, with a separate research question for each of the specialist's three existing knowledge requirements: **480 requirement-level research tasks**. The topics preserve each actual specialty and department/chief relationship. Every task asks for a current appropriate primary authority, exact version/section/date, supporting and contradicting evidence, licensing/rights and independent review.

The source families are only suggestions for where reviewers should look (for example, educational research guides, primary historical archives, official software specifications or original science). They are not fetched URLs or proofs. No specialist source has been opened through this new backlog, no credential or private data has been requested, and none of the 480 requirements has been approved.

```bash
node --test src/knowledge/phase3-specialist-research-backlog.test.mjs
node scripts/phase3-export-all-chief-public-review.mjs specialists > /tmp/scotty-b3-specialist-research-backlog.json
```

The updated offline CI tests confirm exactly 160 frozen specialist identities, 480 unique review IDs, 25 intact chief links and **zero** implied inherited chief approval, verified specialist claims or allowed live citations.

**The remaining source-research queue:** 480 specialist evidence needs plus 50 uninspected second/third chief evidence needs, totalling **530** dockets without manually inspected public candidate. All 555 original evidence decisions remain pending independent review. No real model retrieval tests or operational approvals have occurred.

## First eight specialist public-source candidates — Health & Human Support, November 8, 2026

The first **eight** of the 160 specialists now have *one individually relevant, assistant-inspected public reference candidate* each. This is a separate inspection batch, not inheritance from chief BONES. It preserves their approved roster names, specialties and exact K1 review dockets.

| Specialist | Specialty | Inspected authoritative public reference | Proposed usage / limitations |
|---|---|---|---|
| Vaultguard (BONES 01) | Health literacy | [CDC: What Is Health Literacy?](https://www.cdc.gov/health-literacy/php/about/index.html) | Explain personal versus organizational comprehension/access responsibilities; no individual understanding guaranteed |
| JAG (BONES 02) | Clinical evidence appraisal | [Cochrane: Risk of Bias in Randomized Trials, Chapter 8](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-08) | Propose structured trial bias appraisal; not automatic verification of studies, nonrandomized designs or treatments |
| Garax (BONES 03) | Appointments and questions | [AHRQ: Questions Are the Answer](https://www.ahrq.gov/questions/index.html) | Provide neutral appointment preparation prompts; no diagnoses or medical triage |
| Design (BONES 04) | Medication literacy | [FDA: Learn About Your Medicines](https://www.fda.gov/patients/learn-about-your-medicines) | Refer to official patient labeling and pharmacist questions; never change dosing or personalize drug instructions |
| Vic (BONES 05) | Care coordination | [AHRQ: Care Coordination](https://www.ahrq.gov/topics/care-coordination.html) | Clarify care-team communication/ownership; no access to records or real care orchestration |
| Miles (BONES 06) | Mental health resources | [NIMH: Help for Mental Illnesses](https://www.nimh.nih.gov/health/find-help) | Point to public ways of locating help and trained support; no diagnosis, referral certification or sensitive-record collection |
| Lwaxana (BONES 07) | Nutrition literacy | [HHS/USDA: Current Dietary Guidelines, 2025–2030](https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines/current-dietary-guidelines) | General dietary education using the current edition; never infer individual dietary treatment needs |
| Seven (BONES 08) | Accessibility support | [ADA.gov: Communicating Effectively with People with Disabilities](https://www.ada.gov/topics/effective-communication/) | Choose suitable communication aids by context and preference; no legal compliance certification |

**Evidence status:** These eight are official publisher references inspected by the assistant and summarized in original wording with explicit role-specific limitations. They have not been independently checked by a separate reviewer, approved by the owner, legally cleared for reuse in live services, or tested through real-model retrieval. The references were not scraped or ingested into any agent, and no private records or health data were accessed. Health information is deliberately limited to public informational-method concepts.

**Files:** `docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json` stores eight unchanged source assignments and unapproved flags; `src/knowledge/phase3-eight-specialist-public-pilot.mjs` validates their exact canonical IDs, fixed public hosts/paths, claim metadata and each open K1 docket. `src/knowledge/phase3-eight-specialist-public-pilot.test.mjs` exercises URL substitution, identity replay, date tampering and forged approval/health-access fields.

```bash
node --test src/knowledge/phase3-eight-specialist-public-pilot.test.mjs
node scripts/phase3-export-eight-specialist-public-pilot.mjs > /tmp/scotty-b3-eight-specialist-review.json
```

**Coverage after this pilot:** 25 chief source candidates + 8 specialist source candidates = **33 of 555** dockets with an inspected public reference. **522** source dockets still lack an inspected candidate, comprising 50 chief K2/K3 plus 472 specialist requirements. **152 of 160** specialists still have no individually inspected source. All **555** external-evidence decisions still await independent acceptance and owner authorization. **0** approved agent knowledge libraries, **0** real model retrieval evaluations, and **0** agents activated.

## BONES complete and DATA first-source batch — 11 more specialists (November 8, 2026)

The next **11** distinct specialists now have one assistant-inspected official, professional or research-institution public-reference candidate tied to their individual frozen **K1** requirement. This is a source-discovery and methodology pilot, **not an independently accepted knowledge library**.

| Specialist | Specialty | Public source inspected | Proposed method and important limitation |
|---|---|---|---|
| Merchant (BONES 09) | Emergency planning | [CDC: Stay Connected](https://www.cdc.gov/prepare-your-health/plan-ahead/stay-connected.html) | Prepare communication/reunification checklists; cannot replace local emergency orders or store private contacts |
| Sato (DATA 01) | Source evaluation | [Cornell Library: Evaluating Sources](https://guides.library.cornell.edu/GrandChallengesProgram/EvaluatingResources) | Check authority, date, purpose, accuracy and bias; scoring cannot prove a claim true |
| Resolver (DATA 02) | Fact verification | [FactCheck.org: Our Process](https://www.factcheck.org/our-process/) | Trace claims to original evidence and editor checks; a newsroom's method is not proof every output is correct |
| PADD (DATA 03) | Research synthesis | [Cochrane Handbook](https://www.cochrane.org/handbook) | Plan reproducible searching, appraisal and interpretation; primarily healthcare interventions |
| Subspace (DATA 04) | Literature review | [NLM PubMed User Guide](https://pubmed.ncbi.nlm.nih.gov/help/) | Record reproducible search concepts, field tags and review filters; PubMed is not a universal source corpus |
| Hoshi (DATA 05) | Document analysis | [National Archives: Analyze a Written Document](https://www.archives.gov/education/lessons/worksheets/analyze-a-written-document-intermediate) | Examine provenance, writer, receiver, context and corroboration; no authentication of a private file |
| Context (DATA 06) | Data collection | [CDC: BRFSS Survey Data & Documentation](https://www.cdc.gov/brfss/data_documentation/) | Review standardized survey design, metadata, response and comparability limitations; no authority to collect personal data |
| CRM (DATA 07) | Citation quality | [Crossref: Metadata Retrieval](https://www.crossref.org/documentation/retrieve-metadata) | Compare DOI and bibliographic metadata; DOI matching does not validate a paper's claims or license abstracts |
| Prime (DATA 08) | Uncertainty tracking | [NIST: Measurement Uncertainty](https://www.nist.gov/glossary-term/39291) | Describe quantities and precision; measurement uncertainty is not all forms of factual uncertainty |
| Watchtower (DATA 09) | Information retrieval | [NIST TREC: How To TREC](https://trec.nist.gov/howto.html) | Define corpora, queries, relevance judgments and comparative retrieval tasks; no proof of SCOTTY search quality |
| Audit Sec (DATA 10) | Evidence comparison | [USGS: Scientific Peer Review](https://www.usgs.gov/survey-manual/5023-fundamental-science-practices-peer-review) | Compare hypotheses, designs, bias, uncertainty and conclusions; USGS procedure does not certify outside work |

**Evidence status:** The new source list is assistant-researched from public publisher pages. The third-party fact-checking publisher's transparency description is presented as an example of its reported process, **not** a government verification guarantee. Dates are recorded only when supported by the original publisher page. None of the 11 claims was independently human-reviewed or granted a live citation license by the project owner; no real-model source retrieval, personal health data, manuscripts or connected-account records were used.

**Implemented:** `docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json` preserves the candidate references, concise original paraphrases and refusal flags. `src/knowledge/phase3-next-eleven-specialist-public-pilot.mjs` cross-checks the 11 exact frozen IDs, names, specialties, department/chief relationships, K1 dockets, official HTTPS host/path, publication metadata and false approval/citation claims. Tests reject substituted domains, credentials, duplicate agents, claims of license or owner acceptance, wrong source requirements and future publication dates. Read-only SHA-locked export:

```bash
node --test src/knowledge/phase3-next-eleven-specialist-public-pilot.test.mjs
node scripts/phase3-export-next-eleven-specialist-pilot.mjs > /tmp/scotty-b3-eleven-public-review.json
```

**Updated cumulative status:** **25 chiefs + 19 specialists = 44** source review dockets associated with an inspected public reference. **141 specialists** remain without any individually inspected public source. **511 dockets** lack a source candidate (50 second/third chief requirements + 461 uninspected specialist requirements). All **555 independent review decisions** remain unapproved, and **zero** live agent knowledge libraries or authorized citations have been created.

**Phase B3 still fails its operational acceptance gate.**

## First ten mixed-department expansion specialists — November 8, 2026

The next ten agents in the **frozen specialist roster** (agent-expansion-001 through -010) now have one public publisher/source review candidate each, attached to their own K1 evidence requirement and intended specialty. Unlike previous BONES and DATA batches, these span ten different departments.

| Frozen specialist | Proposed source and role-specific topic |
|---|---|
| JANEWAY astronomy | [NASA Science: What's a Transit?](https://science.nasa.gov/exoplanets/whats-a-transit/) — observed brightness curves, not proof of a discovery |
| TUVOK fact checking | [FactCheck.org: Our Process](https://www.factcheck.org/our-process/) — claimed editorial primary-source checking process, not a guarantee of accuracy |
| SISKO business planning | [SBA: Plan Your Business](https://www.sba.gov/counseling/plan-your-business/) — traditional/lean planning and assumptions, not a profitability forecast |
| ARCHER curriculum | [IES: Organizing Instruction and Study](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) — spaced learning, quizzes and worked examples with grade-specific evidence ratings |
| TROI accessibility | [W3C WAI: Introduction to Web Accessibility](https://www.w3.org/WAI/fundamentals/accessibility-intro/) — people-focused accessibility principles, not completed compliance testing |
| DAX history | [U.S. National Archives: Document Analysis](https://www.archives.gov/education/lessons/worksheets) — provenance/contextual interpretation, not artifact authentication |
| SEVEN statistics | [NIST e-Handbook: Exploratory Data Analysis](https://itl.nist.gov/div898/handbook/eda/eda.htm) — graphical and quantitative assumption checks, not independent sampling validity |
| OBRIEN workflow automation | [GitHub Docs: Workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows) — YAML triggers/jobs/steps, not proof that SCOTTY has a live automated workflow |
| HOLOGRAM visual design | [W3C WAI: Visual Design](https://www.w3.org/WAI/curricula/designer-modules/visual-design/) — color contrast and non-color cues, not an accessibility audit of any site |
| PIKE project planning | [Project Management Institute: What Is Project Management?](https://www.pmi.org/about/what-is-project-management) — scope, risk and fit-for-purpose delivery approach, not authority to act |

**Exact saved evidence:** `docs/stage-b/b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json` contains all ten frozen IDs, names, departments/chiefs, specialty, URL, page section, original paraphrase, limitations, observed date and false approval fields. Source text was not copied into agent knowledge. Some pages (for example, official online software documentation) may change; their currentness remains a reviewer task.

**Code + QA:** `src/knowledge/phase3-ten-expansion-specialists.mjs` validates these items against the earlier 19 specialist reviews, existing 25 chief reviews, all 185 frozen identities and their exact 555 open dockets. It rejects duplicate/foreign IDs, incorrect specialties, wrong official host/path, credential-bearing or internal URLs, future publication dates and self-asserted independent verification/owner approval/citation permission. The negative tests and read-only SHA-locked exporter run in offline CI:

```bash
node --test src/knowledge/phase3-ten-expansion-specialists.test.mjs
node scripts/phase3-export-ten-expansion-specialists.mjs > /tmp/scotty-b3-ten-expansion-review.json
```

**Updated totals:** **25 chiefs + 29 specialists = 54** individually linked initial public-source candidates; **131 of 160 specialists** still have no inspected candidate. **501 of 555** source-review dockets still lack any public inspection (50 chief K2/K3 + 451 specialist requirements), and **all 555 independent evidence reviews and owner approvals remain pending**. The new batch adds no real-model tests, private-data retrieval, production database, license grants or live agent citations. Stage B Phase 3 remains unapproved and operationally incomplete.

## Second mixed-department specialist batch — expansion 011–020 (November 8, 2026)

Ten additional frozen specialist identities now have **one assistant-inspected public source candidate each**, associated with their original K1 research requirement. These are reference-review notes, **not** independently validated facts or approved live agent knowledge.

| Specialist | Source and proposed methodological use | Important boundary |
|---|---|---|
| CRUSHER biology | [NIH: Rigor and Reproducibility](https://www.grants.nih.gov/policy-and-compliance/policy-topics/reproducibility) — experiment design, bias and reproducibility | Not evidence that any study was actually evaluated |
| TORRES frontend engineering | [W3C WAI: Menus Tutorial](https://www.w3.org/WAI/tutorials/menus/) — semantic navigation and keyboard usability | Does not prove a particular app is accessible or functional |
| NEELIX home organization | [CFPB: Get prepared before a disaster or emergency](https://www.consumerfinance.gov/consumer-tools/disasters-and-emergencies/get-prepared-before-disaster-emergency-strikes/) — secure household document readiness | Not consent to handle personal financial or identity documents |
| JANEWAY geography | [USGS: Geospatial Data](https://www.usgs.gov/geospatial-data) — public mapping catalogs and metadata | Dataset quality and coverage must be checked individually |
| TUVOK test design | [NIST: Combinatorial Testing](https://www.nist.gov/programs-projects/combinatorial-testing) — interaction-focused software test combinations | Not equivalent to complete end-to-end coverage |
| SISKO service design | [UK GDS: Understand users and their needs](https://www.gov.uk/service-manual/service-standard/point-1-understand-user-needs) — user research and prototypes | Does not certify a private business service |
| ARCHER tutoring | [IES: Reading Interventions for Grades 4–9](https://ies.ed.gov/ncee/wwc/PracticeGuide/29) — reading interventions, fluency and comprehension | Age- and subject-specific, not a blanket tutoring method |
| TROI supportive communication | [NIMH: Depression](https://www.nimh.nih.gov/health/publications/depression) — listening, practical support and professional help | No autonomous counseling, diagnosis or crisis care |
| DAX cultural research | [Smithsonian: Recovering Voices](https://naturalhistory.si.edu/research/anthropology/programs/recovering-voices/recovering-voices-research) — collaboration and community knowledge | Not permission to reproduce community cultural material |
| SEVEN data cleaning | [UK Government: Data Quality Framework](https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework-guidance) — completeness, consistency, provenance and change records | Does not authorize editing real datasets or importing private records |

**Implementation:** `docs/stage-b/b3-second-ten-expansion-specialist-public-pilot-2026-11-08.json` stores the ten role-specific reference records. `src/knowledge/phase3-second-ten-expansion-specialists.mjs` validates exact approved IDs, specialties, chief links, pending K1 dockets, fixed source URL locations, date format and all default-deny approval fields. Negative tests reject duplicate source agents, substituted official domains, embedded credentials, wrong scope, invented publication dates and forged owner approval.

**Read-only export:**

```bash
node --test src/knowledge/phase3-second-ten-expansion-specialists.test.mjs
node scripts/phase3-export-second-ten-expansion-specialists.mjs > /tmp/scotty-b3-expansion-011-020.json
```

**Evidence accounting:** The cumulative public-source candidate count is **25 chiefs + 39 specialists = 64 dockets**, leaving **491 of 555 dockets without an inspected candidate**. **121 specialists** have not yet received any inspected public candidate. None of the 555 dockets has received independent source verification and exact owner authorization; there remain **0** approved live citations, certified knowledge libraries or real agent-model evaluations.

The official pages above were consulted for planning and were not imported into running agents. Their precise claims, source versions, rights and current status require fresh independent inspection before any acceptance. This remains an offline, unmerged development stage.

## Third mixed-specialist public-source batch — expansion 021–030 (November 8, 2026)

Ten more frozen specialists have exactly one new public original-publisher reference candidate, tied to their individual K1 source-evidence docket. The assistant reviewed these pages to record the following limited original paraphrases; the claims are **not independently verified** or approved as live agent knowledge.

| Specialist | Public source / proposed scope | Limitation |
|---|---|---|
| OBRIEN reliability | [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) — measurable service health, SLI/SLO and error budgets | No operating SCOTTY service monitoring was verified |
| HOLOGRAM photography | [Nikon: Basics of Exposure](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/a-basic-look-at-the-basics-of-exposure) — shutter speed, aperture and ISO tradeoffs | Does not license or inspect user media |
| PIKE dependencies | [PMI: Four Ways Project Schedules Are Limited](https://www.pmi.org/learning/library/four-ways-project-schedules-limited-7265) — mandatory/discretionary predecessors and scheduling relationships | Cannot certify actual project dates or authorize delivery |
| CRUSHER botany | [Smithsonian: Guide to Plant Specimens](https://naturalhistory.si.edu/research/botany/news/plant-press/guide-collecting-plant-specimens-us-national-herbarium) — records, provenance, permission and permits | Not authorization to collect plants or reveal protected species locations |
| TORRES backend engineering | [OWASP: Broken Object Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) — check resource permissions on each object request | Not evidence SCOTTY's live APIs are protected |
| NEELIX travel logistics | [U.S. State Department: Planning Your Travel](https://travel.state.gov/en/international-travel/planning.html) — advisories, entry rules and documentation | Does not establish current destination-specific visa eligibility |
| JANEWAY expedition planning | [NPS: Trip Planning Guide](https://www.nps.gov/subjects/healthandsafety/trip-planning-guide.htm) — itinerary, emergency planning and reconsidering an unsafe route | No actual location, route or weather checked |
| TUVOK evidence review | [NIST SP 800-53A Rev. 5](https://www.nist.gov/publications/assessing-security-and-privacy-controls-information-systems-and-organizations) — evidence-focused security/privacy control assessment | Not operational accreditation of SCOTTY |
| SISKO customer research | [GOV.UK: Plan User Research](https://www.gov.uk/service-manual/user-research/plan-user-research-for-your-service) — objectives, assumptions and research questions | No authorization to contact or inspect real customers |
| ARCHER learning assessment | [IES: Using Student Achievement Data](https://ies.ed.gov/ncee/WWC/PracticeGuide/12/Published) — review learning evidence and adjust instruction | No access to individual educational records or validated personalized learning scores |

### What was implemented and tested

- `docs/stage-b/b3-third-ten-expansion-specialist-public-pilot-2026-11-08.json`: ten original-source review records, exact frozen IDs, source sections, dates when explicitly known, usage boundaries, and owner/citation/license grants fixed to `false`.
- `src/knowledge/phase3-third-ten-expansion-specialists.mjs` and its negative tests: validate all ten unique specialists against immutable roles, K1 dockets, exact public HTTPS hosts/paths, date chronology and no fake authorization fields.
- `scripts/phase3-export-third-ten-expansion-specialists.mjs`: offline, SHA-locked public-source review report, stdout only.
- `src/knowledge/phase3-unified-public-coverage.mjs`: optional eighth source-batch verification while preserving the former seven-batch case, then source-record reconciliation to catch duplicate IDs and dockets. Its tests confirm **74** unique reference candidates and **111** specialist IDs still without a first-source candidate.
- `scripts/phase3-export-unified-source-coverage.mjs` now emits the **eight-batch** summary; the combined source and export tests run in the existing Stage B3 CI workflow.

```bash
node --test src/knowledge/phase3-third-ten-expansion-specialists.test.mjs src/knowledge/phase3-unified-public-coverage.test.mjs
node scripts/phase3-export-third-ten-expansion-specialists.mjs > /tmp/scotty-b3-expansion-021-030.json
node scripts/phase3-export-unified-source-coverage.mjs > /tmp/scotty-b3-current-public-coverage.json
```

**Exact coverage after this batch:** **25 chiefs + 49 specialists = 74** first-source review candidates, **111 specialists** without an inspected public reference, **481 of 555** evidence dockets with no source candidate (50 chief K2/K3 and 431 specialist requirements). **All 555 independent source/claim/copyright/license/owner reviews remain pending**. The project has **0** accepted professional source libraries, **0** authorized live citations, **0** real-model source QA evaluations, and **0** active agents. Source inspection progress is not proof of correctness or agent proficiency.
