/**
 * SOURCE ONLY — Phase 1 evidence ingestion into optional isolated D1 tables.
 *
 * This is NOT an HTTP endpoint. All authority functions MUST be injected from
 * a protected SCOTTY server; an Activepieces/client JSON document can never
 * supply these verifiers. Never fetch private data, send messages, run models,
 * publish assets, update active brains, grant tools or charge an account.
 *
 * Verifies references via independent provider, reviewer and owner-acceptance
 * services BEFORE storing immutable metadata. The mocked services in tests are
 * not evidence of a real model run and never certify an agent.
 */
import {agentEvaluationPlan,EVALUATION_PLAN_VERSION} from './phase1-behavior-evaluation.mjs';
import {BRAIN_SPEC_VERSION} from './individual-agent-brains.mjs';
import {readPhase1ProfileReview} from './phase1-profile-review-store.mjs';
import {phase1EvaluationEvidenceReadiness} from './phase1-candidate-preflight.mjs';

export const PHASE1_EVIDENCE_INGEST_VERSION='scotty-phase1-evidence-ingest-v1';
const ident=/^[a-z0-9][a-z0-9_-]{3,99}$/i;
const sha=/^[a-f0-9]{64}$/;
const kinds=['COMMON','SPECIALTY','ADVERSARIAL'];
const scoreKeys=['role_fit','accuracy','deliverable','boundaries','communication'];
const die=s=>{throw Error(s);};
const date=s=>new Date(s);
async function digest(s){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function ensureRefs(values){
 if(values.some(x=>!ident.test(x||'')))die('INVALID_EVALUATION_REFERENCE');
}
const cols='session_id,review_request_id,agent_id,owner_id,brain_spec_version,evaluation_plan_version,model_provider,model_name,provider_trace_ref,grader_id,evidence_origin,owner_acceptance_ref,created_at,expires_at';
const caseCols='case_id,session_id,scenario_type,scenario_ref,prompt_digest,response_digest,trace_ref,grader_ref,role_fit,accuracy,deliverable,boundaries,communication,safety_violation,reviewed_at';

export function createPhase1EvaluationIngestor({
 db,sessionAuthority,providerAuthority,graderAuthority,acceptanceAuthority,
 runtimeAuthority=null,clock=()=>new Date(),testMode=false
}={}){
 if(typeof db?.prepare!=='function'||typeof db?.batch!=='function'||
    typeof sessionAuthority?.resolve!=='function'||
    typeof providerAuthority?.verify!=='function'||
    typeof graderAuthority?.verify!=='function'||
    typeof acceptanceAuthority?.verify!=='function')
   die('TRUSTED_INGEST_DEPENDENCIES_REQUIRED');
 // Test mode is allowed ONLY for completely isolated fake-provider fixtures.
 // The service must not accept testMode from client inputs.
 if(typeof testMode!=='boolean')die('INVALID_INGEST_CONFIGURATION');
 if(!testMode&&typeof runtimeAuthority?.authorize!=='function')
   die('REAL_EVIDENCE_INGEST_RUNTIME_AUTHORITY_REQUIRED');
 const verifyOwner=async(sessionHandle,agentId)=>{
   const actor=await sessionAuthority.resolve({sessionHandle,requiredRole:'owner'});
   if(actor?.authenticated!==true||actor?.verifiedByScotty!==true||
      actor?.provenance!=='scotty-server-side-session'||
      actor?.role!=='owner'||!ident.test(actor.ownerId||'')||
      !Array.isArray(actor.allowedAgentIds)||
      !actor.allowedAgentIds.includes(agentId))
     die('VERIFIED_OWNER_SESSION_REQUIRED');
   return actor;
 };
 const validReview=async(actor,agentId,requestId)=>{
   const r=await readPhase1ProfileReview(db,{actor,requestId});
   if(r.agentId!==agentId||r.reviewStatus!=='approved'||
      r.currentApprovedRequestId!==requestId||
      r.currentHeadVersion!==r.expectedHeadVersion+1||
      r.auditVerified!==true)
     die('CURRENT_APPROVED_PROFILE_REVIEW_REQUIRED');
   return r;
 };
 const verifyStored=async(row,expected)=>{
  if(!row||Object.keys(expected).filter(k=>k!=='_cases').some(k=>row[k]!==expected[k]))
    die('EVIDENCE_IDEMPOTENCY_CONFLICT');
  const all=(await db.prepare('SELECT '+caseCols+
    ' FROM scotty_phase1_eval_case_results_v1 WHERE session_id=? LIMIT 4')
   .bind(expected.session_id).all())?.results||[];
  if(all.length!==3)die('EVIDENCE_INCOMPLETE_OR_REPLAY_CONFLICT');
  const ids=new Set();
  for(const c of all){
   const match=expected._cases.find(x=>x.case_id===c.case_id);
   if(!match||ids.has(c.scenario_type)||
      Object.entries(match).some(([k,v])=>c[k]!==v))
     die('EVIDENCE_CASE_REPLAY_CONFLICT');
   ids.add(c.scenario_type);
  }
  return true;
 };
 return Object.freeze({
  version:PHASE1_EVIDENCE_INGEST_VERSION,
  async ingest({
   sessionHandle,agentId,requestId,sessionId,
   providerReceiptRef,graderReviewRef,ownerAcceptanceRef
  }={}){
   ensureRefs([agentId,requestId,sessionId,providerReceiptRef,graderReviewRef,ownerAcceptanceRef]);
   const now=clock();
   if(!(now instanceof Date)||!Number.isFinite(now.getTime()))
     die('INVALID_SERVER_CLOCK');
   const actor=await verifyOwner(sessionHandle,agentId);
   if(!testMode){
     const permit=await runtimeAuthority.authorize({
       ownerId:actor.ownerId,agentId,requestId,sessionId,
       purpose:'phase1.real-evidence-ingest'
     });
     if(permit?.verified!==true||
        permit.provenance!=='scotty-server-runtime-authority'||
        permit.ownerId!==actor.ownerId||permit.agentId!==agentId||
        permit.requestId!==requestId||permit.sessionId!==sessionId||
        permit.purpose!=='phase1.real-evidence-ingest')
       die('REAL_EVIDENCE_INGEST_RUNTIME_NOT_APPROVED');
   }
   const readiness=await phase1EvaluationEvidenceReadiness(db);
   if(!readiness.ready)die(readiness.reason);
   const review=await validReview(actor,agentId,requestId);
   const plan=agentEvaluationPlan(agentId);
   const provider=await providerAuthority.verify({
    receiptRef:providerReceiptRef,agentId,requestId,sessionId,
    brainVersion:BRAIN_SPEC_VERSION,planVersion:EVALUATION_PLAN_VERSION,
    expectedScenarios:plan.behaviorCases.map(x=>({type:x.type,id:x.id,prompt:x.prompt}))
   });
   if(provider?.verified!==true||
      provider.provenance!=='scotty-protected-model-provider'||
      provider.agentId!==agentId||provider.requestId!==requestId||
      provider.sessionId!==sessionId||
      provider.receiptRef!==providerReceiptRef||
      !ident.test(provider.providerId||'')||
      !ident.test(provider.traceRef||'')||
      typeof provider.model!=='string'||provider.model.length<3||
      provider.model.length>160||!Array.isArray(provider.cases)||
      provider.cases.length!==3)
     die('PROVIDER_ATTESTATION_INVALID');
   const providerCases=new Map();
   for(const expected of plan.behaviorCases){
    const match=provider.cases.filter(x=>x.type===expected.type);
    if(match.length!==1||match[0].scenarioRef!==expected.id||
       !ident.test(match[0].traceRef||'')||
       !sha.test(match[0].promptDigest||'')||
       !sha.test(match[0].responseDigest||'')||
       match[0].promptDigest!==await digest(expected.prompt))
      die('PROVIDER_CASE_PROVENANCE_MISMATCH');
    providerCases.set(expected.type,match[0]);
   }
   const grading=await graderAuthority.verify({
     reviewRef:graderReviewRef,providerReceiptRef,
     agentId,requestId,sessionId,
     providerCases:plan.behaviorCases.map(x=>({
       type:x.type,scenarioRef:x.id,
       promptDigest:providerCases.get(x.type).promptDigest,
       responseDigest:providerCases.get(x.type).responseDigest,
       traceRef:providerCases.get(x.type).traceRef
     }))
   });
   if(grading?.verified!==true||
      grading.provenance!=='scotty-independent-reviewer'||
      grading.agentId!==agentId||grading.requestId!==requestId||
      grading.sessionId!==sessionId||
      grading.reviewRef!==graderReviewRef||
      !ident.test(grading.reviewerId||'')||
      grading.reviewerId===actor.ownerId||
      !Array.isArray(grading.cases)||grading.cases.length!==3)
     die('INDEPENDENT_GRADING_ATTESTATION_INVALID');
   const gradeByType=new Map();
   for(const type of kinds){
    const matches=grading.cases.filter(x=>x.type===type);
    const g=matches[0],p=providerCases.get(type);
    if(matches.length!==1||g.scenarioRef!==p.scenarioRef||
       g.responseDigest!==p.responseDigest||
       g.traceRef!==p.traceRef||
       g.reviewerId!==grading.reviewerId||
       !scoreKeys.every(k=>Number.isInteger(g[k])&&g[k]>=0&&g[k]<=4)||
       ![0,1].includes(g.safetyViolation))
      die('GRADING_CASE_BINDING_INVALID');
    gradeByType.set(type,g);
   }
   const approval=await acceptanceAuthority.verify({
     acceptanceRef:ownerAcceptanceRef,ownerId:actor.ownerId,
     agentId,requestId,sessionId,
     reviewDigest:review.changeDigest,
     providerReceiptRef,graderReviewRef
   });
   if(approval?.verified!==true||
      approval.provenance!=='scotty-protected-owner-acceptance'||
      approval.ownerId!==actor.ownerId||
      approval.agentId!==agentId||approval.requestId!==requestId||
      approval.sessionId!==sessionId||
      approval.acceptanceRef!==ownerAcceptanceRef||
      approval.providerReceiptRef!==providerReceiptRef||
      approval.graderReviewRef!==graderReviewRef||
      approval.reviewDigest!==review.changeDigest||
      approval.explicitlyAccepted!==true)
     die('INDEPENDENT_OWNER_ACCEPTANCE_REQUIRED');
   // Re-read the owner-review head after all external verification calls.
   await validReview(actor,agentId,requestId);
   const createdAt=now.toISOString();
   const expiresAt=new Date(now.getTime()+7*86400000).toISOString();
   const record={
     session_id:sessionId,review_request_id:requestId,agent_id:agentId,
     owner_id:actor.ownerId,brain_spec_version:BRAIN_SPEC_VERSION,
     evaluation_plan_version:EVALUATION_PLAN_VERSION,
     model_provider:provider.providerId,model_name:provider.model,
     provider_trace_ref:provider.traceRef,grader_id:grading.reviewerId,
     evidence_origin:testMode?'synthetic-fixture':'server-verified-model',
     owner_acceptance_ref:ownerAcceptanceRef,
     created_at:createdAt,expires_at:expiresAt
   };
   const inserts=plan.behaviorCases.map((scenario,i)=>{
     const p=providerCases.get(scenario.type),g=gradeByType.get(scenario.type);
     return {
       case_id:sessionId+'-case-'+i,
       session_id:sessionId,scenario_type:scenario.type,
       scenario_ref:scenario.id,prompt_digest:p.promptDigest,
       response_digest:p.responseDigest,trace_ref:p.traceRef,
       grader_ref:grading.reviewerId,
       ...Object.fromEntries(scoreKeys.map(k=>[k,g[k]])),
       safety_violation:g.safetyViolation,reviewed_at:createdAt
     };
   });
   const existing=await db.prepare('SELECT '+cols+
     ' FROM scotty_phase1_eval_sessions_v1 WHERE session_id=? LIMIT 1'
   ).bind(sessionId).first();
   if(existing){
     // Time fields come from the ORIGINAL record for exact idempotent retry.
     const comparable={...record,created_at:existing.created_at,expires_at:existing.expires_at};
     await verifyStored(existing,{...comparable,_cases:inserts.map(x=>({
       ...x,reviewed_at:existing.created_at
     }))});
     return {status:'EVIDENCE_ALREADY_RECORDED',
       agentId,requestId,sessionId,replayed:true,
       evidenceOrigin:existing.evidence_origin,
       realModelCertified:false,activeProfileChanged:false,
       canExecute:false,modelCalls:0,memoryWrites:0};
   }
   const sqlSession='INSERT INTO scotty_phase1_eval_sessions_v1('+cols+
     ') VALUES('+cols.split(',').map(()=>'?').join(',')+')';
   const sqlCase='INSERT INTO scotty_phase1_eval_case_results_v1('+caseCols+
     ') VALUES('+caseCols.split(',').map(()=>'?').join(',')+')';
   const statement=db.prepare(sqlSession).bind(...cols.split(',').map(k=>record[k]));
   const commands=[statement,...inserts.map(item=>
     db.prepare(sqlCase).bind(...caseCols.split(',').map(k=>item[k]))
   )];
   let result;
   try{result=await db.batch(commands);}
   catch{die('EVIDENCE_ATOMIC_WRITE_FAILED');}
   if(result?.length!==4||
      result.some(x=>Number(x?.meta?.changes??x?.changes??0)!==1))
     die('EVIDENCE_WRITE_UNVERIFIED');
   const saved=await db.prepare('SELECT '+cols+
     ' FROM scotty_phase1_eval_sessions_v1 WHERE session_id=? LIMIT 1'
   ).bind(sessionId).first();
   await verifyStored(saved,{...record,_cases:inserts});
   return {
     status:testMode?'SYNTHETIC_TEST_EVIDENCE_RECORDED':'EVIDENCE_METADATA_RECORDED_PENDING_INDEPENDENT_PREFLIGHT',
     agentId,requestId,sessionId,
     caseCount:3,evidenceOrigin:record.evidence_origin,
     immutableReadbackVerified:true,
     scoringAuthorityNotOwnedByAgent:true,
     activeProfileChanged:false,realModelCertified:false,
     canExecute:false,modelCalls:0,memoryWrites:0,toolGrants:0
   };
  }
 });
}
