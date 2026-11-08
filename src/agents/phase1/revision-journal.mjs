/**
 * Stage B1 offline review-revision journal (NOT an authentication service).
 *
 * Version snapshots are immutable within this pure function's return values,
 * linked by sha256 to help reviewers detect accidental or malicious edits.
 * A Git commit or local hash chain is NOT independent proof of owner identity
 * and cannot authorize any access, agent execution or production deployment.
 */
import {createHash} from "node:crypto";

const isText=x=>typeof x==="string"&&x.length>0&&x.length<=500;
const serialized=x=>JSON.stringify(x);
const sha=x=>createHash("sha256").update(serialized(x)).digest("hex");
const JOURNAL_FIELDS=new Set(["schemaVersion","agentId","rosterBlobSha","type","events","ownerApprovalEvidence","independentlyAuthenticated","certified","runtimeEnabled"]);
const EVENT_FIELDS=new Set(["schemaVersion","agentId","rosterBlobSha","revisionNumber","previousHash","proposal","editorContext","reviewState","hash"]);
const SAFE_EDITABLE_FIELDS=new Set([
  "proposedPersonalityTraits","proposedLeadershipArchetype",
  "proposedSignatureQuestion","proposedChiefMethod",
  "proposedChiefDeliverable","proposedChiefFailureRisk",
  "proposedSpecialistArchetype","proposedSpecialistCommunication",
  "proposedSpecialistQuestion","proposedSpecialistMethod",
  "proposedSpecialistDeliverable","proposedSpecialistFailureRisk",
  "proposedRoleMethod"
]);
function ensureSafeFields(fields){
  if(!fields||typeof fields!=="object"||Array.isArray(fields)||
     Object.keys(fields).length===0)throw Error("NO_DRAFT_EDITS");
  for(const [key,value] of Object.entries(fields)){
    if(!SAFE_EDITABLE_FIELDS.has(key))throw Error("FORBIDDEN_PERSONA_REVISION_FIELD:"+key);
    if(value===undefined||typeof value==="function")throw Error("INVALID_DRAFT_FIELD:"+key);
    const encoded=JSON.stringify(value);
    if(encoded===undefined||encoded.length>8000)throw Error("INVALID_DRAFT_FIELD:"+key);
    if(value!==null&&typeof value==="object"){
      if(Array.isArray(value)&&value.some(x=>typeof x!=="string"))throw Error("INVALID_DRAFT_FIELD:"+key);
      if(!Array.isArray(value)&&Object.values(value).some(v=>!["string","number","boolean"].includes(typeof v)))
        throw Error("INVALID_DRAFT_FIELD:"+key);
      if(!Array.isArray(value)&&Object.keys(value).some(k=>/^(ownerApproved|certified|authorization|memoryWriteEnabled|liveAgentEnabled|runtimeEnabled)$/i.test(k)))
        throw Error("INVALID_DRAFT_FIELD:"+key);
    }
  }
}
function restricted(packet){
  if(!packet||!isText(packet.canonicalAgentId)||!isText(packet.displayName)||
     !isText(packet.provenance?.rosterGitBlobSha)||packet.certification!=="NOT_CERTIFIED"||
     packet.ownerReviewState!=="AWAITING_OWNER_REVIEW"||
     packet.authorization?.liveAgentEnabled!==false||
     packet.authorization?.productionAccessAllowed!==false||
     packet.authorization?.memoryWriteEnabled!==false||
     packet.ownerDecisions?.adoptedRoleMethod!==false||
     packet.ownerDecisions?.adoptedPersonalityTraits?.length!==0)
    throw Error("LOCKED_REVIEW_PACKET_REQUIRED");
}
const digestEvent=event=>sha({
  schemaVersion:event.schemaVersion,
  agentId:event.agentId,
  rosterBlobSha:event.rosterBlobSha,
  revisionNumber:event.revisionNumber,
  previousHash:event.previousHash,
  proposal:event.proposal,
  editorContext:event.editorContext,
  reviewState:event.reviewState
});

