import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.mjs';
import {proposeAgentProfileRevision} from './agent-brain-revisions.mjs';
import {createPhase1ProfileReview,decidePhase1ProfileReview} from './phase1-profile-review-store.mjs';
import {handlePhase1BrainReview,isPhase1BrainReviewPath} from './phase1-profile-review-api.mjs';

const token='owner-test-token-long-enough-12345678901234567890';
const date=new Date('2026-11-07T18:00:00.000Z');
const ownerId='owner-demo-0001';
const schema=fs.readFileSync(new URL('./phase1-profile-review-ledger-v1.sql',import.meta.url),'utf8');
const actor={
 authenticated:true,verifiedByScotty:true,
 provenance:'scotty-server-side-session',role:'owner',
 ownerId,allowedAgentIds:['agent-geordi-02']
};
function fixture(){
 const native=new DatabaseSync(':memory:');
 native.exec('PRAGMA foreign_keys=ON');
 native.exec(schema);
 const db={
  prepare(sql){
   const stmt=native.prepare(sql);
   return {
    bind(...params){return {
     first:async()=>stmt.get(...params)||null,
     all:async()=>({results:stmt.all(...params)}),
     run:async()=>({meta:{changes:Number(stmt.run(...params).changes)}})
    };},
    all:async()=>({results:stmt.all()})
   };
  },
  async batch(statements){
   native.exec('BEGIN IMMEDIATE');
   try{
    const result=[];
    for(const statement of statements)result.push(await statement.run());
    native.exec('COMMIT');return result;
   }catch(e){native.exec('ROLLBACK');throw e;}
  }
 };
 const env={
  OWNER_BEARER_TOKEN:token,BRAIN_DB:db,
  SCOTTY_PHASE1_REVIEW_READ_ENABLED:'true',
  SCOTTY_PHASE1_REVIEW_OWNER_ID:ownerId
 };
 return {native,db,env,close:()=>native.close()};
}
function req(path,secret=token,method='GET'){
 return new Request('https://isolated-scotty.invalid'+path,{
  method,headers:secret?{authorization:'Bearer '+secret}:{}
 });
}
async function approved(db){
 const proposal=await proposeAgentProfileRevision({
  agentId:'agent-geordi-02',requestId:'phase1-review-lab-0001',
  patch:{voice:'Detailed and supportive when explaining fictional frontend troubleshooting.'}
 });
 await createPhase1ProfileReview(db,{
  actor,proposal,expectedHeadVersion:0,
  idempotencyKey:'phase1-review-key-0001',
  expiresAt:'2026-11-07T19:00:00.000Z',
  classification:'public-or-synthetic',containsPrivateData:false,now:date
 });
 await decidePhase1ProfileReview(db,{
  actor,requestId:proposal.requestId,
  changeDigest:proposal.changeDigest,expectedVersion:1,
  decision:'approved',confirmed:true,now:date
 });
 return proposal;
}
test('phase1 review inspection route remains owner-authenticated and GET-only',async()=>{
 const x=fixture();
 try{
  assert.equal(isPhase1BrainReviewPath('/api/phase1/brain-review'),true);
  assert.equal(isPhase1BrainReviewPath('/api/phase1/brain-review-readiness'),true);
  assert.equal(isPhase1BrainReviewPath('/api/phase1/unknown'),false);
  assert.equal((await worker.fetch(req('/api/phase1/brain-review-readiness',null),x.env)).status,401);
  assert.equal((await worker.fetch(req('/api/phase1/brain-review-readiness','bad-owner-token-abcdefghijklmnopqrstuvwxyz'),x.env)).status,401);
  assert.equal((await handlePhase1BrainReview(req('/api/phase1/brain-review-readiness'),x.env)).status,401);
  assert.equal((await worker.fetch(req('/api/phase1/brain-review-readiness',token,'POST'),x.env)).status,405);
  assert.equal((await worker.fetch(req('/api/phase1/brain-review?requestId=phase1-review-lab-0001',token,'POST'),x.env)).status,405);
  assert.equal((await worker.fetch(req('/api/phase1/brain-review-readiness?details=1'),x.env)).status,400);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_reviews_v1').get().n,0);
 }finally{x.close();}
});
test('readiness does not authorize an edit and works before isolated D1 migration',async()=>{
 const x=fixture();
 try{
  const yes=await worker.fetch(req('/api/phase1/brain-review-readiness'),x.env);
  assert.equal(yes.status,200);
  const data=await yes.json();
  assert.equal(data.schemaReady,true);
  assert.equal(data.canActivate,false);
  assert.equal(data.canExecute,false);
  assert.equal(data.approvedProfilesActivated,0);
  const disabled=await worker.fetch(req('/api/phase1/brain-review-readiness'),{
   ...x.env,SCOTTY_PHASE1_REVIEW_READ_ENABLED:'false',BRAIN_DB:null
  });
  assert.equal(disabled.status,200);
  const status=await disabled.json();
  assert.equal(status.schemaReady,false);
  assert.equal(status.readFeatureEnabled,false);
  assert.equal(status.approvedProfilesActivated,0);
 }finally{x.close();}
});
test('feature-disabled review reads are blocked despite owner token',async()=>{
 const x=fixture();
 try{
  const r=await worker.fetch(req('/api/phase1/brain-review?requestId=phase1-review-lab-0001'),{
   ...x.env,SCOTTY_PHASE1_REVIEW_READ_ENABLED:'false'
  });
  assert.equal(r.status,403);
  assert.equal((await r.json()).error,'REVIEW_READ_FEATURE_DISABLED');
 }finally{x.close();}
});
test('owner reads exact verified review and never receives patch text, memory or a run grant',async()=>{
 const x=fixture();
 try{
  const proposal=await approved(x.db);
  const r=await worker.fetch(req('/api/phase1/brain-review?requestId='+proposal.requestId),x.env);
  assert.equal(r.status,200);
  const info=await r.json();
  assert.equal(info.mode,'OWNER_READ_ONLY_PHASE1_PROFILE_REVIEW');
  assert.equal(info.auditVerified,true);
  assert.equal(info.reviewStatus,'approved');
  assert.equal(info.patchContentExposed,false);
  assert.equal(info.privateMemoryExposed,false);
  assert.equal(info.runtimePromptActivated,false);
  assert.equal(info.ownerAcceptedEntireBrain,false);
  assert.equal(info.canExecute,false);
  assert.equal(info.modelBehaviorCertified,false);
  assert.equal(JSON.stringify(info).includes(proposal.patch.voice),false);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_audit_v1').get().n,2);
 }finally{x.close();}
});
test('read endpoint refuses invalid IDs, unknown owner and query pollution',async()=>{
 const x=fixture();
 try{
  const list=[
   '/api/phase1/brain-review',
   '/api/phase1/brain-review?requestId=../private',
   '/api/phase1/brain-review?requestId=id1&requestId=id2',
   '/api/phase1/brain-review?requestId=id1&agentId=chief-riker'
  ];
  for(const path of list){
   const res=await worker.fetch(req(path),x.env);
   assert.equal(res.status,400,path);
  }
  const unknown=await worker.fetch(req('/api/phase1/brain-review?requestId=review-id-does-not-exist'),x.env);
  assert.equal(unknown.status,404);
  const noOwnerId=await worker.fetch(req('/api/phase1/brain-review?requestId=review-id-does-not-exist'),{
   ...x.env,SCOTTY_PHASE1_REVIEW_OWNER_ID:''
  });
  assert.equal(noOwnerId.status,503);
 }finally{x.close();}
});
test('same isolated review cannot be opened as another owner',async()=>{
 const x=fixture();
 try{
  const proposal=await approved(x.db);
  const denied=await worker.fetch(req('/api/phase1/brain-review?requestId='+proposal.requestId),{
   ...x.env,SCOTTY_PHASE1_REVIEW_OWNER_ID:'owner-impostor-0001'
  });
  assert.equal(denied.status,403);
  assert.equal((await denied.json()).error,'REVIEW_ACCESS_DENIED');
 }finally{x.close();}
});
