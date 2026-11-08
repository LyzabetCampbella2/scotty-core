import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validateCompleteChiefPublicReview} from "./phase3-all-chief-public-review.mjs";

const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=load("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const old=load("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const expanded=load("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const remaining=load("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(roster,lock));
const final=validateCompleteChiefPublicReview(remaining,roster,queue,old,expanded);
const mutate=(i,fields)=>{
 const m=structuredClone(remaining);
 m.items[i]={...m.items[i],...fields};
 return m;
};
test("All 25 chiefs have exactly one assistant-inspected source candidate; 160 specialists do not",()=>{
 assert.equal(final.kind,"UNAPPROVED_ALL_25_CHIEF_PUBLIC_SOURCE_REVIEW");
 assert.equal(final.summary.canonicalAgents,185);
 assert.equal(final.summary.chiefs,25);
 assert.equal(final.summary.specialists,160);
 assert.equal(final.summary.assistantInspectedChiefCandidates,25);
 assert.equal(final.summary.chiefsWithoutAssistantInspectedCandidate,0);
 assert.equal(final.summary.specialistsWithoutAssistantInspectedCandidate,160);
 assert.equal(final.summary.sourceDockets,555);
 assert.equal(final.summary.uninspectedSourceDockets,530);
 assert.equal(final.summary.independentReviewsStillPending,555);
 assert.equal(final.summary.independentlyVerifiedClaims,0);
 assert.equal(final.summary.ownerApprovedSourceClaims,0);
 assert.equal(final.summary.citableLiveKnowledgeClaims,0);
 assert.equal(final.summary.liveAgentActivations,0);
 assert.equal(final.priorChiefs,10);
 assert.equal(final.newChiefs,15);
 assert.equal(final.newEntries.length,15);
 assert.equal(final.rolePlans.length,185);
 assert.equal(new Set(final.newEntries.map(x=>x.agentId)).size,15);
 const chiefs=final.rolePlans.filter(x=>x.role==="Chief");
 const specialists=final.rolePlans.filter(x=>x.role==="Specialist");
 assert.ok(chiefs.every(x=>x.assistantInspectedPublicCandidates===1));
 assert.ok(specialists.every(x=>x.assistantInspectedPublicCandidates===0));
 assert.ok(final.rolePlans.every(x=>x.evidenceNeeds===3&&x.pendingRequirements===3));
 for(const x of final.newEntries){
  assert.ok(queue.items.some(d=>d.requirementId===x.requirementId&&d.reviewState==="PENDING_SOURCE_EVIDENCE"));
  assert.equal(x.independentlyVerified,false);
  assert.equal(x.ownerApproved,false);
  assert.equal(x.liveCitationAllowed,false);
  assert.equal(x.realSourceContentImported,false);
  assert.equal(x.reviewerNeeds.length,4);
 }
});
test("All 15 new candidates map to exactly their frozen chief IDs and departments",()=>{
 const seen=new Set();
 for(const x of remaining.items){
  const original=roster.records.find(r=>r["Agent ID"]===x.agentId);
  assert.ok(original);
  assert.equal(original.Role,"Chief");
  assert.equal(original.Department,x.department);
  assert.equal(x.requirementId,x.agentId+"-K1");
  assert.ok(!seen.has(x.agentId));
  seen.add(x.agentId);
  assert.equal(x.ownerApproved,false);
  assert.equal(x.citableByLiveAgents,false);
  assert.equal(x.independentlyVerifiedClaim,false);
  assert.equal(x.inspectionState,"PUBLIC_OFFICIAL_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW");
 }
 assert.equal(seen.size,15);
});
test("Fail closed for unofficial URL hosts, local SSRF targets, credentials, query strings and path substitution",()=>{
 for(const url of [
  "http://ies.ed.gov/ncee/wwc/PracticeGuide/1",
  "https://ies.ed.gov.evil.invalid/ncee/wwc/PracticeGuide/1",
  "https://localhost/ncee/wwc/PracticeGuide/1",
  "https://user:secret@ies.ed.gov/ncee/wwc/PracticeGuide/1",
  "https://ies.ed.gov:444/ncee/wwc/PracticeGuide/1",
  "https://ies.ed.gov/ncee/wwc/PracticeGuide/1?token=secret",
  "https://ies.ed.gov/ncee/wwc/PracticeGuide/2",
  "file:///etc/passwd"
 ]){
  assert.throws(()=>validateCompleteChiefPublicReview(mutate(0,{url}),roster,queue,old,expanded),
    /CHIEF25_SOURCE_URL_MISMATCH/,url);
 }
});
test("Fail closed for duplicate chiefs, wrong department and mismatched docket ID",()=>{
 assert.throws(()=>validateCompleteChiefPublicReview(mutate(0,{agentId:"chief-worf"}),roster,queue,old,expanded),
  /CHIEF25_DUPLICATE_UNKNOWN_OR_PREVIOUS_CHIEF/);
 assert.throws(()=>validateCompleteChiefPublicReview(mutate(0,{agentId:"chief-expansion-crusher"}),roster,queue,old,expanded),
  /CHIEF25_FROZEN_ID_OR_DOCKET_MISMATCH/);
 assert.throws(()=>validateCompleteChiefPublicReview(mutate(0,{department:"Life Sciences"}),roster,queue,old,expanded),
  /CHIEF25_FROZEN_ID_OR_DOCKET_MISMATCH/);
 assert.throws(()=>validateCompleteChiefPublicReview(mutate(0,{requirementId:"chief-expansion-archer-K3"}),roster,queue,old,expanded),
  /CHIEF25_FROZEN_ID_OR_DOCKET_MISMATCH/);
 assert.throws(()=>validateCompleteChiefPublicReview(mutate(0,{pilotId:"forged"}),roster,queue,old,expanded),
  /CHIEF25_FROZEN_ID_OR_DOCKET_MISMATCH/);
 const duplicate=structuredClone(remaining);duplicate.items[1]=duplicate.items[0];
 assert.throws(()=>validateCompleteChiefPublicReview(duplicate,roster,queue,old,expanded),
  /CHIEF25_DUPLICATE_UNKNOWN_OR_PREVIOUS_CHIEF/);
});
test("No manifest edits may elevate a public pilot into licensed, verified or owner-approved knowledge",()=>{
 for(let i=0;i<remaining.items.length;i++){
  for(const k of [
   "originalSourceTextCopied","independentPublisherAuthentication","independentlyVerifiedClaim",
   "licensingReviewed","ownerApproved","citableByLiveAgents","sharedMemoryPromotionAllowed"
  ]){
   assert.throws(()=>validateCompleteChiefPublicReview(mutate(i,{[k]:true}),roster,queue,old,expanded),
    /CHIEF25_UNAPPROVED_STATE_VIOLATION/);
  }
 }
 const forged=structuredClone(remaining);forged.ownerApproval="GRANTED";
 assert.throws(()=>validateCompleteChiefPublicReview(forged,roster,queue,old,expanded),
  /CHIEF25_MANIFEST_MUST_BE_UNAPPROVED_AND_COMPLETE/);
 const enhanced=structuredClone(remaining);enhanced.items[0].ownerToken="not-real";
 assert.throws(()=>validateCompleteChiefPublicReview(enhanced,roster,queue,old,expanded),
  /CHIEF25_DUPLICATE_UNKNOWN_OR_PREVIOUS_CHIEF/);
});
test("No date inventions, missing inspections, deleted requirements or roster mutations accepted",()=>{
 assert.throws(()=>validateCompleteChiefPublicReview(mutate(0,{publicationDate:"2026-02-30"}),roster,queue,old,expanded),
  /CHIEF25_INVALID_SOURCE_METADATA/);
 assert.throws(()=>validateCompleteChiefPublicReview(mutate(0,{publicationDate:"2030-01-01"}),roster,queue,old,expanded),
  /CHIEF25_INVALID_SOURCE_METADATA/);
 const shortened=structuredClone(remaining);shortened.items.pop();
 assert.throws(()=>validateCompleteChiefPublicReview(shortened,roster,queue,old,expanded),
  /CHIEF25_MANIFEST_MUST_BE_UNAPPROVED_AND_COMPLETE/);
 assert.throws(()=>validateCompleteChiefPublicReview(remaining,{...roster,records:roster.records.slice(1)},queue,old,expanded),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
 assert.throws(()=>validateCompleteChiefPublicReview(remaining,roster,{...queue,items:queue.items.slice(1)},old,expanded),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
