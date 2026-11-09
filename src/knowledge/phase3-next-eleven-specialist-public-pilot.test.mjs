import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validateNextElevenSpecialistPublicPilot} from "./phase3-next-eleven-specialist-public-pilot.mjs";

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=read("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const chief1=read("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const chief2=read("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const chief3=read("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json");
const prior=read("../../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json");
const manifest=read("../../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(frozen,lock));
const validate=p=>validateNextElevenSpecialistPublicPilot(p,prior,frozen,queue,chief1,chief2,chief3);
const report=validate(manifest);
const mutate=(index,changes)=>{
 const copy=structuredClone(manifest);
 copy.items[index]={...copy.items[index],...changes};
 return copy;
};
test("11 distinct new BONES/DATA specialists have one public candidate, with all 555 dockets pending",()=>{
 assert.equal(report.kind,"B3_NINETEEN_SPECIALIST_SOURCE_CANDIDATES_PENDING_REVIEW");
 assert.equal(report.priorEight,8);
 assert.equal(report.newEleven,11);
 assert.equal(report.entries.length,11);
 assert.equal(report.summary.frozenChiefsWithInspectedPublicCandidate,25);
 assert.equal(report.summary.specialistsWithInspectedPublicCandidate,19);
 assert.equal(report.summary.specialistsStillWithoutInspectedCandidate,141);
 assert.equal(report.summary.sourceDockets,555);
 assert.equal(report.summary.assistantInspectedDocketCandidates,44);
 assert.equal(report.summary.docketsStillWithoutInspectedCandidate,511);
 assert.equal(report.summary.allDocketsStillPendingIndependentApproval,555);
 assert.equal(report.summary.independentlyVerifiedClaims,0);
 assert.equal(report.summary.ownerApprovedLibraries,0);
 assert.equal(report.summary.allowedLiveCitations,0);
 assert.equal(report.summary.realModelEvaluations,0);
 assert.equal(report.summary.productionDataReads,0);
 assert.equal(report.summary.agentActivations,0);
 assert.deepEqual(new Set(report.entries.map(x=>x.agentId)),
  new Set(["agent-bones-09","agent-data-01","agent-data-02","agent-data-03",
   "agent-data-04","agent-data-05","agent-data-06","agent-data-07",
   "agent-data-08","agent-data-09","agent-data-10"]));
 assert.equal(new Set(report.entries.map(x=>x.requirementId)).size,11);
 assert.equal(manifest.items.length,11);
 for(const x of report.entries){
  assert.equal(x.independentSourceReviewComplete,false);
  assert.equal(x.ownerApproved,false);
  assert.equal(x.citationPermission,false);
  assert.equal(x.realDataAccess,false);
  assert.ok(queue.items.some(d=>d.canonicalAgentId===x.agentId&&
    d.requirementId===x.requirementId&&d.reviewState==="PENDING_SOURCE_EVIDENCE"));
 }
});
test("Every specialist matches exactly the immutable name, specialty, department, chief and open K1 docket",()=>{
 for(const item of manifest.items){
  const canonical=frozen.records.find(x=>x["Agent ID"]===item.agentId);
  assert.ok(canonical);
  assert.equal(canonical.Role,"Specialist");
  assert.equal(canonical.Name,item.displayName);
  assert.equal(canonical.Department,item.department);
  assert.equal(canonical.Specialty,item.specialty);
  assert.equal(canonical["Chief ID"],item.chiefId);
  assert.equal(item.requirementId,item.agentId+"-K1");
  assert.equal(item.ownerApproved,false);
  assert.equal(item.citableByLiveAgents,false);
  assert.equal(item.independentlyVerifiedClaim,false);
 }
});
test("Incorrect IDs, specialty, department, source docket, or repeated agent are forbidden",()=>{
 assert.throws(()=>validate(mutate(0,{agentId:"agent-bones-01"})),
  /B3_NEXT_ELEVEN_UNKNOWN_DUPLICATE_OR_REPLAY/);
 assert.throws(()=>validate(mutate(0,{agentId:"agent-data-01"})),
  /B3_NEXT_ELEVEN_FROZEN_ROLE_OR_DOCKET_MISMATCH|B3_NEXT_ELEVEN_UNKNOWN_DUPLICATE_OR_REPLAY/);
 assert.throws(()=>validate(mutate(1,{displayName:"Fake Name"})),
  /B3_NEXT_ELEVEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>validate(mutate(1,{specialty:"Fact verification"})),
  /B3_NEXT_ELEVEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>validate(mutate(1,{department:"Health & Human Support"})),
  /B3_NEXT_ELEVEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>validate(mutate(1,{requirementId:"agent-data-01-K2"})),
  /B3_NEXT_ELEVEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 const dup=structuredClone(manifest);dup.items[2]=dup.items[1];
 assert.throws(()=>validate(dup),/B3_NEXT_ELEVEN_UNKNOWN_DUPLICATE_OR_REPLAY/);
});
test("Unsafe or substituted URL, credentials, port, redirect and internal addresses are denied",()=>{
 const cases=[
  "http://www.cdc.gov/prepare-your-health/plan-ahead/stay-connected.html",
  "https://www.cdc.gov.evil.invalid/prepare-your-health/plan-ahead/stay-connected.html",
  "https://localhost/prepare-your-health/plan-ahead/stay-connected.html",
  "https://127.0.0.1/prepare-your-health/plan-ahead/stay-connected.html",
  "https://user:token@www.cdc.gov/prepare-your-health/plan-ahead/stay-connected.html",
  "https://www.cdc.gov:8443/prepare-your-health/plan-ahead/stay-connected.html",
  "https://www.cdc.gov/prepare-your-health/plan-ahead/stay-connected.html?key=fake",
  "https://www.cdc.gov/prepare-your-health/plan-ahead/stay-connected.html#forged",
  "https://www.cdc.gov/prepare-your-health/plan-ahead/some-other-page.html",
  "file:///etc/passwd"
 ];
 for(const url of cases)assert.throws(()=>validate(mutate(0,{url})),
  /B3_NEXT_ELEVEN_SOURCE_URL_MISMATCH/,url);
});
test("No unexpected fields, false consent, source verification, rights or live citation promotion",()=>{
 const flags=["originalSourceTextCopied","independentPublisherAuthentication",
  "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
  "citableByLiveAgents","sharedMemoryPromotionAllowed"];
 for(let index=0;index<manifest.items.length;index++){
  for(const k of flags)assert.throws(()=>validate(mutate(index,{[k]:true})),
   /B3_NEXT_ELEVEN_FORGED_REVIEW_OR_AUTHORIZATION/);
 }
 assert.throws(()=>validate(mutate(0,{ownerSession:"I approve this"})),
  /B3_NEXT_ELEVEN_UNKNOWN_DUPLICATE_OR_REPLAY/);
 const forged=structuredClone(manifest);forged.ownerApproval="GRANTED";
 assert.throws(()=>validate(forged),/B3_NEXT_ELEVEN_UNAPPROVED_MANIFEST_REQUIRED/);
 const badSummary=structuredClone(manifest);badSummary.summary.approvedKnowledgePacks=1;
 assert.throws(()=>validate(badSummary),/B3_NEXT_ELEVEN_UNAPPROVED_MANIFEST_REQUIRED/);
});
test("Missing, impossible or future evidence and malformed collection are rejected",()=>{
 assert.throws(()=>validate(mutate(0,{publicationDate:"2026-02-30"})),
  /B3_NEXT_ELEVEN_INVALID_SOURCE_METADATA/);
 assert.throws(()=>validate(mutate(0,{publicationDate:"2030-01-01"})),
  /B3_NEXT_ELEVEN_INVALID_SOURCE_METADATA/);
 assert.throws(()=>validate(mutate(1,{paraphrase:""})),
  /B3_NEXT_ELEVEN_INVALID_SOURCE_METADATA/);
 const missing=structuredClone(manifest);missing.items.pop();
 assert.throws(()=>validate(missing),/B3_NEXT_ELEVEN_UNAPPROVED_MANIFEST_REQUIRED/);
 assert.throws(()=>
  validateNextElevenSpecialistPublicPilot(manifest,prior,{...frozen,records:frozen.records.slice(1)},queue,chief1,chief2,chief3),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
