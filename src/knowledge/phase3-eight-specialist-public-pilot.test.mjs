import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validateEightSpecialistSourcePilot} from "./phase3-eight-specialist-public-pilot.mjs";

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=read("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const chiefs1=read("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const chiefs2=read("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const chiefs3=read("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json");
const pilot=read("../../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(frozen,lock));
const run=p=>validateEightSpecialistSourcePilot(p,frozen,queue,chiefs1,chiefs2,chiefs3);
const report=run(pilot);
const change=(index,values)=>{
 const draft=structuredClone(pilot);
 draft.items[index]={...draft.items[index],...values};
 return draft;
};
test("8 distinct BONES specialists, all first K1 candidates, no knowledge approval",()=>{
 assert.equal(report.items.length,8);
 assert.equal(report.kind,"B3_EIGHT_SPECIALISTS_UNAPPROVED_REVIEW_REPORT");
 assert.equal(report.summary.frozenChiefsWithOnePublicCandidate,25);
 assert.equal(report.summary.specialistsWithInspectedPublicCandidate,8);
 assert.equal(report.summary.specialistsWithoutInspectedPublicCandidate,152);
 assert.equal(report.summary.totalFrozenAgents,185);
 assert.equal(report.summary.totalReviewDockets,555);
 assert.equal(report.summary.assistantInspectedDocketCandidates,33);
 assert.equal(report.summary.docketsWithoutInspectedCandidate,522);
 assert.equal(report.summary.docketsAwaitingIndependentAcceptance,555);
 assert.equal(report.summary.approvedKnowledgeLibraries,0);
 assert.equal(report.summary.liveAgentCitations,0);
 assert.equal(report.summary.actualModelEvaluations,0);
 assert.equal(report.summary.activatedAgents,0);
 assert.equal(new Set(report.items.map(x=>x.agentId)).size,8);
 assert.equal(new Set(report.items.map(x=>x.requirementId)).size,8);
 assert.deepEqual(new Set(report.items.map(x=>x.agentId)),
  new Set(frozen.records.filter(x=>x.Role==="Specialist"&&x["Chief ID"]==="chief-bones")
    .slice(0,8).map(x=>x["Agent ID"])));
 for(const x of report.items){
  assert.equal(x.liveCitationAllowed,false);
  assert.equal(x.independentSourceReviewComplete,false);
  assert.equal(x.ownerApprovalGranted,false);
  assert.equal(x.restrictedHealthRecordAccess,false);
  assert.ok(queue.items.find(y=>y.requirementId===x.requirementId&&
    y.reviewState==="PENDING_SOURCE_EVIDENCE"));
 }
});
test("Distinct specialist names, roles, approved IDs, and K1 dockets are required",()=>{
 assert.throws(()=>run(change(0,{agentId:"chief-bones"})),
  /B3_SPECIALIST_PILOT_UNKNOWN_OR_DUPLICATE/);
 assert.throws(()=>run(change(0,{agentId:"agent-bones-02"})),
  /B3_SPECIALIST_PILOT_FROZEN_ROLE_OR_DOCKET_MISMATCH|B3_SPECIALIST_PILOT_UNKNOWN_OR_DUPLICATE/);
 assert.throws(()=>run(change(0,{displayName:"Fake"})),
  /B3_SPECIALIST_PILOT_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(change(0,{specialty:"Clinical evidence appraisal"})),
  /B3_SPECIALIST_PILOT_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(change(0,{requirementId:"agent-bones-01-K2"})),
  /B3_SPECIALIST_PILOT_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 const bad=structuredClone(pilot);bad.items[1]=bad.items[0];
 assert.throws(()=>run(bad),/B3_SPECIALIST_PILOT_UNKNOWN_OR_DUPLICATE/);
});
test("Official URL mapping prevents substituted domains, internal URLs, credentials and query parameters",()=>{
 const badURLs=[
  "http://www.cdc.gov/health-literacy/php/about/index.html",
  "https://www.cdc.gov.evil.invalid/health-literacy/php/about/index.html",
  "https://localhost/health-literacy/php/about/index.html",
  "https://127.0.0.1/health-literacy/php/about/index.html",
  "https://user:secret@www.cdc.gov/health-literacy/php/about/index.html",
  "https://www.cdc.gov:8443/health-literacy/php/about/index.html",
  "https://www.cdc.gov/health-literacy/php/about/index.html?apiKey=secret",
  "https://www.cdc.gov/health-literacy/php/about/another.html",
  "file:///etc/passwd"
 ];
 for(const url of badURLs){
  assert.throws(()=>run(change(0,{url})),/B3_SPECIALIST_PILOT_WRONG_PUBLIC_URL/,url);
 }
});
test("No self-attested owner, reviewer, license or citation claims accepted",()=>{
 const flags=[
  "originalSourceTextCopied","independentPublisherAuthentication","independentlyVerifiedClaim",
  "licensingReviewed","ownerApproved","citableByLiveAgents","sharedMemoryPromotionAllowed"
 ];
 for(let i=0;i<pilot.items.length;i++){
  for(const k of flags)
   assert.throws(()=>run(change(i,{[k]:true})),/B3_SPECIALIST_PILOT_CANNOT_SELF_APPROVE/);
 }
 const extra=change(0,{authorization:{approved:true}});
 assert.throws(()=>run(extra),/B3_SPECIALIST_PILOT_UNKNOWN_OR_DUPLICATE/);
 const top=structuredClone(pilot);top.ownerApproval="GRANTED";
 assert.throws(()=>run(top),/B3_SPECIALIST_PILOT_UNAPPROVED_MANIFEST_REQUIRED/);
});
test("Missing, forged, future or invalid publication details must fail without source fetching",()=>{
 assert.throws(()=>run(change(0,{publicationDate:"2026-02-30"})),
  /B3_SPECIALIST_PILOT_BAD_METADATA/);
 assert.throws(()=>run(change(0,{publicationDate:"2028-01-01"})),
  /B3_SPECIALIST_PILOT_BAD_METADATA/);
 assert.throws(()=>run(change(2,{paraphrase:""})),
  /B3_SPECIALIST_PILOT_BAD_METADATA/);
 const few=structuredClone(pilot);few.items.pop();
 assert.throws(()=>run(few),/B3_SPECIALIST_PILOT_UNAPPROVED_MANIFEST_REQUIRED/);
 const oldQueue={...queue,items:queue.items.slice(1)};
 assert.throws(
  ()=>validateEightSpecialistSourcePilot(pilot,frozen,oldQueue,chiefs1,chiefs2,chiefs3),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
