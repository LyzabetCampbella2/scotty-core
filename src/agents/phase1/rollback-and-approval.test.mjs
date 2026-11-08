import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {makePhase1ReviewPackets} from "./review-packets.mjs";
import {beginDraftRevisionJournal,appendOfflineDraftRevision} from "./revision-journal.mjs";
import {prepareOfflineRollback,verifyOfflineRollbackPlan,ownerApprovalRequirementsForRelease} from "./rollback-and-approval.mjs";

const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=load("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const packet=makePhase1ReviewPackets(createPhase1BrainDrafts(roster,lock)).packets[0];
const v0=beginDraftRevisionJournal(packet);
const v1=appendOfflineDraftRevision(v0,{proposedSignatureQuestion:"What does the proposed method actually measure?"},"review-a");
const v2=appendOfflineDraftRevision(v1,{proposedChiefDeliverable:"A synthetic evidence sheet"},"review-b");

test("Rollback proposal targets exact historical draft but never changes live state",()=>{
 const plan=prepareOfflineRollback(v2,0,"Return to baseline until owner can review changes");
 assert.equal(verifyOfflineRollbackPlan(plan,v2),true);
 assert.equal(plan.currentRevision,2);
 assert.equal(plan.targetRevision,0);
 assert.equal(plan.approvalRequired,true);
 assert.equal(plan.authenticatedOwnerApproval,false);
 assert.equal(plan.automaticExecutionSupported,false);
 assert.equal(plan.affectsLiveAgent,false);
 assert.equal(plan.changesDatabase,false);
 assert.equal(plan.status,"PREPARED_NOT_EXECUTED");
 assert.equal(v2.events.length,3);
 assert.equal(v2.events[2].proposal.proposedChiefDeliverable,"A synthetic evidence sheet");
});
test("Rollback proposal rejects stale chain, replays, mutation, forward revision and false approval",()=>{
 assert.throws(()=>prepareOfflineRollback(v2,2,"Too recent a revision"),/ROLLBACK_MUST_TARGET_OLDER_VALID_DRAFT/);
 assert.throws(()=>prepareOfflineRollback(v2,-1,"Out of bounds"),/ROLLBACK_MUST_TARGET_OLDER_VALID_DRAFT/);
 assert.throws(()=>prepareOfflineRollback(v2,0,""),/ROLLBACK_REASON_REQUIRED/);
 const plan=prepareOfflineRollback(v2,0,"Return to draft baseline");
 assert.equal(verifyOfflineRollbackPlan({...plan,authenticatedOwnerApproval:true},v2),false);
 assert.equal(verifyOfflineRollbackPlan({...plan,automaticExecutionSupported:true},v2),false);
 assert.equal(verifyOfflineRollbackPlan({...plan,targetRevision:1},v2),false);
 assert.equal(verifyOfflineRollbackPlan({...plan,proposedTargetFields:{forged:true}},v2),false);
 assert.equal(verifyOfflineRollbackPlan(plan,v1),false);
 const tampered=structuredClone(v2);
 tampered.events[1].proposal.proposedSignatureQuestion="Injected";
 assert.throws(()=>prepareOfflineRollback(tampered,0,"Reject tampering"),/REJECT_INVALID_JOURNAL/);
});
test("Release design requires an independent authenticated owner and A0 proof",()=>{
 const requirements=ownerApprovalRequirementsForRelease(packet);
 assert.equal(requirements.approved,false);
 assert.equal(requirements.allowRuntimeActivation,false);
 assert.equal(requirements.noImplicitApprovalFromGitCommit,true);
 assert.equal(requirements.noImplicitApprovalFromChatMessage,true);
 assert.ok(requirements.require.some(x=>x.includes("Stage A0 operational")));
 assert.ok(requirements.require.some(x=>x.includes("Verified")||x.includes("verified")));
 assert.throws(()=>ownerApprovalRequirementsForRelease({...packet,certification:"CERTIFIED"}),/RELEASE_POLICY_REQUIRES_UNAPPROVED_PACKET/);
});
