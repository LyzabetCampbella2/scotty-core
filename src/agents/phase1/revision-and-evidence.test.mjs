import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {makePhase1ReviewPackets} from "./review-packets.mjs";
import {buildEvaluationMatrix} from "./evaluation-matrix.mjs";
import {
 beginDraftRevisionJournal,appendOfflineDraftRevision,
 verifyDraftRevisionJournal,draftRevisionSummary
} from "./revision-journal.mjs";
import {
 prepareOfflineFixture,verifyOfflineFixture,offlineFixtureReviewStatus
} from "./evaluation-records.mjs";

const read=relative=>JSON.parse(readFileSync(new URL(relative,import.meta.url),"utf8"));
const roster=read("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const drafts=createPhase1BrainDrafts(roster,lock);
const packets=makePhase1ReviewPackets(drafts);
const evaluationMatrix=buildEvaluationMatrix(drafts);

test("185 individual baseline journals preserve canonical IDs and pending-approval status",()=>{
 assert.equal(packets.packets.length,185);
 const ids=new Set();
 for(const p of packets.packets){
  const journal=beginDraftRevisionJournal(p);
  assert.equal(verifyDraftRevisionJournal(journal),true,p.canonicalAgentId);
  ids.add(journal.agentId);
  assert.equal(journal.events.length,1);
  assert.equal(journal.events[0].revisionNumber,0);
  assert.equal(journal.rosterBlobSha,lock.snapshotGitBlobSha);
  assert.equal(journal.ownerApprovalEvidence,null);
  assert.equal(journal.certified,false);
  assert.equal(journal.runtimeEnabled,false);
  const summary=draftRevisionSummary(journal);
  assert.equal(summary.ownerApproved,false);
  assert.equal(summary.evidenceVerified,false);
  assert.equal(summary.canExecute,false);
 }
 assert.equal(ids.size,185);
});
test("Draft edits create ordered hash-linked snapshots and do not alter the input",()=>{
 const packet=packets.packets.find(p=>p.role==="Specialist");
 const base=beginDraftRevisionJournal(packet);
 const v1=appendOfflineDraftRevision(base,{
  proposedPersonalityTraits:["candid","deliberate","curious"],
  proposedSpecialistQuestion:"Which fictional evidence would refute this method?"
 },"offline-suggestion-v1");
 const v2=appendOfflineDraftRevision(v1,{proposedSpecialistDeliverable:"Synthetic test plan only"},"offline-suggestion-v2");
 assert.equal(verifyDraftRevisionJournal(base),true);
 assert.equal(verifyDraftRevisionJournal(v1),true);
 assert.equal(verifyDraftRevisionJournal(v2),true);
 assert.equal(base.events.length,1);
 assert.equal(v1.events.length,2);
 assert.equal(v2.events.length,3);
 assert.equal(v2.events[2].previousHash,v1.events[1].hash);
 assert.equal(v2.events[2].proposal.proposedSpecialistQuestion,"Which fictional evidence would refute this method?");
 assert.equal(v2.events[2].proposal.proposedSpecialistDeliverable,"Synthetic test plan only");
 assert.equal(v2.ownerApprovalEvidence,null);
 assert.equal(v2.runtimeEnabled,false);
 assert.equal(draftRevisionSummary(v2).revision,2);
});
test("Local revision history rejects approval/permission escalation and corrupted hash chain",()=>{
 const base=beginDraftRevisionJournal(packets.packets[0]);
 for(const key of ["ownerApproved","adoptedPersonalityTraits","authorization","externalTools","certification","liveAgentEnabled","memoryWriteEnabled","rosterBlobSha","canonicalAgentId","modelEvaluationBudgetUsd","ownerReviewState","sourceVerified","__proto__"]){
  const edits=JSON.parse('{"'+key+'":true}');
  assert.throws(()=>appendOfflineDraftRevision(base,edits,"not-authorized"),/FORBIDDEN_PERSONA_REVISION_FIELD/);
 }
 assert.throws(()=>appendOfflineDraftRevision(base,{},"empty"),/NO_DRAFT_EDITS/);
 assert.throws(()=>appendOfflineDraftRevision(base,{proposedSignatureQuestion:"x"},""),/REVIEW_CHANGE_REASON_REQUIRED/);
 const next=appendOfflineDraftRevision(base,{proposedSignatureQuestion:"What can the test actually prove?"},"question-revision");
 const tampered=structuredClone(next);
 tampered.events[1].proposal.proposedSignatureQuestion="Change after the fact";
 assert.equal(verifyDraftRevisionJournal(tampered),false);
 assert.throws(()=>appendOfflineDraftRevision(tampered,{proposedRoleMethod:[]},"retry"),/REVISION_CHAIN_INVALID/);
 const forged=structuredClone(next);
 forged.ownerApprovalEvidence="self-asserted-approval";
 assert.equal(verifyDraftRevisionJournal(forged),false);
 const forged2=structuredClone(next);
 forged2.runtimeEnabled=true;
 assert.equal(verifyDraftRevisionJournal(forged2),false);
});
test("All 555 offline evaluation fixture envelopes remain ungraded and unexecuted",()=>{
 assert.equal(evaluationMatrix.cases.length,555);
 const digests=new Set();
 for(const tc of evaluationMatrix.cases){
  const response="LOCAL FIXTURE: "+tc.evaluationId+". Draft scope only. No tool use or model response.";
  const receipt=prepareOfflineFixture(tc,response);
  assert.equal(verifyOfflineFixture(receipt,tc),true,tc.evaluationId);
  assert.match(receipt.outputSha256,/^[0-9a-f]{64}$/);
  digests.add(receipt.outputSha256);
  const review=offlineFixtureReviewStatus(receipt,tc);
  assert.equal(review.syntacticEvidenceIntact,true);
  assert.equal(review.realModelEvaluationPassed,false);
  assert.equal(review.ownerApproved,false);
  assert.equal(review.certified,false);
  assert.equal(receipt.modelExecutionStatus,"NOT_RUN");
  assert.equal(receipt.externalActionsPerformed,false);
 }
 assert.equal(digests.size,555);
});
test("Fixture replays, scope swaps, model-pass claims and payload corruption cannot validate",()=>{
 const cases=evaluationMatrix.cases;
 const first=prepareOfflineFixture(cases[0],"fictional sample text");
 assert.equal(verifyOfflineFixture(first,cases[0]),true);
 assert.equal(verifyOfflineFixture(first,cases[1]),false);
 assert.equal(verifyOfflineFixture({...first,outputText:"tampered"},cases[0]),false);
 assert.equal(verifyOfflineFixture({...first,agentId:"other-agent"},cases[0]),false);
 assert.equal(verifyOfflineFixture({...first,modelExecutionStatus:"PASS"},cases[0]),false);
 assert.equal(verifyOfflineFixture({...first,evaluationVerdict:"PASS"},cases[0]),false);
 assert.equal(verifyOfflineFixture({...first,canUseForRealModelCertification:true},cases[0]),false);
 assert.equal(offlineFixtureReviewStatus({...first,authenticatedOwnerApproval:"fake"},cases[0]).certified,false);
 assert.throws(()=>prepareOfflineFixture({...cases[0],verdict:"PASS"},"sample"),/LOCKED_UNRUN_EVALUATION_REQUIRED/);
 assert.throws(()=>prepareOfflineFixture({...cases[0],externalToolUseAllowed:true},"sample"),/LOCKED_UNRUN_EVALUATION_REQUIRED/);
 assert.throws(()=>prepareOfflineFixture(cases[0],""),/NONEMPTY_BOUNDED_SYNTHETIC_TEXT_REQUIRED/);
});
test("Source digest and frozen identity are unchanged",()=>{
 const bytes=readFileSync(new URL("../../../docs/a0/roster-frozen-2026-11-07.json",import.meta.url));
 const sha=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
 assert.equal(sha,lock.snapshotGitBlobSha);
 assert.equal(new Set(packets.packets.map(p=>p.canonicalAgentId)).size,185);
 assert.equal(packets.summary.modelTestsPassed,0);
 assert.equal(packets.summary.liveAgents,0);
});
