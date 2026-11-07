import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {proposeAgentProfileRevision} from './agent-brain-revisions.mjs';
import {createPhase1ProfileReview,decidePhase1ProfileReview} from './phase1-profile-review-store.mjs';
import {agentEvaluationPlan} from './phase1-behavior-evaluation.mjs';
import {createPhase1EvaluationIngestor} from './phase1-evidence-ingestion.mjs';
import {inspectPhase1Candidate} from './phase1-candidate-preflight.mjs';
import {agentBrain} from './individual-agent-brains.mjs';

const schema=fs.readFileSync(new URL('./phase1-profile-review-ledger-v1.sql',import.meta.url),'utf8');
const evidenceSchema=fs.readFileSync(new URL('./phase1-evaluation-evidence-v1.sql',import.meta.url),'utf8');
const agentId='agent-geordi-02',ownerId='owner-demo-0001',
 requestId='review-evidence-1001',sessionId='session-evidence-1001';
const now=new Date('2026-11-07T18:00:00.000Z');
const actor={authenticated:true,verifiedByScotty:true,role:'owner',
 provenance:'scotty-server-side-session',ownerId,allowedAgentIds:[agentId]};
const refs={agentId,requestId,sessionId,sessionHandle:'trusted-owner-session-001',
 providerReceiptRef:'provider-receipt-001',graderReviewRef:'grader-review-001',
 ownerAcceptanceRef:'acceptance-001'};
const hash=async str=>{
 const h=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)));
 return [...h].map(x=>x.toString(16).padStart(2,'0')).join('');
};
function database({migrated=true}={}){
 const native=new DatabaseSync(':memory:');
 native.exec('PRAGMA foreign_keys=ON');
 native.exec(schema);
 if(migrated)native.exec(evidenceSchema);
 const db={
  prepare(sql){const st=native.prepare(sql);return {
   bind(...args){return {
    first:async()=>st.get(...args)||null,
    all:async()=>({results:st.all(...args)}),
    run:async()=>({meta:{changes:Number(st.run(...args).changes)}})
   };},
   all:async()=>({results:st.all()})};
  },
  async batch(cmds){
   native.exec('BEGIN IMMEDIATE');
   try{
    const res=[];for(const c of cmds)res.push(await c.run());
    native.exec('COMMIT');return res;
   }catch(e){native.exec('ROLLBACK');throw e;}
  }
 };
 return {db,native,close:()=>native.close()};
}
async function approved(db){
 const proposal=await proposeAgentProfileRevision({
  agentId,requestId,
  patch:{voice:'Thoughtful, practical and attentive to inclusive frontend engineering.'}
 });
 await createPhase1ProfileReview(db,{
  actor,proposal,expectedHeadVersion:0,
  idempotencyKey:'review-evidence-key-001',
  expiresAt:'2026-11-07T19:00:00.000Z',
  classification:'public-or-synthetic',containsPrivateData:false,now
 });
 await decidePhase1ProfileReview(db,{
  actor,requestId,changeDigest:proposal.changeDigest,
  expectedVersion:1,decision:'approved',confirmed:true,now
 });
 return proposal;
}
function fakeAuthorities({
 session=actor,providerChange={},graderChange={},acceptanceChange={},
 onProvider=null
}={}){
 const stats={session:0,provider:0,grader:0,acceptance:0};
 return {
  stats,
  sessionAuthority:{async resolve(){stats.session++;return session;}},
  providerAuthority:{async verify(req){
   stats.provider++;
   if(onProvider)await onProvider();
   const plan=agentEvaluationPlan(agentId);
   const cases=[];
   for(let i=0;i<plan.behaviorCases.length;i++){
    const p=plan.behaviorCases[i];
    cases.push({
     type:p.type,scenarioRef:p.id,
     promptDigest:await hash(p.prompt),
     responseDigest:('a'.repeat(63))+i,
     traceRef:'provider-case-'+i
    });
   }
   return {
    verified:true,provenance:'scotty-protected-model-provider',
    agentId,requestId,sessionId,receiptRef:req.receiptRef,
    providerId:'cloudflare-workers-ai',model:'synthetic-isolated-model',
    traceRef:'provider-root-trace-001',cases,...providerChange
   };
  }},
  graderAuthority:{async verify(req){
   stats.grader++;
   const cases=req.providerCases.map(c=>({
    ...c,reviewerId:'grader-independent-001',
    role_fit:4,accuracy:4,deliverable:4,boundaries:4,communication:4,
    safetyViolation:0
   }));
   return {verified:true,provenance:'scotty-independent-reviewer',
    agentId,requestId,sessionId,reviewRef:req.reviewRef,
    reviewerId:'grader-independent-001',cases,...graderChange};
  }},
  acceptanceAuthority:{async verify(req){
   stats.acceptance++;
   return {verified:true,provenance:'scotty-protected-owner-acceptance',
    ownerId,agentId,requestId,sessionId,
    acceptanceRef:req.acceptanceRef,
    providerReceiptRef:req.providerReceiptRef,
    graderReviewRef:req.graderReviewRef,
    reviewDigest:req.reviewDigest,
    explicitlyAccepted:true,...acceptanceChange};
  }}
 };
}
const create=(db,trust,mode=true)=>
 createPhase1EvaluationIngestor({db,...trust,clock:()=>now,testMode:mode});

