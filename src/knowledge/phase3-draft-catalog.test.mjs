import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {
 createPhase3DraftCatalog,searchDraftCatalog,proposeSyntheticProjectKnowledge
} from "./phase3-draft-catalog.mjs";

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=read("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const drafts=createPhase1BrainDrafts(frozen,lock);
const catalog=createPhase3DraftCatalog(drafts);
const chief=drafts.profiles.find(p=>p.role==="Chief");
const specialist=drafts.profiles.find(p=>p.role==="Specialist");
const outsider=drafts.profiles.find(p=>p.department!==specialist.department);

test("Phase 3 catalog covers all 185 locked identities and 25 department methods",()=>{
 assert.equal(catalog.stage,"B");
 assert.equal(catalog.phase,3);
 assert.equal(catalog.mode,"OFFLINE_REVIEW_CANDIDATES_ONLY");
 assert.equal(catalog.summary.rolePacks,185);
 assert.equal(catalog.summary.departmentGuides,25);
 assert.equal(catalog.summary.sections,790);
 assert.equal(catalog.summary.independentRealWorldSourceChecks,0);
 assert.equal(catalog.summary.ownerApprovedKnowledgeLibraries,0);
 assert.equal(catalog.summary.productionSearchQueries,0);
 assert.equal(catalog.summary.enabledAgents,0);
 assert.equal(catalog.rosterBlobSha,lock.snapshotGitBlobSha);
 assert.deepEqual(
  new Set(catalog.rolePacks.map(x=>x.canonicalAgentId)),
  new Set(frozen.records.map(x=>x["Agent ID"]))
 );
 assert.equal(new Set(catalog.departmentGuides.map(x=>x.department)).size,25);
});
test("Each role pack has methods, fictional examples, boundaries and unverified source requirements",()=>{
 for(const p of catalog.rolePacks){
  assert.equal(p.sections.length,4);
  assert.deepEqual(p.sections.map(s=>s.kind),["method","synthetic-example","limitations","evidence-needs"]);
  assert.ok(p.sections.every(s=>s.sourceRef.originalGitBlobSha.length===40));
  assert.ok(p.sections.every(s=>s.externallyVerified===false&&s.ownerApproved===false&&s.mayCiteAsProfessionalFact===false));
  assert.ok(p.externalCandidates.every(s=>s.verified===false&&s.citationReady===false&&s.contentRetrieved===false));
  assert.equal(p.status,"INTERNAL_METHODOLOGY_CANDIDATE_NOT_GROUNDED");
  assert.equal(p.realSourceRetrievals,0);
  assert.equal(p.knowledgeClaimsApproved,0);
  assert.equal(p.refreshPolicy.lastValidated,null);
  assert.equal(p.realPrivateSourcesAvailable,false);
 }
});
test("25 department guides are separated and cannot silently promote into shared memory",()=>{
 for(const guide of catalog.departmentGuides){
  assert.equal(guide.sections.length,2);
  assert.equal(guide.approvedForSharedMemory,false);
  assert.ok(guide.memberIds.includes(guide.chiefId));
  assert.equal(guide.memberIds.every(id=>drafts.profiles.some(p=>p.canonicalAgentId===id&&p.department===guide.department)),true);
 }
});
test("Offline search is constrained to own role and same-department chief guide",()=>{
 const mine=searchDraftCatalog(catalog,{actorId:specialist.canonicalAgentId,query:"Clarify"});
 assert.equal(mine.externalCitationAvailable,false);
 assert.equal(mine.realDataAccessed,false);
 assert.equal(mine.sourceValidationRequired,true);
 assert.ok(mine.hits.length>=1);
 const allowed=new Set([specialist.canonicalAgentId,specialist.chiefId]);
 assert.ok(mine.hits.every(h=>h.department===specialist.department&&allowed.has(h.agentId)));
 assert.equal(mine.hits.every(h=>!h.isProfessionalCitation&&!h.trustworthyExternalEvidence&&!h.realAgentAuthorized),true);
 const foreign=searchDraftCatalog(catalog,{actorId:outsider.canonicalAgentId,query:"Clarify"});
 assert.ok(foreign.hits.every(h=>h.department===outsider.department));
 assert.ok(!foreign.hits.some(h=>h.agentId===specialist.canonicalAgentId));
 const top=searchDraftCatalog(catalog,{actorId:chief.canonicalAgentId,query:"Clarify"});
 assert.ok(top.hits.every(h=>h.department===chief.department));
});
test("Forged IDs, unknown data, missing catalog and oversized queries fail closed",()=>{
 assert.throws(()=>searchDraftCatalog(catalog,{actorId:"fake-agent",query:"method"}),/UNKNOWN_CANONICAL_AGENT/);
 assert.throws(()=>searchDraftCatalog(catalog,{actorId:specialist.canonicalAgentId,query:"method",ownerApproved:true}),/UNTRUSTED_OFFLINE_SEARCH_FIELDS/);
 assert.throws(()=>searchDraftCatalog(catalog,{actorId:specialist.canonicalAgentId,query:""}),/INVALID_OFFLINE_SEARCH/);
 assert.throws(()=>searchDraftCatalog(catalog,{actorId:specialist.canonicalAgentId,query:"test",limit:900}),/INVALID_OFFLINE_SEARCH/);
 assert.throws(()=>searchDraftCatalog({...catalog,rolePacks:catalog.rolePacks.slice(1)},{actorId:specialist.canonicalAgentId,query:"method"}),/B3_CATALOG_REQUIRED/);
 assert.throws(()=>createPhase3DraftCatalog({...drafts,profiles:drafts.profiles.slice(1)}),/PHASE_B1_FROZEN_DRAFTS_REQUIRED/);
});
test("Project/brand playbooks can only be proposed with fictional text and no live grant",()=>{
 const valid={
  actorId:specialist.canonicalAgentId,projectId:"synthetic-writing-project",
  content:"SYNTHETIC: draft project terminology only",
  sourceConsentRef:"synthetic-consent-example"
 };
 const proposal=proposeSyntheticProjectKnowledge(valid,catalog);
 assert.equal(proposal.dataWritten,false);
 assert.equal(proposal.importedIntoLibrary,false);
 assert.equal(proposal.sourceContentVerified,false);
 assert.equal(proposal.ownerApproved,false);
 assert.equal(proposal.grantedProjectMembership,false);
 assert.equal(proposal.requiresAuthenticatedOwnerAndProjectGrant,true);
 assert.throws(()=>proposeSyntheticProjectKnowledge({...valid,projectId:"production-real-client"},catalog),/SYNTHETIC_PROJECT_PLAN_REQUIRED/);
 assert.throws(()=>proposeSyntheticProjectKnowledge({...valid,content:"Real manuscript contents"},catalog),/SYNTHETIC_PROJECT_PLAN_REQUIRED/);
 assert.throws(()=>proposeSyntheticProjectKnowledge({...valid,actorId:"fake-agent"},catalog),/SYNTHETIC_PROJECT_PLAN_REQUIRED/);
 assert.throws(()=>proposeSyntheticProjectKnowledge({...valid,permissions:["admin"]},catalog),/UNTRUSTED_PROJECT_KNOWLEDGE_FIELDS/);
});
