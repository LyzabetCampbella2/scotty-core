import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validateFourthTenExpansionSpecialists} from "./phase3-fourth-ten-expansion-specialists.mjs";
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=load("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const c1=load("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const c2=load("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const c3=load("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json");
const b8=load("../../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json");
const d11=load("../../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json");
const e10=load("../../docs/stage-b/b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json");
const e20=load("../../docs/stage-b/b3-second-ten-expansion-specialist-public-pilot-2026-11-08.json");
const e30=load("../../docs/stage-b/b3-third-ten-expansion-specialist-public-pilot-2026-11-08.json");
const fourth=load("../../docs/stage-b/b3-fourth-ten-expansion-specialist-public-pilot-2026-11-09.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(frozen,lock));
const run=(m=fourth)=>validateFourthTenExpansionSpecialists(m,e30,e20,e10,d11,b8,frozen,queue,c1,c2,c3);
const update=(i,delta)=>{const m=structuredClone(fourth);m.items[i]={...m.items[i],...delta};return m;};
test("Batch 4: exact expansion 031-040, 59 specialists, 84 source candidates, no approvals",()=>{
 const report=run();
 assert.equal(report.added.length,10);
 assert.equal(report.summary.frozenAgents,185);
 assert.equal(report.summary.chiefsWithFirstSourceCandidate,25);
 assert.equal(report.summary.specialistsWithFirstSourceCandidate,59);
 assert.equal(report.summary.specialistsMissingFirstSource,101);
 assert.equal(report.summary.publicDocketsWithCandidate,84);
 assert.equal(report.summary.publicDocketsMissingCandidate,471);
 assert.equal(report.summary.pendingIndependentDocketReviews,555);
 assert.equal(report.summary.independentlyVerifiedClaims,0);
 assert.equal(report.summary.ownerApprovedKnowledgeLibraries,0);
 assert.equal(report.summary.activeLiveCitations,0);
 assert.equal(report.summary.realModelEvaluations,0);
 assert.equal(report.summary.activeAgents,0);
 const ids=Array.from({length:10},(_,i)=>"agent-expansion-"+String(i+31).padStart(3,"0"));
 assert.deepEqual(new Set(report.added.map(x=>x.agentId)),new Set(ids));
 assert.equal(new Set(report.added.map(x=>x.requirementId)).size,10);
 for(const x of report.added){
  assert.equal(x.ownerApproved,false);
  assert.equal(x.liveCitationAllowed,false);
  assert.equal(x.claimIndependentlyReviewed,false);
  assert.equal(x.privateDataAccess,false);
  assert.equal(x.realModelEvaluation,false);
 }
});
test("Every source preserves frozen identity, specialty, department, chief and open K1 docket",()=>{
 for(const item of fourth.items){
  const row=frozen.records.find(x=>x["Agent ID"]===item.agentId);
  assert.ok(row);
  assert.equal(row.Role,"Specialist");
  assert.equal(row.Name,item.displayName);
  assert.equal(row.Specialty,item.specialty);
  assert.equal(row.Department,item.department);
  assert.equal(row["Chief ID"],item.chiefId);
  assert.equal(item.requirementId,item.agentId+"-K1");
  assert.equal(item.observedOn,"2026-11-09");
  assert.equal(item.publicationDate===null||item.publicationDate<=item.observedOn,true);
  assert.equal(item.ownerApproved,false);
  assert.equal(item.citableByLiveAgents,false);
  assert.ok(queue.items.some(d=>d.requirementId===item.requirementId&&
   d.canonicalAgentId===item.agentId&&d.reviewState==="PENDING_SOURCE_EVIDENCE"));
 }
});
test("Rejects duplicate ID, replay from older batch, wrong chief, invented requirement and name",()=>{
 assert.throws(()=>run(update(0,{agentId:"agent-expansion-022"})),/B3_FOURTH_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 assert.throws(()=>run(update(0,{agentId:"agent-expansion-032"})),
  /B3_FOURTH_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH|B3_FOURTH_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 assert.throws(()=>run(update(0,{displayName:"Someone Else"})),/B3_FOURTH_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(update(0,{specialty:"other role"})),/B3_FOURTH_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(update(0,{chiefId:"chief-data"})),/B3_FOURTH_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(update(0,{requirementId:"agent-expansion-031-K2"})),/B3_FOURTH_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 const duplicate=structuredClone(fourth);duplicate.items[1]=duplicate.items[0];
 assert.throws(()=>run(duplicate),/B3_FOURTH_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
});
test("Rejects unsafe URLs, alternate official paths and credentials",()=>{
 for(const url of [
  "http://www.w3.org/WAI/planning/involving-users/",
  "https://www.w3.org.evil.invalid/WAI/planning/involving-users/",
  "https://localhost/WAI/planning/involving-users/",
  "https://127.0.0.1/WAI/planning/involving-users/",
  "https://user:password@www.w3.org/WAI/planning/involving-users/",
  "https://www.w3.org:8443/WAI/planning/involving-users/",
  "https://www.w3.org/WAI/planning/involving-users/?token=secret",
  "https://www.w3.org/WAI/planning/involving-users/#approval",
  "https://www.w3.org/WAI/planning/other/",
  "file:///etc/passwd"
 ]){
  assert.throws(()=>run(update(0,{url})),/B3_FOURTH_TEN_SOURCE_URL_INVALID/,url);
 }
});
test("False owner authorization, verified claim, license or live citation is denied",()=>{
 for(let i=0;i<fourth.items.length;i++){
  for(const k of ["originalSourceTextCopied","independentPublisherAuthentication",
   "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
   "citableByLiveAgents","sharedMemoryPromotionAllowed"])
   assert.throws(()=>run(update(i,{[k]:true})),/B3_FOURTH_TEN_FALSE_VERIFICATION_OR_OWNER_APPROVAL/);
 }
 assert.throws(()=>run(update(0,{claimedAuthorization:"yes"})),
  /B3_FOURTH_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 const fake=structuredClone(fourth);fake.ownerApproval="GRANTED";
 assert.throws(()=>run(fake),/B3_FOURTH_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
 const boosted=structuredClone(fourth);boosted.summary.verifiedClaims=10;
 assert.throws(()=>run(boosted),/B3_FOURTH_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
});
test("Malformed or future publication dates and missing sources deny review candidate creation",()=>{
 assert.throws(()=>run(update(0,{publicationDate:"2026-02-30"})),/B3_FOURTH_TEN_INVALID_SOURCE_METADATA/);
 assert.throws(()=>run(update(0,{publicationDate:"2027-01-01"})),/B3_FOURTH_TEN_INVALID_SOURCE_METADATA/);
 assert.throws(()=>run(update(0,{criticalLimit:""})),/B3_FOURTH_TEN_INVALID_SOURCE_METADATA/);
 const fewer=structuredClone(fourth);fewer.items.pop();
 assert.throws(()=>run(fewer),/B3_FOURTH_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
 assert.throws(()=>validateFourthTenExpansionSpecialists(fourth,e30,e20,e10,d11,b8,
  {...frozen,records:frozen.records.slice(1)},queue,c1,c2,c3),/B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