test('all three protected authorities are required to construct the ingestor',()=>{
 const x=database();
 try{
  assert.throws(()=>createPhase1EvaluationIngestor({db:x.db}),/TRUSTED_INGEST_DEPENDENCIES_REQUIRED/);
  assert.throws(()=>createPhase1EvaluationIngestor({...fakeAuthorities(),db:null}),/TRUSTED_INGEST_DEPENDENCIES_REQUIRED/);
 }finally{x.close();}
});
test('verified synthetic fixture is stored atomically as synthetic and can never qualify for real-model certification',async()=>{
 const x=database();
 try{
  await approved(x.db);
  const trust=fakeAuthorities();
  const handler=create(x.db,trust);
  const written=await handler.ingest(refs);
  assert.equal(written.status,'SYNTHETIC_TEST_EVIDENCE_RECORDED');
  assert.equal(written.caseCount,3);
  assert.equal(written.evidenceOrigin,'synthetic-fixture');
  assert.equal(written.immutableReadbackVerified,true);
  assert.equal(written.realModelCertified,false);
  assert.equal(written.activeProfileChanged,false);
  assert.equal(written.canExecute,false);
  assert.equal(written.modelCalls,0);
  assert.equal(trust.stats.provider,1);
  assert.equal(trust.stats.grader,1);
  assert.equal(trust.stats.acceptance,1);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_sessions_v1').get().n,1);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_case_results_v1').get().n,3);
  assert.equal(x.native.prepare('SELECT evidence_origin AS origin FROM scotty_phase1_eval_sessions_v1').get().origin,'synthetic-fixture');
  assert.notEqual(agentBrain(agentId).persona.voice,'Thoughtful, practical and attentive to inclusive frontend engineering.');
  const candidate=await inspectPhase1Candidate({
   db:x.db,actor,agentId,requestId,sessionId,
   attestor:{provenance:'scotty-server-evidence-verifier',
    async verify(){throw Error('Should never call independent verifier for synthetic fixture');}},
   now
  });
  assert.equal(candidate.status,'SYNTHETIC_EVIDENCE_NOT_CERTIFIABLE');
  assert.equal(candidate.eligibleForCandidate,false);
 }finally{x.close();}
});
test('exact replay preserves immutable rows and never duplicates records',async()=>{
 const x=database();
 try{
  await approved(x.db);
  const trust=fakeAuthorities();
  const handler=create(x.db,trust);
  await handler.ingest(refs);
  const retry=await handler.ingest(refs);
  assert.equal(retry.status,'EVIDENCE_ALREADY_RECORDED');
  assert.equal(retry.replayed,true);
  assert.equal(retry.realModelCertified,false);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_sessions_v1').get().n,1);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_case_results_v1').get().n,3);
 }finally{x.close();}
});
test('wrong owner or missing migration denies before provider or grader',async()=>{
 for(const variant of [
  {session:{...actor,verifiedByScotty:false}},
  {session:{...actor,provenance:'client-supplied-json'}},
  {session:{...actor,allowedAgentIds:[]}},
  {session:{...actor,role:'worker'}}
 ]){
  const x=database();
  try{
   await approved(x.db);
   const trust=fakeAuthorities(variant);
   await assert.rejects(()=>create(x.db,trust).ingest(refs),/VERIFIED_OWNER_SESSION_REQUIRED/);
   assert.equal(trust.stats.provider,0);
   assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_sessions_v1').get().n,0);
  }finally{x.close();}
 }
 const x=database({migrated:false});
 try{
  await approved(x.db);
  const trust=fakeAuthorities();
  await assert.rejects(()=>create(x.db,trust).ingest(refs),/EVALUATION_D1_MIGRATION_REQUIRED/);
  assert.equal(trust.stats.provider,0);
 }finally{x.close();}
});
test('provider forged scenario digest or mismatched agent cannot be ingested',async()=>{
 for(const change of [
  {agentId:'agent-other'},
  {cases:[{type:'COMMON',promptDigest:'b'.repeat(64)}]},
  {verified:false},
  {provenance:'activepieces-json'}
 ]){
  const x=database();
  try{
   await approved(x.db);
   const trust=fakeAuthorities({providerChange:change});
   await assert.rejects(()=>create(x.db,trust).ingest(refs),/PROVIDER_ATTESTATION_INVALID|PROVIDER_CASE_PROVENANCE_MISMATCH/);
   assert.equal(trust.stats.grader,0);
   assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_sessions_v1').get().n,0);
  }finally{x.close();}
 }
});
test('independent grader and owner acceptance must match exact references',async()=>{
 for(const option of [
  {graderChange:{reviewerId:ownerId}},
  {graderChange:{verified:false}},
  {acceptanceChange:{explicitlyAccepted:false}},
  {acceptanceChange:{reviewDigest:'c'.repeat(64)}},
  {acceptanceChange:{providerReceiptRef:'other-receipt-001'}}
 ]){
  const x=database();
  try{
   await approved(x.db);
   const trust=fakeAuthorities(option);
   await assert.rejects(()=>create(x.db,trust).ingest(refs),/INDEPENDENT_GRADING_ATTESTATION_INVALID|INDEPENDENT_OWNER_ACCEPTANCE_REQUIRED/);
   assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_sessions_v1').get().n,0);
  }finally{x.close();}
 }
});
test('revocation during provider verification denies ingestion before any metadata write',async()=>{
 const x=database();
 try{
  const proposal=await approved(x.db);
  const trust=fakeAuthorities({onProvider:async()=>{
   await decidePhase1ProfileReview(x.db,{
    actor,requestId,changeDigest:proposal.changeDigest,
    expectedVersion:2,decision:'revoked',confirmed:true,now
   });
  }});
  await assert.rejects(()=>create(x.db,trust).ingest(refs),/CURRENT_APPROVED_PROFILE_REVIEW_REQUIRED/);
  assert.equal(trust.stats.provider,1);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_sessions_v1').get().n,0);
 }finally{x.close();}
});
test('immutable persisted evidence cannot be rewritten in place',async()=>{
 const x=database();
 try{
  await approved(x.db);
  await create(x.db,fakeAuthorities()).ingest(refs);
  assert.throws(()=>x.native.prepare(
   "UPDATE scotty_phase1_eval_case_results_v1 SET accuracy=0"
  ).run(),/PHASE1_EVAL_EVIDENCE_IMMUTABLE/);
  assert.throws(()=>x.native.prepare(
   'DELETE FROM scotty_phase1_eval_sessions_v1'
  ).run(),/PHASE1_EVAL_EVIDENCE_IMMUTABLE/);
 }finally{x.close();}
});


test('non-synthetic ingestion additionally requires an independently injected runtime authority',async()=>{
 const x=database();
 try{
  await approved(x.db);
  const trust=fakeAuthorities();
  assert.throws(()=>createPhase1EvaluationIngestor({
   db:x.db,...trust,clock:()=>now,testMode:false
  }),/REAL_EVIDENCE_INGEST_RUNTIME_AUTHORITY_REQUIRED/);
  const denied=createPhase1EvaluationIngestor({
   db:x.db,...trust,clock:()=>now,testMode:false,
   runtimeAuthority:{async authorize(){return {verified:false};}}
  });
  await assert.rejects(()=>denied.ingest(refs),/REAL_EVIDENCE_INGEST_RUNTIME_NOT_APPROVED/);
  assert.equal(trust.stats.provider,0);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_eval_sessions_v1').get().n,0);
 }finally{x.close();}
});
