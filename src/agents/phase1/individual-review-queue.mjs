/**
 * Offline owner-review queue. This module records proposed review work only:
 * it cannot authenticate owner decisions, grant agent tools, approve a persona,
 * change an immutable ID or launch an agent.
 *
 * The exported queue contains 185 individual review worksheets ordered by
 * department then chief-first. All review stages are uncompleted by default.
 */
import {createHash} from "node:crypto";

const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const text=value=>typeof value==="string"&&value.trim().length>0&&value.length<=500;
const STAGES=Object.freeze(["DRAFT_TO_REVIEW","REVISION_REQUESTED","READY_FOR_EXTERNAL_OWNER_REVIEW"]);
const ALLOWED_ACTIONS=Object.freeze(["REQUEST_REVISION","MARK_PREPARED"]);
const REQUEST_FIELDS=new Set(["agentId","action","reviewerNotes","expectedVersionHash"]);

function strictKeys(value,allowed){
 return value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.has(k));
}
function baseWorksheet(packet){
 if(!packet||!text(packet.canonicalAgentId)||!text(packet.department)||
    !text(packet.displayName)||!text(packet.provenance?.rosterGitBlobSha)||
    packet.certification!=="NOT_CERTIFIED"||
    packet.ownerReviewState!=="AWAITING_OWNER_REVIEW"||
    packet.authorization?.liveAgentEnabled!==false)throw Error("B1_UNAPPROVED_PACKET_REQUIRED");
 const id=packet.canonicalAgentId;
 const needs=Object.freeze([
  {key:"traits",question:"Which of these proposed traits accurately fits "+packet.displayName+"?",status:"PENDING"},
  {key:"communication",question:"What tone, autonomy limits, humor and check-in preferences should "+packet.displayName+" use?",status:"PENDING"},
  {key:"method",question:"Which role method and failure boundary for "+packet.specialty+" should be retained or revised?",status:"PENDING"},
  {key:"sources",question:"Which public references or verified data sources should "+packet.displayName+" be allowed to rely on?",status:"PENDING"},
  {key:"collaboration",question:packet.role==="Chief"?"Which peer chiefs may be consulted on an owner-approved mission?":"What exact handoff and escalation should go to "+packet.chiefId+"?",status:"PENDING"},
  {key:"identity",question:packet.identityConflict?"Resolve legacy identity mismatch without changing "+id+".":packet.departmentDrift?"Review legacy department naming drift without changing "+id+".":"Confirm approved ID and display name remain unchanged.",status:"PENDING"}
 ]);
 const worksheet={
  worksheetId:"b1-worksheet-"+id,
  canonicalAgentId:id,displayName:packet.displayName,
  role:packet.role,department:packet.department,specialty:packet.specialty,
  chiefId:packet.chiefId,
  rosterBlobSha:packet.provenance.rosterGitBlobSha,
  originalReviewPacketId:packet.packetId,
  reviewStage:"DRAFT_TO_REVIEW",
  draftedQuestions:needs,
  unansweredQuestions:needs.length,
  proposalSource:"OWNER_REVIEW_PACKET_ROLE_DERIVED_ONLY",
  requestedRevisions:[],
  externalOwnerIdentityVerified:false,
  ownerApprovalEvidence:null,
  personalityApproved:false,
  knowledgeVerified:false,
  realModelTestsPassed:0,
  canActivate:false
 };
 return {...worksheet,versionHash:digest(worksheet)};
}

