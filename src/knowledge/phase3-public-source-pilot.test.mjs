import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validatePublicSourcePilot,previewSourcePilotForAgent} from "./phase3-public-source-pilot.mjs";

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),"utf8"));
const frozen=load("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const pilot=load("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const drafts=createPhase1BrainDrafts(frozen,lock);
const queue=createPhase3EvidenceQueue(drafts);
const report=validatePublicSourcePilot(pilot,queue,frozen);

function mutatedEntry(index,overrides){
 const next=structuredClone(pilot);
 next.items[index]={...next.items[index],...overrides};
 return next;
}
test("five official web sources link to exact frozen chief identities and unapproved evidence dockets",()=>{
 assert.equal(report.entries.length,5);
 assert.equal(report.summary.matchedToCanonicalAgentAndRequirement,5);
 assert.equal(report.summary.manifestReportedPublicInspections,5);
 assert.equal(report.summary.independentHumanVerification,0);
 assert.equal(report.summary.approvedKnowledgeClaims,0);
 assert.equal(report.summary.liveAgentCitationPermissions,0);
 assert.equal(report.summary.productionDataAccesses,0);
 assert.equal(report.summary.realModelEvaluations,0);
 assert.equal(new Set(report.entries.map(x=>x.agentId)).size,5);
 assert.equal(new Set(report.entries.map(x=>x.requirementId)).size,5);
 const expected=new Set(["chief-bones","chief-expansion-troi","chief-worf","chief-geordi","chief-expansion-torres"]);
 assert.deepEqual(new Set(report.entries.map(x=>x.agentId)),expected);
 for(const row of report.entries){
  assert.equal(row.status,"MANIFEST_REPORTED_PUBLIC_PAGE_INSPECTION");
  assert.equal(row.factualCitationAllowed,false);
  assert.equal(row.independentVerificationPassed,false);
  assert.equal(row.ownerApprovalGranted,false);
  assert.equal(row.knowledgePromoted,false);
  assert.equal(row.reviewNeeded.length,4);
  assert.equal(row.observedOn,"2026-11-08");
  assert.equal(queue.items.some(x=>x.requirementId===row.requirementId&&x.canonicalAgentId===row.agentId&&x.reviewState==="PENDING_SOURCE_EVIDENCE"),true);
 }
});
test("inspected public reference is an offline review result, not agent-verified knowledge",()=>{
 for(const item of report.entries){
  const visible=previewSourcePilotForAgent(report,item.agentId);
  assert.equal(visible.agentId,item.agentId);
  assert.equal(visible.usableAsVerifiedKnowledge,false);
  assert.equal(visible.searchAuthorization,"OFFLINE_INSPECTION_REPORT_ONLY_NOT_AUTHENTICATED");
 }
 assert.throws(()=>previewSourcePilotForAgent(report,"unknown-agent"),/PILOT_REPORT_OR_ID_INVALID/);
 assert.throws(()=>previewSourcePilotForAgent({...report,entries:report.entries.slice(1)},"chief-bones"),/PILOT_REPORT_OR_ID_INVALID/);
});
test("rejects unsupported URL, forged publisher route or unexpected agent scopes",()=>{
 for(const bad of [
  "http://medlineplus.gov/evaluatinghealthinformation.html",
  "https://medlineplus.gov:8443/evaluatinghealthinformation.html",
  "https://username:password@medlineplus.gov/evaluatinghealthinformation.html",
  "https://localhost/evaluatinghealthinformation.html",
  "https://127.0.0.1/evaluatinghealthinformation.html",
  "https://medlineplus.gov.evil.invalid/evaluatinghealthinformation.html",
  "https://medlineplus.gov/evaluatinghealthinformation.html?key=private"
 ]){
  assert.throws(()=>validatePublicSourcePilot(mutatedEntry(0,{url:bad}),queue,frozen),/PILOT_SOURCE_URL_INVALID/);
 }
 const bogus=structuredClone(pilot);
 bogus.items[0].ownerSession="self-asserted";
 assert.throws(()=>validatePublicSourcePilot(bogus,queue,frozen),/PILOT_UNKNOWN_OR_DUPLICATE_ID/);
 assert.throws(()=>validatePublicSourcePilot(mutatedEntry(0,{agentId:"chief-worf"}),queue,frozen),/PILOT_UNKNOWN_OR_DUPLICATE_ID|PILOT_SOURCE_IDENTITY_OR_REQUIREMENT_MISMATCH/);
 assert.throws(()=>validatePublicSourcePilot(mutatedEntry(0,{department:"Security & Defense"}),queue,frozen),/PILOT_SOURCE_IDENTITY_OR_REQUIREMENT_MISMATCH/);
});
test("no pilot record can silently enable citation, import, licensing or approval",()=>{
 for(let i=0;i<pilot.items.length;i++){
  for(const key of ["independentlyVerifiedClaim","licensingReviewed","ownerApproved","citableByLiveAgents","sharedMemoryPromotionAllowed","independentPublisherAuthentication","originalSourceTextCopied"]){
   assert.throws(()=>validatePublicSourcePilot(mutatedEntry(i,{[key]:true}),queue,frozen),/PILOT_MUST_REMAIN_UNAPPROVED/);
  }
 }
 const elevated=structuredClone(pilot);elevated.ownerApproval="GRANTED";
 assert.throws(()=>validatePublicSourcePilot(elevated,queue,frozen),/B3_SOURCE_PILOT_MANIFEST_INVALID/);
 const doctored=structuredClone(pilot);doctored.summary.approvedKnowledgePacks=5;
 assert.throws(()=>validatePublicSourcePilot(doctored,queue,frozen),/B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
test("source date and exact review requirement remain consistent",()=>{
 assert.throws(()=>validatePublicSourcePilot(mutatedEntry(1,{publicationDate:"2030-01-01"}),queue,frozen),/PILOT_SOURCE_METADATA_INVALID/);
 assert.throws(()=>validatePublicSourcePilot(mutatedEntry(1,{publicationDate:"2024-02-30"}),queue,frozen),/PILOT_SOURCE_METADATA_INVALID/);
 assert.throws(()=>validatePublicSourcePilot(mutatedEntry(4,{requirementId:"chief-expansion-torres-K1"}),queue,frozen),/PILOT_SOURCE_IDENTITY_OR_REQUIREMENT_MISMATCH/);
 assert.throws(()=>validatePublicSourcePilot({...pilot,items:pilot.items.slice(1)},queue,frozen),/B3_SOURCE_PILOT_MANIFEST_INVALID/);
 assert.throws(()=>validatePublicSourcePilot(pilot,{...queue,items:queue.items.slice(1)},frozen),/B3_SOURCE_PILOT_MANIFEST_INVALID/);
 assert.throws(()=>validatePublicSourcePilot(pilot,queue,{...frozen,records:frozen.records.slice(1)}),/B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
