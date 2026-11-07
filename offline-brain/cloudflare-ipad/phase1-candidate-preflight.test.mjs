import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {proposeAgentProfileRevision} from './agent-brain-revisions.mjs';
import {createPhase1ProfileReview,decidePhase1ProfileReview} from './phase1-profile-review-store.mjs';
import {agentEvaluationPlan} from './phase1-behavior-evaluation.mjs';
import {agentBrain} from './individual-agent-brains.mjs';
import {phase1EvaluationEvidenceReadiness,inspectPhase1Candidate} from './phase1-candidate-preflight.mjs';

const base=fs.readFileSync(new URL('./phase1-profile-review-ledger-v1.sql',import.meta.url),'utf8');
const evidence=fs.readFileSync(new URL('./phase1-evaluation-evidence-v1.sql',import.meta.url),'utf8');
const now=new Date('2026-11-07T18:00:00.000Z');
const agentId='agent-geordi-02',requestId='profile-review-geordi-1001';
const sessionId='eval-geordi-1001';
const ownerId='owner-test-0001';
const actor={authenticated:true,verifiedByScotty:true,
 provenance:'scotty-server-side-session',role:'owner',ownerId,allowedAgentIds:[agentId]};
function fixture({withEvidence=true}={}){
 const native=new DatabaseSync(':memory:');
 native.exec('PRAGMA foreign_keys=ON');
 native.exec(base);
 if(withEvidence)native.exec(evidence);
 const db={
  prepare(sql){
   const stmt=native.prepare(sql);
   return {bind(...args){return {
    first:async()=>stmt.get(...args)||null,
    all:async()=>({results:stmt.all(...args)}),
    run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})
   };},all:async()=>({results:stmt.all()})};
  },
  async batch(steps){
   native.exec('BEGIN IMMEDIATE');
   try{const results=[];for(const x of steps)results.push(await x.run());native.exec('COMMIT');return results;}
   catch(e){native.exec('ROLLBACK');throw e;}
  }
 };
 return {native,db,close:()=>native.close()};
}
const digest=async text=>{
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
};
async function reviewed(db){
 const proposal=await proposeAgentProfileRevision({
  agentId,requestId,patch:{voice:'Precise and considerate when reviewing accessible website behavior.'}
 });
 await createPhase1ProfileReview(db,{
  actor,proposal,expectedHeadVersion:0,idempotencyKey:'brain-review-geordi-1001',
  expiresAt:'2026-11-07T19:00:00.000Z',
  classification:'public-or-synthetic',containsPrivateData:false,now
 });
 await decidePhase1ProfileReview(db,{
  actor,requestId,changeDigest:proposal.changeDigest,
  expectedVersion:1,decision:'approved',confirmed:true,now
 });
 return proposal;
}
async function seed(native,{origin='server-verified-model',scores=[20,20,20],
 acceptance='owner-acceptance-1001',cases=true}={}){
 native.prepare(
  'INSERT INTO scotty_phase1_eval_sessions_v1(session_id,review_request_id,agent_id,owner_id,brain_spec_version,evaluation_plan_version,model_provider,model_name,provider_trace_ref,grader_id,evidence_origin,owner_acceptance_ref,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
 ).run(sessionId,requestId,agentId,ownerId,'scotty-individual-brains-v1','scotty-phase1-evaluation-v1',
   'workers-ai','isolated-test-model','provider-trace-1001','independent-reviewer-01',
   origin,acceptance,'2026-11-07T17:00:00.000Z','2026-11-08T17:00:00.000Z');
 if(!cases)return;
 const plan=agentEvaluationPlan(agentId);
 const sql='INSERT INTO scotty_phase1_eval_case_results_v1(case_id,session_id,scenario_type,scenario_ref,prompt_digest,response_digest,trace_ref,grader_ref,role_fit,accuracy,deliverable,boundaries,communication,safety_violation,reviewed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
 for(let i=0;i<3;i++){
  const c=plan.behaviorCases[i],points=scores[i],values=points===20?
    [4,4,4,4,4]:points===16?[3,3,3,4,3]:points===15?[3,3,3,3,3]:[0,0,0,0,0];
  native.prepare(sql).run('evaluation-case-'+i+'-1001',sessionId,c.type,c.id,
   await digest(c.prompt),('a'.repeat(63))+i,
   'provider-case-trace-'+i,'independent-reviewer-01',
   ...values,0,'2026-11-07T17:15:00.000Z');
 }
}
function verifier({verified=true,independent=true,provider=true,acceptance=true}={}){
 let count=0;
 return {provenance:'scotty-server-evidence-verifier',get calls(){return count;},
  async verify(request){
   count++;
   return {verified,provenance:'scotty-server-evidence-verifier',
    agentId:request.agentId,sessionId:request.sessionId,
    reviewRequestId:request.requestId,
    ownerAcceptanceVerified:acceptance,
    independentGraderVerified:independent,providerRunVerified:provider};
  }
 };
}
const args=(db,attestor)=>({db,actor,agentId,requestId,sessionId,attestor,now});
test('missing evaluation migration or absent verifier always denies preflight',async()=>{
 const x=fixture({withEvidence:false});
 try{
  const state=await phase1EvaluationEvidenceReadiness(x.db);
  assert.equal(state.ready,false);assert.equal(state.canActivate,false);
  await assert.rejects(()=>inspectPhase1Candidate(args(x.db,verifier())),/EVALUATION_D1_MIGRATION_REQUIRED/);
 }finally{x.close();}
 const y=fixture();
 try{
  assert.equal((await phase1EvaluationEvidenceReadiness(y.db)).ready,true);
  await assert.rejects(()=>inspectPhase1Candidate(args(y.db,null)),/INDEPENDENT_SERVER_ATTESTOR_REQUIRED/);
 }finally{y.close();}
});
test('three independently attested synthetic-test-provider fixtures produce candidate preview only, never certification',async()=>{
 const x=fixture();
 try{
  const proposal=await reviewed(x.db);
  await seed(x.native);
  const trust=verifier();
  const result=await inspectPhase1Candidate(args(x.db,trust));
  assert.equal(trust.calls,1);
  assert.equal(result.status,'READY_FOR_ISOLATED_CANDIDATE_REVIEW');
  assert.equal(result.eligibleForCandidate,true);
  assert.equal(result.score,60);
  assert.equal(result.profileReviewApproved,true);
  assert.equal(result.ownerAcceptanceVerified,true);
  assert.equal(result.behaviorEvaluationVerified,true);
  assert.equal(result.runtimePromptActivated,false);
  assert.equal(result.modelBehaviorCertified,false);
  assert.equal(result.canExecute,false);
  assert.equal(result.toolsGranted,0);
  assert.equal(result.modelCallsMadeByPreflight,0);
  assert.equal(result.candidate.activeProfileChanged,false);
  assert.equal(result.candidate.intendedState,'UNPUBLISHED_CANDIDATE_ONLY');
  assert.equal(result.approvedReviewDigest,proposal.changeDigest);
  assert.notEqual(agentBrain(agentId).persona.voice,proposal.patch.voice);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_case_results_v1').get().n,3);
 }finally{x.close();}
});
test('synthetic-fixture evidence cannot pass candidate gate even with spoofed high scores',async()=>{
 const x=fixture();
 try{
  await reviewed(x.db);await seed(x.native,{origin:'synthetic-fixture'});
  const trust=verifier();
  const result=await inspectPhase1Candidate(args(x.db,trust));
  assert.equal(result.status,'SYNTHETIC_EVIDENCE_NOT_CERTIFIABLE');
  assert.equal(result.eligibleForCandidate,false);
  assert.equal(trust.calls,0);
 }finally{x.close();}
});
test('incomplete, failed or low-scoring cases never yield eligible candidates',async()=>{
 for(const scores of [[15,20,20],[16,16,16]]){
  const x=fixture();
  try{
   await reviewed(x.db);await seed(x.native,{scores});
   const result=await inspectPhase1Candidate(args(x.db,verifier()));
   assert.equal(result.status,'BEHAVIOR_THRESHOLD_NOT_MET');
   assert.equal(result.eligibleForCandidate,false);
   assert.equal(result.canExecute,false);
   assert.equal(result.score,scores.reduce((a,b)=>a+b,0));
  }finally{x.close();}
 }
 const y=fixture();
 try{
  await reviewed(y.db);await seed(y.native,{cases:false});
  await assert.rejects(()=>inspectPhase1Candidate(args(y.db,verifier())),/THREE_UNIQUE_EVALUATION_CASES_REQUIRED/);
 }finally{y.close();}
});
test('provider, independent grader or owner acceptance attestations cannot be waived',async()=>{
 for(const change of [
  {verified:false},{independent:false},{provider:false},{acceptance:false}
 ]){
  const x=fixture();
  try{
   await reviewed(x.db);await seed(x.native);
   await assert.rejects(()=>inspectPhase1Candidate(args(x.db,verifier(change))),/INDEPENDENT_ATTESTATION_REJECTED/);
  }finally{x.close();}
 }
});
test('revocation invalidates existing evidence and prevents stale profile promotion',async()=>{
 const x=fixture();
 try{
  const proposal=await reviewed(x.db);await seed(x.native);
  await decidePhase1ProfileReview(x.db,{
   actor,requestId,changeDigest:proposal.changeDigest,expectedVersion:2,
   decision:'revoked',confirmed:true,now
  });
  const trust=verifier();
  await assert.rejects(()=>inspectPhase1Candidate(args(x.db,trust)),/CURRENT_APPROVED_REVIEW_REQUIRED/);
  assert.equal(trust.calls,0);
 }finally{x.close();}
});
test('cross-agent, owner spoof and tampered scenario hashes fail closed',async()=>{
 const x=fixture();
 try{
  await reviewed(x.db);await seed(x.native);
  await assert.rejects(()=>inspectPhase1Candidate({...args(x.db,verifier()),agentId:'chief-riker'}),/SERVER_VERIFIED_OWNER_REQUIRED|CURRENT_APPROVED_REVIEW_REQUIRED/);
  await assert.rejects(()=>inspectPhase1Candidate({...args(x.db,verifier()),
   actor:{...actor,provenance:'activepieces-json'}}),/SERVER_VERIFIED_OWNER_REQUIRED/);
  assert.throws(()=>x.native.prepare(
   'UPDATE scotty_phase1_eval_case_results_v1 SET prompt_digest=?'
  ).run('b'.repeat(64)),/PHASE1_EVAL_EVIDENCE_IMMUTABLE/);
 }finally{x.close();}
});
test('evidence metadata cannot be deleted or modified in place',async()=>{
 const x=fixture();
 try{
  await reviewed(x.db);await seed(x.native);
  assert.throws(()=>x.native.prepare('DELETE FROM scotty_phase1_eval_sessions_v1').run(),/PHASE1_EVAL_EVIDENCE_IMMUTABLE/);
  assert.throws(()=>x.native.prepare("UPDATE scotty_phase1_eval_case_results_v1 SET role_fit=0").run(),/PHASE1_EVAL_EVIDENCE_IMMUTABLE/);
 }finally{x.close();}
});
