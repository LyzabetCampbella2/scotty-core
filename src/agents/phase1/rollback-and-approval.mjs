/**
 * Stage B1 offline rollback planning only.
 * A plan never changes the journal, approved persona, permissions, memory,
 * database, deployment or operational runtime. No real rollback is possible
 * before an independently authenticated owner and deployment integration.
 */
import {verifyDraftRevisionJournal} from "./revision-journal.mjs";
import {createHash} from "node:crypto";
const sha=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
export function prepareOfflineRollback(journal,targetRevision,reason){
 if(!verifyDraftRevisionJournal(journal))throw Error("REJECT_INVALID_JOURNAL");
 if(!Number.isInteger(targetRevision)||targetRevision<0||
    targetRevision>=journal.events.length-1)
    throw Error("ROLLBACK_MUST_TARGET_OLDER_VALID_DRAFT");
 if(typeof reason!=="string"||reason.trim().length<10||reason.length>500)
  throw Error("ROLLBACK_REASON_REQUIRED");
 const current=journal.events.at(-1),target=journal.events[targetRevision];
 const plan={
  kind:"OFFLINE_PROPOSAL_ROLLBACK_PLAN",
  canonicalAgentId:journal.agentId,
  rosterBlobSha:journal.rosterBlobSha,
  currentRevision:current.revisionNumber,
  currentHash:current.hash,
  targetRevision,
  targetHash:target.hash,
  proposedTargetFields:structuredClone(target.proposal),
  reason,
  approvalRequired:true,
  authenticatedOwnerApproval:false,
  externalEvidenceVerified:false,
  operatorAuthorization:false,
  affectsLiveAgent:false,
  changesDatabase:false,
  revokesPublishedVersion:false,
  automaticExecutionSupported:false,
  status:"PREPARED_NOT_EXECUTED"
 };
 return {...plan,planHash:sha(plan)};
}
export function verifyOfflineRollbackPlan(plan,journal){
 if(!verifyDraftRevisionJournal(journal)||!plan||plan.kind!=="OFFLINE_PROPOSAL_ROLLBACK_PLAN"||
    plan.status!=="PREPARED_NOT_EXECUTED"||plan.approvalRequired!==true||
    plan.authenticatedOwnerApproval!==false||plan.externalEvidenceVerified!==false||
    plan.operatorAuthorization!==false||plan.affectsLiveAgent!==false||
    plan.changesDatabase!==false||plan.revokesPublishedVersion!==false||
    plan.automaticExecutionSupported!==false||plan.canonicalAgentId!==journal.agentId||
    plan.rosterBlobSha!==journal.rosterBlobSha||
    plan.currentRevision!==journal.events.at(-1).revisionNumber||
    plan.currentHash!==journal.events.at(-1).hash||
    !Number.isInteger(plan.targetRevision)||plan.targetRevision<0||
    plan.targetRevision>=journal.events.length-1||
    plan.targetHash!==journal.events[plan.targetRevision].hash||
    JSON.stringify(plan.proposedTargetFields)!==JSON.stringify(journal.events[plan.targetRevision].proposal))
  return false;
 const {planHash,...source}=plan;
 return planHash===sha(source);
}
export function ownerApprovalRequirementsForRelease(packet){
 if(!packet||packet.certification!=="NOT_CERTIFIED"||
    packet.authorization?.liveAgentEnabled!==false)
  throw Error("RELEASE_POLICY_REQUIRES_UNAPPROVED_PACKET");
 return {
  canonicalAgentId:packet.canonicalAgentId,
  rosterBlobSha:packet.provenance.rosterGitBlobSha,
  requestedScope:"OWNER_APPROVAL_DESIGN_ONLY",
  require:[
   "Owner identity independently verified by runtime authentication",
   "Exact canonical ID, draft revision hash and immutable profile version",
   "Explicit selected traits, tone, boundaries and memory policy",
   "Every claimed knowledge source independently verified",
   "All three real model cases evidenced and independently reviewed",
   "Stage A0 operational isolation, emergency stop and recovery gates",
   "A valid bounded owner decision with revoke/rollback instructions"
  ],
  noImplicitApprovalFromGitCommit:true,
  noImplicitApprovalFromChatMessage:true,
  noAutoDeployment:true,
  allowRuntimeActivation:false,
  approved:false
 };
}
