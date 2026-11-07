/**
 * Phase 1 agent workbench — OWNER-ONLY READ-ONLY routes for isolated SCOTTY lab.
 * The native reviewed brain registry is a development specification, not a
 * certified live model. Optional D1 ledger rows are filtered by configured
 * server-side owner identity and never activate a profile or grant permissions.
 */
import {phase1ReadinessReport,phase1AgentReview} from './phase1-agent-review.mjs';
import {agentBrain} from './individual-agent-brains.mjs';
import {agentEvaluationPlan} from './phase1-behavior-evaluation.mjs';
import {phase1ProfileLedgerReadiness} from './phase1-profile-review-store.mjs';

export const PHASE1_WORKBENCH_PATH='/api/phase1/agent-workbench';
const ids=/^[a-z0-9][a-z0-9_-]{3,99}$/i;
const headers={
 'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store',
 'x-content-type-options':'nosniff',
 'referrer-policy':'no-referrer',
 'x-frame-options':'DENY'
};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
export const isPhase1WorkbenchPath=path=>path===PHASE1_WORKBENCH_PATH;

async function ownerReviewHistory(env,agentId){
 // This API does not solicit private data or grant review permissions. When
 // feature disabled or schema not installed, show no "approved" state at all.
 if(env?.SCOTTY_PHASE1_REVIEW_READ_ENABLED!=='true')
  return {connected:false,state:'REVIEW_LEDGER_NOT_CONNECTED',entries:[],currentReviewId:null};
 const ownerId=env?.SCOTTY_PHASE1_REVIEW_OWNER_ID;
 if(typeof ownerId!=='string'||!ids.test(ownerId))
  return {connected:false,state:'OWNER_ID_NOT_CONFIGURED',entries:[],currentReviewId:null};
 const readiness=await phase1ProfileLedgerReadiness(env?.BRAIN_DB);
 if(!readiness.ready)
  return {connected:false,state:readiness.reason||'LEDGER_NOT_READY',
   entries:[],currentReviewId:null};
 try{
  // Never return edits, comments, private inputs, or unscoped user records.
  const rows=(await env.BRAIN_DB.prepare(
    "SELECT request_id,status,version,updated_at FROM scotty_phase1_agent_profile_reviews_v1 WHERE agent_id=? AND owner_id=? ORDER BY updated_at DESC,request_id DESC LIMIT 10"
  ).bind(agentId,ownerId).all())?.results||[];
  const head=await env.BRAIN_DB.prepare(
    'SELECT head_version,approved_request_id FROM scotty_phase1_agent_profile_heads_v1 WHERE agent_id=? LIMIT 1'
  ).bind(agentId).first();
  const entries=rows.map(x=>({
   requestId:x.request_id,
   status:x.status,
   revision:x.version,
   updatedAt:x.updated_at,
   currentlyReviewedDraft:x.status==='approved'&&x.request_id===head?.approved_request_id,
   entireBrainCertified:false,
   activeRuntimePromptChanged:false
  }));
  return {connected:true,state:'REVIEW_METADATA_ONLY',
   entries,currentReviewId:entries.find(x=>x.currentlyReviewedDraft)?.requestId||null,
   headVersion:rows.length?(head?.head_version??0):null,
   historyMayBeTruncated:rows.length===10};
 }catch{
  return {connected:false,state:'REVIEW_LEDGER_UNAVAILABLE',
   entries:[],currentReviewId:null};
 }
}

export async function handlePhase1Workbench(request,env,url=new URL(request.url),ownerAuthenticated=false){
 if(!isPhase1WorkbenchPath(url.pathname))
  return reply({error:'NOT_FOUND',canExecute:false},404);
 if(ownerAuthenticated!==true)
  return reply({error:'OWNER_AUTH_REQUIRED',canExecute:false},401);
 if(request.method!=='GET')
  return reply({error:'READ_ONLY_ENDPOINT',canExecute:false},405);
 if(!url.search){
  const report=phase1ReadinessReport();
  return reply({
   status:'PHASE1_DEVELOPMENT_REVIEW_WORKBENCH',
   count:report.counts,
   agents:report.profiles.map(x=>({
    id:x.agentId,name:x.name,role:x.role,department:x.department,
    reviewerId:x.canonicalChiefId,
    ownerRecordStatus:x.ownerRecordStatus,
    structuralPassed:x.structuralPassed,
    certificationStatus:x.certificationStatus,
    nextAction:x.nextAction
   })),
   realModelEvaluationsCompleted:0,
   caseScenariosPrepared:report.counts.evaluationCasesPrepared,
   allProfilesCertified:false,
   pendingOwnerAcceptance:185,
   optionalCreativeDepartmentIncluded:false,
   canExecute:false,modelCalls:0,toolGrants:0,memoryWrites:0,
   note:'Structural specs are not verified independent agents. No action or certification is available here.'
  });
 }
 const params=[...url.searchParams.entries()];
 if(params.length!==1||params[0][0]!=='agentId'||
    !ids.test(params[0][1]||''))
  return reply({error:'INVALID_AGENT_QUERY',canExecute:false},400);
 const agentId=params[0][1];
 let brain,review,evaluation;
 try{
  brain=agentBrain(agentId);
  review=phase1AgentReview(agentId);
  evaluation=agentEvaluationPlan(agentId);
 }catch{return reply({error:'UNKNOWN_CANONICAL_AGENT',canExecute:false},404);}
 const history=await ownerReviewHistory(env,agentId);
 return reply({
  status:'DEVELOPMENT_BRAIN_PREVIEW',
  agentId,brainVersion:brain.schemaVersion,
  name:brain.name,role:brain.role,department:brain.department,
  reportsTo:brain.chiefId,focus:brain.focus,
  persona:brain.persona,
  reasoningInstructions:brain.reasoningInstructions,
  method:brain.workingMethod,
  responsibilities:brain.individualRoleContract?.responsibility||null,
  artifacts:brain.individualRoleContract?.artifact||null,
  knowledgeStatus:brain.authoredKnowledgeStatus,
  limitations:brain.limitations,
  communication:brain.communication,
  completionStandards:brain.completionStandards,
  suggestedTools:brain.suggestedTools.map(t=>({
    category:t.category,qualifiedForSuggestion:t.qualifiedForSuggestion,granted:false
  })),
  ownerDesignSource:brain.ownerDesign?.provenance.selectionRecord||null,
  ownerCompiledAcceptance:false,
  reviewStatus:review.certificationStatus,
  reviewHistory:history,
  evaluation:{
    planVersion:evaluation.version,maximumAcrossCases:evaluation.maximumAcrossCases,
    cases:evaluation.behaviorCases.map(c=>({
      id:c.id,type:c.type,prompt:c.prompt,required:c.required,
      graded:false,executedByThisEndpoint:false
    })),
    rubric:evaluation.rubric,
    modelResultsRecorded:0,certificationStatus:'NOT_EVALUATED'
  },
  privateMemoryExposed:false,ownerReviewDecisionAvailable:false,
  activeProfileRevision:null,modelCalls:0,toolGrants:0,
  canExecute:false,canCertify:false
 });
}
