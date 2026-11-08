import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {makePhase1ReviewPackets} from "./review-packets.mjs";
import {makeIndividualReviewQueue,proposeReviewTransition,ownerReviewHandoff} from "./individual-review-queue.mjs";

const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=load("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const reviews=makePhase1ReviewPackets(createPhase1BrainDrafts(roster,lock));
const queue=makeIndividualReviewQueue(reviews);

test("185 ordered review worksheets from the frozen roster, chiefs ahead of their specialists",()=>{
 assert.equal(queue.items.length,185);
 assert.equal(queue.departmentCount,25);
 assert.equal(queue.summary.draft,185);
 assert.equal(queue.summary.personalityApproved,0);
 assert.equal(queue.summary.active,0);
 assert.equal(new Set(queue.items.map(x=>x.canonicalAgentId)).size,185);
 const departments=[...new Set(queue.items.map(x=>x.department))];
 assert.equal(departments.length,25);
 for(const dept of departments){
  const group=queue.items.filter(x=>x.department===dept);
  assert.equal(group[0].role,"Chief",dept);
  assert.equal(group.filter(x=>x.role==="Chief").length,1);
  for(const person of group){
   assert.equal(person.draftedQuestions.length,6);
   assert.equal(person.unansweredQuestions,6);
   assert.equal(person.reviewStage,"DRAFT_TO_REVIEW");
   assert.equal(person.personalityApproved,false);
   assert.equal(person.ownerApprovalEvidence,null);
   assert.equal(person.canActivate,false);
   assert.equal(person.rosterBlobSha,lock.snapshotGitBlobSha);
  }
 }
});
test("Review transitions are offline, revision-tracked and never approvals",()=>{
 const first=queue.items[0];
 const pending=proposeReviewTransition(first,{agentId:first.canonicalAgentId,action:"REQUEST_REVISION",
  reviewerNotes:"Refine proposed reasoning to distinguish verified facts from assumptions",
  expectedVersionHash:first.versionHash});
 assert.equal(first.reviewStage,"DRAFT_TO_REVIEW");
 assert.equal(pending.reviewStage,"REVISION_REQUESTED");
 assert.equal(pending.requestedRevisions.length,1);
 assert.notEqual(first.versionHash,pending.versionHash);
 const prepared=proposeReviewTransition(pending,{agentId:first.canonicalAgentId,action:"MARK_PREPARED",
  reviewerNotes:"Draft has the requested question changes and is ready for external owner review",
  expectedVersionHash:pending.versionHash});
 assert.equal(prepared.reviewStage,"READY_FOR_EXTERNAL_OWNER_REVIEW");
 assert.equal(prepared.personalityApproved,false);
 assert.equal(prepared.canActivate,false);
 const handoff=ownerReviewHandoff(prepared);
 assert.equal(handoff.approvesAgent,false);
 assert.equal(handoff.activatesAgent,false);
 assert.ok(handoff.requiredExternalProof.length>=4);
});
test("Review rejects forged credentials, stale hashes, wrong IDs and extra approval fields",()=>{
 const person=queue.items[0];
 const req={agentId:person.canonicalAgentId,action:"MARK_PREPARED",reviewerNotes:"Ready for separate owner verification",
  expectedVersionHash:person.versionHash};
 assert.throws(()=>proposeReviewTransition(person,{...req,ownerApproved:true}),/INVALID_REVIEW_TRANSITION/);
 assert.throws(()=>proposeReviewTransition(person,{...req,agentId:"other-agent"}),/INVALID_REVIEW_TRANSITION/);
 assert.throws(()=>proposeReviewTransition(person,{...req,expectedVersionHash:"stale"}),/INVALID_REVIEW_TRANSITION/);
 assert.throws(()=>proposeReviewTransition({...person,canActivate:true},req),/REVIEW_WORKSHEET_INVALID/);
 assert.throws(()=>proposeReviewTransition({...person,displayName:"FORGED"},req),/REVIEW_WORKSHEET_INVALID/);
 assert.throws(()=>ownerReviewHandoff(person),/NOT_READY_FOR_EXTERNAL_REVIEW/);
 assert.throws(()=>makeIndividualReviewQueue({...reviews,packets:reviews.packets.slice(1)}),/B1_OWNER_REVIEW_PACKET_SET_REQUIRED/);
});
test("Identity conflict prompts are surfaced rather than silently resolved",()=>{
 const troi=queue.items.find(x=>x.displayName==="TROI");
 assert.equal(troi.canonicalAgentId,"chief-expansion-troi");
 assert.ok(troi.draftedQuestions.some(q=>q.key==="identity"&&q.question.includes("legacy identity mismatch")));
 assert.equal(troi.personalityApproved,false);
});
