import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {DEPARTMENT_PATTERNS} from "./department-methods.mjs";
import {PLAYBOOK_VERSION} from "./specialist-playbooks.mjs";
import {PRIOR_CHIEF_SOURCES} from "./chief-source-candidates.mjs";

const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=load("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const snapshot=createPhase1BrainDrafts(frozen,lock);

test("all 25 canonical departments have a sourced authored procedure",()=>{
 const departments=new Set(snapshot.profiles.map(x=>x.department));
 assert.equal(departments.size,25);
 assert.equal(Object.keys(DEPARTMENT_PATTERNS).length,25);
 for(const dept of departments)assert.ok(Array.isArray(DEPARTMENT_PATTERNS[dept]),dept);
 for(const p of snapshot.profiles){
  assert.ok(p.distinctiveReasoning.initialSequence.length>=5,p.canonicalAgentId);
  assert.ok(p.distinctiveReasoning.failureModes.length>=2,p.canonicalAgentId);
  assert.ok(p.distinctiveReasoning.workedSyntheticExample,p.canonicalAgentId);
  assert.equal(p.distinctiveReasoning.provenance.reviewStatus,"NOT_OWNER_APPROVED");
  assert.equal(p.distinctiveReasoning.provenance.realWorldEvidenceVerified,false);
  assert.equal(p.distinctiveReasoning.evidenceStatus,"METHODOLOGY_NOT_INDEPENDENTLY_VERIFIED");
 }
});

test("specialists have 160 role methods and candidate sources remain unverified",()=>{
 assert.equal(snapshot.summary.specialistMethodGuides,160);
 assert.equal(snapshot.summary.departmentMethods,25);
 const specialists=snapshot.profiles.filter(x=>x.role==="Specialist");
 assert.equal(specialists.length,160);
 for(const p of specialists){
  assert.ok(["specialty-specific","department-specific"].includes(p.distinctiveReasoning.methodCoverage));
  assert.ok(p.distinctiveReasoning.specialistStandards.verifySources);
  assert.ok(p.distinctiveReasoning.specialistStandards.verifyScope);
  assert.ok(p.distinctiveReasoning.domainSources.every(s=>s.verified===false&&s.checkedAt===null));
 }
 const front=specialists.find(x=>x.specialty.toLowerCase()==="frontend engineering");
 if(front){
  assert.equal(front.distinctiveReasoning.methodCoverage,"specialty-specific");
  assert.match(front.distinctiveReasoning.workedSyntheticExample,/keyboard/);
 }
 assert.ok(PLAYBOOK_VERSION.includes("specialist-playbooks"));
});
test("only 8 sourced chief candidates and identity conflict must be reviewed, not adopted",()=>{
 const chiefs=snapshot.profiles.filter(x=>x.role==="Chief");
 const sourced=chiefs.filter(x=>x.priorChiefReview);
 assert.equal(sourced.length,8);
 assert.equal(PRIOR_CHIEF_SOURCES.length,8);
 assert.equal(snapshot.summary.chiefSourceCandidates,8);
 assert.equal(snapshot.summary.chiefSourceIdentityConflicts,1);
 assert.equal(snapshot.summary.chiefSourcesAdopted,0);
 for(const p of chiefs){
  assert.equal(p.priorChiefSourceApplied,false);
  assert.equal(p.ownerPreferenceEvidence,null);
  assert.deepEqual(p.traits,[],"Legacy traits cannot overwrite unapproved persona automatically");
  if(p.priorChiefReview){
   assert.ok(p.priorChiefReview.sourceRef.gitBlobSha.length===40);
   assert.equal(p.priorChiefReview.appliedToPersona,false);
   assert.equal(p.priorChiefReview.ownerApprovedVersion,false);
   assert.equal(p.priorChiefReview.name,p.displayName);
   if(p.priorChiefReview.identityStatus==="EXACT_ID_NAME_DEPARTMENT"){
    assert.equal(p.priorChiefReview.legacyAgentId,p.canonicalAgentId);
    assert.equal(p.priorChiefReview.legacyDepartment,p.department);
   }
  }
 }
 const troi=chiefs.find(x=>x.displayName==="TROI");
 assert.equal(troi.canonicalAgentId,"chief-expansion-troi");
 assert.equal(troi.priorChiefReview.legacyAgentId,"chief-troi");
 assert.equal(troi.priorChiefReview.identityStatus,"LEGACY_ID_MISMATCH_REQUIRES_OWNER_REVIEW");
});
test("555 behavior tests still unrun, no real-model or owner-approval evidence invented",()=>{
 assert.equal(snapshot.profiles.reduce((n,p)=>n+p.behaviorTestPlan.length,0),555);
 for(const profile of snapshot.profiles){
  assert.equal(profile.ownerApproved,false);
  assert.equal(profile.realModelEvaluation,"NOT_RUN");
  assert.equal(profile.ownerReview,"PENDING");
  assert.equal(profile.permissions.executionEnabled,false);
  assert.equal(profile.permissions.memoryWriteEnabled,false);
  assert.ok(profile.behaviorTestPlan.every(t=>t.result==="NOT_RUN"));
 }
});