export function makeIndividualReviewQueue(packets){
 if(packets?.reviewStatus!=="PENDING_OWNER_INDIVIDUAL_REVIEW"||
    packets?.a0OperationalCertified!==false||packets.packets?.length!==185||
    packets.queue?.length!==25)throw Error("B1_OWNER_REVIEW_PACKET_SET_REQUIRED");
 const byId=new Map(packets.packets.map(p=>[p.canonicalAgentId,p]));
 if(byId.size!==185)throw Error("DUPLICATE_CANONICAL_ID");
 const order=packets.queue.flatMap(dept=>{
  if(!dept.chiefId||dept.agentIds?.length<1||
     dept.agentIds[0]!==dept.chiefId)throw Error("INVALID_CHIEF_FIRST_QUEUE");
  return dept.agentIds.map(id=>{
   const packet=byId.get(id);
   if(!packet||packet.department!==dept.department)throw Error("INVALID_REVIEW_HANDOFF");
   return baseWorksheet(packet);
  });
 });
 if(order.length!==185||new Set(order.map(p=>p.canonicalAgentId)).size!==185)
  throw Error("REVIEW_QUEUE_INCOMPLETE");
 return {
  schemaVersion:1,phase:"B1",reviewMode:"OFFLINE_PROPOSAL_ONLY",
  rosterBlobSha:order[0].rosterBlobSha,
  items:order,departmentCount:25,
  summary:{total:185,draft:185,revisionRequested:0,preparedForExternalReview:0,
   personalityApproved:0,knowledgeVerified:0,modelEvaluationsPassed:0,active:0}
 };
}

export function proposeReviewTransition(worksheet,command){
 if(!worksheet||!text(worksheet.canonicalAgentId)||
    !STAGES.includes(worksheet.reviewStage)||
    worksheet.canActivate!==false||
    worksheet.personalityApproved!==false||
    worksheet.externalOwnerIdentityVerified!==false||
    worksheet.ownerApprovalEvidence!==null||
    !Array.isArray(worksheet.draftedQuestions)||worksheet.draftedQuestions.length!==6||
    worksheet.versionHash!==digest(Object.fromEntries(Object.entries(worksheet).filter(([k])=>k!=="versionHash"))))
    throw Error("REVIEW_WORKSHEET_INVALID");
 if(!strictKeys(command,REQUEST_FIELDS)||command.agentId!==worksheet.canonicalAgentId||
    command.expectedVersionHash!==worksheet.versionHash||
    !ALLOWED_ACTIONS.includes(command.action)||!text(command.reviewerNotes))
    throw Error("INVALID_REVIEW_TRANSITION");
 if(command.action==="MARK_PREPARED"&&worksheet.reviewStage==="DRAFT_TO_REVIEW"&&
    command.reviewerNotes.length<12)
    throw Error("EVIDENCE_PREPARATION_NOTE_REQUIRED");
 const next={
  ...worksheet,
  reviewStage:command.action==="REQUEST_REVISION"?"REVISION_REQUESTED":"READY_FOR_EXTERNAL_OWNER_REVIEW",
  requestedRevisions:[...worksheet.requestedRevisions,{
   action:command.action,notes:command.reviewerNotes,
   status:"OFFLINE_REVIEW_SUGGESTION_NOT_OWNER_APPROVAL"
  }],
  // Even "prepared" does not resolve any questions, validate sources, or confer rights.
  externalOwnerIdentityVerified:false,ownerApprovalEvidence:null,
  personalityApproved:false,knowledgeVerified:false,realModelTestsPassed:0,canActivate:false
 };
 const {versionHash:ignored,...record}=next;
 return {...record,versionHash:digest(record)};
}

/** Describes required future external integration; never authenticates. */
export function ownerReviewHandoff(worksheet){
 if(!worksheet||worksheet.reviewStage!=="READY_FOR_EXTERNAL_OWNER_REVIEW"||
    worksheet.canActivate!==false)throw Error("NOT_READY_FOR_EXTERNAL_REVIEW");
 return {
  agentId:worksheet.canonicalAgentId,
  draftVersionHash:worksheet.versionHash,
  status:"REQUIRES_TRUSTED_OWNER_SESSION_AND_INDEPENDENT_EVIDENCE",
  requiredExternalProof:[
   "Verified owner identity and explicit exact agent/version decision",
   "Signed or server-verified time-bound approval and immutable audit receipt",
   "Reviewed knowledge sources, real-model behavior tests and role boundary proofs",
   "Phase A0 operational certification and per-tool runtime enforcement"
  ],
  approvesAgent:false,activatesAgent:false
 };
}
