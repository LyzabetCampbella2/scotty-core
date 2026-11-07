/**
 * Phase 1 owner-review queue and static rubric; zero model calls and no
 * project/memory access. Structural completeness is not live certification.
 */
import {INDIVIDUAL_BRAINS,roleResponsePreview} from './individual-agent-brains.mjs';
import {OWNER_OVERLAY_COUNT} from './owner-chief-design-overlays.mjs';
import {agentEvaluationPlan} from './phase1-behavior-evaluation.mjs';
import {roleContract,overlappingSpecialtyReport} from './agent-role-contracts.mjs';

export const PHASE1_AUDIT_VERSION='phase1-agent-review-v1';
const syntheticTask='Plan a new fictional service with evidence, risks, accessibility, deadline and approval conditions.';
export function phase1AgentReview(agentId){
 const b=INDIVIDUAL_BRAINS.find(x=>x.id===agentId);
 if(!b)throw Error('UNKNOWN_AGENT_ID');
 const preview=roleResponsePreview(agentId,syntheticTask);
 const specialty=roleContract(agentId);
 const evaluation=agentEvaluationPlan(agentId);
 const structural={
  identity:Boolean(b.id&&b.name&&b.department),
  specialty:Boolean(b.focus&&b.specialties.length),
  persona:Boolean(b.persona.voice&&b.reasoningInstructions),
  workingMethod:b.workingMethod.length>=4,
  communication:Boolean(b.communication.reportsTo&&b.communication.style),
  limitations:b.limitations.length>=5,
  completionStandards:b.completionStandards.length>=3,
  toolsDenied:b.grantedToolIds.length===0,
  taskMethod:Boolean(preview.workContract.method&&preview.workContract.deliverable)
 };
 const structuralPassed=Object.values(structural).every(Boolean);
 return {
  agentId:b.id,name:b.name,role:b.role,department:b.department,
  canonicalChiefId:b.chiefId,
  workstream:specialty.specializationTrack,
  workstreamArtifact:specialty.artifact,
  roleContractVersion:specialty.schemaVersion,
  evaluationPlanVersion:evaluation.version,
  evaluationScenariosPrepared:evaluation.behaviorCases.length,
  activeProfileRevision:null,
  editableFieldsAwaitVerifiedReview:true,
  structural,structuralPassed,
  ownerRecordStatus:b.ownerDesign?'SOURCE_BACKED_CHIEF_RECORD':'GENERATED_DEFAULT_NEEDS_OWNER_REVIEW',
  sourceRecord:b.ownerDesign?.provenance.selectionRecord||null,
  ownerAcceptance:false,
  roleBehaviorEvaluatedWithRealModel:false,
  privateMemoryVerified:false,
  productionPermissionGranted:false,
  toolExecutions:0,aiCalls:0,
  nextAction:b.ownerDesign?
   'Review mapped selections against owner record and approve this compiled chief profile':
   'Customize personality, handoff and standards with owner, then approve',
  certificationStatus:'NOT_CERTIFIED'
 };
}
export function phase1ReadinessReport(){
 const profiles=INDIVIDUAL_BRAINS.map(x=>phase1AgentReview(x.id));
 const overlaps=overlappingSpecialtyReport();
 const counts={
  profiles:profiles.length,
  roleContracts:profiles.filter(x=>Boolean(x.roleContractVersion)).length,
  evaluationCasesPrepared:profiles.reduce((n,x)=>n+x.evaluationScenariosPrepared,0),
  overlappingSpecialtyGroups:overlaps.overlappingGroups,
  overlappingSpecialistAgents:overlaps.overlappingAgents,
  generatedProfilesRequiringOwnerReview:profiles.filter(x=>x.ownerRecordStatus!=='SOURCE_BACKED_CHIEF_RECORD').length,
  chiefs:profiles.filter(x=>x.role==='chief').length,
  specialists:profiles.filter(x=>x.role==='specialist').length,
  structuralPasses:profiles.filter(x=>x.structuralPassed).length,
  sourceBackedChiefProfiles:profiles.filter(x=>x.ownerRecordStatus==='SOURCE_BACKED_CHIEF_RECORD').length,
  generatedChiefProfiles:profiles.filter(x=>x.role==='chief'&&x.ownerRecordStatus!=='SOURCE_BACKED_CHIEF_RECORD').length,
  specialistProfilesPendingOwnerReview:profiles.filter(x=>x.role==='specialist'&&!x.ownerAcceptance).length,
  ownerAccepted:profiles.filter(x=>x.ownerAcceptance).length,
  modelBehaviorCertified:profiles.filter(x=>x.roleBehaviorEvaluatedWithRealModel).length
 };
 if(counts.profiles!==185||counts.chiefs!==25||counts.specialists!==160||
   counts.sourceBackedChiefProfiles!==OWNER_OVERLAY_COUNT||counts.sourceBackedChiefProfiles!==8)
   throw Error('PHASE1_AUDIT_ROSTER_MISMATCH');
 return {
  version:PHASE1_AUDIT_VERSION,status:'REVIEW_AND_MODEL_EVALUATION_REQUIRED',
  counts,profiles,
  activeRealAgents:0,modelCallsMade:0,unauthorizedToolsGranted:0,
  allProfilesCertified:false,
  riskFlags:[
   'Chief owner records are preserved but compiled versions lack final owner approval',
   '17 chiefs and all 160 specialists have generated defaults requiring individual review',
   'Deterministic template differentiation is not proof of distinct model behavior',
   'No protected memory or production account access is established by this audit'
  ]
 };
}
