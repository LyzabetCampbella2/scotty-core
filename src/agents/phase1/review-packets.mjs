import {knowledgeDossier} from "./knowledge-dossiers.mjs";
import {evaluationCasesFor} from "./evaluation-matrix.mjs";
/**
 * Stage B1 offline, identity-locked owner review packets.
 * No SQL, external AI, read of private memory, execution or account access.
 * All "passed" fields start FALSE; a filled worksheet is not certification.
 */
const REQUIRED_EVIDENCE = Object.freeze([
 "owner_chosen_distinctive_traits",
 "owner_chosen_tone_and_check_in_rules",
 "domain_method_and_failure_mode_review",
 "source_knowledge_provenance_review",
 "shared_model_test_with_output_evidence",
 "role_specific_model_test_with_output_evidence",
 "adversarial_permission_model_test_with_output_evidence",
 "owner_authenticated_profile_approval"
]);
function present(v){return typeof v==="string"&&v.trim().length>0;}
export function makePhase1ReviewPackets(drafts){
 if(!drafts||drafts.stage!=="B"||drafts.phase!==1||drafts.profiles?.length!==185)throw Error("PHASE_B1_DRAFTS_REQUIRED");
 if(new Set(drafts.profiles.map(p=>p.canonicalAgentId)).size!==185)throw Error("DUPLICATE_AGENT_ID");
 const packets=drafts.profiles.map(p=>{
  if(!present(p.canonicalAgentId)||!present(p.displayName)||!present(p.department)||!Array.isArray(p.behaviorTestPlan)||p.behaviorTestPlan.length!==3)throw Error("INCOMPLETE_BRAIN_DRAFT");
  if(p.permissions?.executionEnabled!==false||p.permissions?.externalAppAccess!==false||p.ownerApproved!==false)throw Error("LIVE_OR_APPROVED_DRAFT_REJECTED");
  const historic=p.priorChiefReview||null;
  const proposedChief=p.proposedNewChiefConcept||null;
  const proposedSpecialist=p.proposedSpecialistPersona||null;
  const knowledge=knowledgeDossier(p);
  const evaluations=evaluationCasesFor(p);
  return {
   packetId:"b1-review-"+p.canonicalAgentId,
   canonicalAgentId:p.canonicalAgentId,
   displayName:p.displayName,
   role:p.role,
   department:p.department,
   chiefId:p.chiefId,
   specialty:p.specialty,
   provenance:{rosterGitBlobSha:p.rosterBlobSha,method:p.distinctiveReasoning.provenance,legacyChief:historic?.sourceRef||null,proposedChief:proposedChief?{proposalVersion:proposedChief.proposalVersion,sourceKind:proposedChief.sourceKind}:null,proposedSpecialist:proposedSpecialist?{proposalVersion:proposedSpecialist.proposalVersion,sourceKind:proposedSpecialist.sourceKind}:null},
   ownerReviewState:"AWAITING_OWNER_REVIEW",
   ownerDecisions:{
    proposedPersonalityTraits:historic?.sourceTraits||proposedChief?.traits||proposedSpecialist?.proposedTraits||[],
    proposedLeadershipArchetype:proposedChief?.archetype||null,
    proposedSignatureQuestion:proposedChief?.signatureQuestion||null,
    proposedChiefMethod:proposedChief?.roleReasoningMethod||null,
    proposedChiefDeliverable:proposedChief?.exampleDeliverable||null,
    proposedChiefFailureRisk:proposedChief?.chiefFailureRisk||null,
    proposedSpecialistArchetype:proposedSpecialist?.proposedArchetype||null,
    proposedSpecialistCommunication:proposedSpecialist?.proposedCommunication||null,
    proposedSpecialistQuestion:proposedSpecialist?.signatureInquiry||null,
    proposedSpecialistMethod:proposedSpecialist?.proposedReasoningMethod||null,
    proposedSpecialistDeliverable:proposedSpecialist?.proposedDeliverable||null,
    proposedSpecialistFailureRisk:proposedSpecialist?.primaryFailureRisk||null,
    adoptedPersonalityTraits:[],
    proposedRoleMethod:p.distinctiveReasoning.initialSequence,
    adoptedRoleMethod:false,
    ownerPreferredCollaborators:[],
    ownerPreferredTone:null,
    avatar:null,voice:null,
    memoryScope:"none",
    modelEvaluationBudgetUsd:0,
    aliasOrIdentityChangeApproved:false
   },
   knowledgeReadiness:knowledge,
   methodology:{
    coverage:p.distinctiveReasoning.methodCoverage,
    example:p.distinctiveReasoning.workedSyntheticExample,
    qualityCriteria:p.distinctiveReasoning.specialistStandards,
    failureModes:p.distinctiveReasoning.failureModes,
    candidateSources:p.distinctiveReasoning.domainSources,
    sourceVerificationComplete:false
   },
   identityConflict:historic?.identityStatus==="LEGACY_ID_MISMATCH_REQUIRES_OWNER_REVIEW"?{
    legacyAgentId:historic.legacyAgentId,
    canonicalAgentId:p.canonicalAgentId,
    ownerDecisionRequired:true,
    automaticMigrationAllowed:false
   }:null,
   departmentDrift:historic?.identityStatus==="MATCHED_ID_NAME_DEPARTMENT_DRIFT_REVIEW"?{
    sourceDepartment:historic.legacyDepartment,canonicalDepartment:p.department,
    ownerDecisionRequired:true
   }:null,
   behaviorCases:evaluations.map(t=>({
    testId:t.evaluationId,type:t.type,scenario:t.prompt,
    status:"NOT_RUN",realModelOutputRef:null,reviewedBy:null,reviewResult:null,
    rubric:t.rubric,expectedEvidence:{modelUsed:null,modelVersion:null,outputHash:null,observedAt:null},
    externalToolUseAllowed:false
   })),
   evidenceChecklist:REQUIRED_EVIDENCE.map(k=>({key:k,passed:false,reviewer:null,evidenceRef:null})),
   authorization:{rolePermissionsApproved:false,liveAgentEnabled:false,externalTools:[],memoryWriteEnabled:false,productionAccessAllowed:false},
   certification:"NOT_CERTIFIED",
   reminder:"This packet does not approve personality, memory, permissions, budgets or external execution."
  };
 });
 const byDept=new Map();
 for(const p of packets){
  const a=byDept.get(p.department)||[];
  a.push(p);
  byDept.set(p.department,a);
 }
 const queue=[...byDept.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([name,agents])=>({
  department:name,
  chiefId:agents.find(x=>x.role==="Chief")?.canonicalAgentId||null,
  agentIds:agents.sort((a,b)=>a.role===b.role?a.canonicalAgentId.localeCompare(b.canonicalAgentId):a.role==="Chief"?-1:1).map(x=>x.canonicalAgentId),
  ownerApprovedAgentVersions:0,
  completedRealModelEvaluations:0
 }));
 if(queue.length!==25||queue.some(x=>!x.chiefId))throw Error("INVALID_DEPARTMENT_ASSIGNMENTS");
 return {
  schemaVersion:1,stage:"B",phase:1,reviewStatus:"PENDING_OWNER_INDIVIDUAL_REVIEW",
  a0OperationalCertified:false,packets,queue,
  summary:{packets:185,departments:25,evidenceChecks:185*REQUIRED_EVIDENCE.length,knowledgeRequirements:185*3,researchQuestions:185*4,plannedTests:555,modelRubricCriteria:555*4,verifiedKnowledgeSources:0,modelTestsPassed:0,approvedPersonalities:0,liveAgents:0},
  safeOperation:"OFFLINE_REVIEW_ONLY"
 };
}