export function beginDraftRevisionJournal(packet){
  restricted(packet);
  const proposal=Object.fromEntries(
    [...SAFE_EDITABLE_FIELDS].map(field=>[field,packet.ownerDecisions[field]??null])
  );
  const event={
    schemaVersion:1,
    agentId:packet.canonicalAgentId,
    rosterBlobSha:packet.provenance.rosterGitBlobSha,
    revisionNumber:0,
    previousHash:null,
    proposal,
    editorContext:"OFFLINE_SOURCE_CANDIDATE",
    reviewState:"UNAPPROVED_DRAFT",
    hash:null
  };
  event.hash=digestEvent(event);
  return {schemaVersion:1,agentId:event.agentId,
    rosterBlobSha:event.rosterBlobSha,
    type:"OFFLINE_REVIEW_PROPOSAL_ONLY",
    events:[event],
    ownerApprovalEvidence:null,
    independentlyAuthenticated:false,
    certified:false,
    runtimeEnabled:false
  };
}
export function verifyDraftRevisionJournal(journal){
  if(!journal||Object.keys(journal).some(k=>!JOURNAL_FIELDS.has(k))||journal.type!=="OFFLINE_REVIEW_PROPOSAL_ONLY"||
     !isText(journal.agentId)||!isText(journal.rosterBlobSha)||
     !Array.isArray(journal.events)||journal.events.length===0||
     journal.ownerApprovalEvidence!==null||
     journal.independentlyAuthenticated!==false||
     journal.certified!==false||journal.runtimeEnabled!==false)return false;
  let previous=null;
  for(let index=0;index<journal.events.length;index++){
    const entry=journal.events[index];
    if(!entry||Object.keys(entry).some(k=>!EVENT_FIELDS.has(k))||
       entry.agentId!==journal.agentId||
       entry.rosterBlobSha!==journal.rosterBlobSha||
       entry.revisionNumber!==index||entry.previousHash!==previous||
       entry.reviewState!=="UNAPPROVED_DRAFT"||
       entry.schemaVersion!==1||
       !entry.proposal||typeof entry.proposal!=="object"||
       Object.keys(entry.proposal).some(k=>!SAFE_EDITABLE_FIELDS.has(k))||
       entry.hash!==digestEvent(entry))return false;
    previous=entry.hash;
  }
  return true;
}
export function appendOfflineDraftRevision(journal,edits,reason){
  if(!verifyDraftRevisionJournal(journal))throw Error("REVISION_CHAIN_INVALID");
  ensureSafeFields(edits);
  if(!isText(reason))throw Error("REVIEW_CHANGE_REASON_REQUIRED");
  const last=journal.events[journal.events.length-1];
  const proposal={...last.proposal,...structuredClone(edits)};
  if(serialized(proposal).length>20000)throw Error("DRAFT_CHANGE_TOO_LARGE");
  const event={
    schemaVersion:1,agentId:journal.agentId,
    rosterBlobSha:journal.rosterBlobSha,
    revisionNumber:last.revisionNumber+1,
    previousHash:last.hash,
    proposal,
    editorContext:"OFFLINE_DRAFT_EDIT_REASON:"+reason,
    reviewState:"UNAPPROVED_DRAFT",
    hash:null
  };
  event.hash=digestEvent(event);
  return {...journal,events:[...journal.events,event]};
}
/** Never promotes a journal to owner approval; serves review preparation only. */
export function draftRevisionSummary(journal){
  if(!verifyDraftRevisionJournal(journal))throw Error("REVISION_CHAIN_INVALID");
  const latest=journal.events.at(-1);
  return {agentId:journal.agentId,revision:latest.revisionNumber,
    lastHash:latest.hash,sourceRoster:journal.rosterBlobSha,
    revisions:journal.events.length,ownerApproved:false,
    evidenceVerified:false,certified:false,canExecute:false};
}
