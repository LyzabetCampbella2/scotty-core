import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.mjs';
import {handleOwnerPreviewReview,isOwnerPreviewReviewPath} from './owner-preview-review-api.mjs';

const reviewSchema=fs.readFileSync(new URL('./activepieces-review-ledger-v1.sql',import.meta.url),'utf8');
const portfolioSchema=fs.readFileSync(new URL('./agent-portfolio-v1.sql',import.meta.url),'utf8');
const token='synthetic-owner-token-abcdef1234567890';
const proposal={
 requestId:'review-demo-0001',projectId:'eirden-atelier',
 missionId:'demo-mission-0001',idempotencyKey:'idempotency-demo-0001',
 revision:'r1',intentDigest:'a'.repeat(64),
 agentIds:['agent-geordi-02','agent-expansion-012'],
 scope:'mission.preview',classification:'public-or-synthetic',
 containsPrivateData:false,paidProviderRequested:false,
 expiresAt:new Date(Date.now()+30*60*1000).toISOString()
};
function createDb(){
 const native=new DatabaseSync(':memory:');
 native.exec("PRAGMA foreign_keys=ON;");
 native.exec(reviewSchema);
 native.exec(portfolioSchema);
 for(const agent of proposal.agentIds){
  native.prepare('INSERT INTO agent_project_links(agent_id,project_id,assigned_at) VALUES(?,?,?)')
   .run(agent,proposal.projectId,'2026-11-07T00:00:00Z');
 }
 return {
  native,
  db:{
   prepare(sql){
    const stmt=native.prepare(sql);
    return {bind(...args){
      return {
       first:async()=>stmt.get(...args)||null,
       all:async()=>({results:stmt.all(...args)}),
       run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})
      };
     },all:async()=>({results:stmt.all()})};
   },
   async batch(statements){
    native.exec('BEGIN IMMEDIATE');
    try{
     const result=[];
     for(const s of statements)result.push(await s.run());
     native.exec('COMMIT');
     return result;
    }catch(e){native.exec('ROLLBACK');throw e;}
   }
  },
  close:()=>native.close()
 };
}
const env=db=>({
 OWNER_BEARER_TOKEN:token,
 SCOTTY_PREVIEW_REVIEWS_ENABLED:'true',
 SCOTTY_REVIEW_OWNER_ID:'owner-demo-0001',
 SCOTTY_REVIEW_PROJECT_ALLOWLIST:'eirden-atelier',
 SCOTTY_ACTIVEPIECES_ENABLED:'false',
 AI_ENABLED:'false',BRAIN_DB:db
});
function req(path,method='GET',body,auth=token){
 return new Request('https://isolated-scotty.invalid'+path,{
  method,headers:{
   ...(auth?{authorization:'Bearer '+auth}:{}),
   ...(body?{'content-type':'application/json'}:{})
  },
  ...(body?{body:JSON.stringify(body)}:{})
 });
}
const post=(path,body,auth=token)=>req(path,'POST',body,auth);
test('review route is distinct from publicly readable Activepieces bridge',async()=>{
 assert.equal(isOwnerPreviewReviewPath('/api/owner-preview-reviews'),true);
 assert.equal(isOwnerPreviewReviewPath('/api/owner-preview-reviews/decision'),true);
 assert.equal(isOwnerPreviewReviewPath('/api/activepieces/plan'),false);
 const s=createDb();
 try{
  const response=await worker.fetch(req('/api/owner-preview-reviews'),{...env(s.db),SCOTTY_PREVIEW_REVIEWS_ENABLED:'false'});
  assert.equal(response.status,503);
  const direct=await handleOwnerPreviewReview(req('/api/owner-preview-reviews'),env(s.db));
  assert.equal(direct.status,401);
  assert.equal((await worker.fetch(req('/api/owner-preview-reviews', 'GET',undefined,null),env(s.db))).status,401);
  assert.equal((await worker.fetch(req('/api/owner-preview-reviews', 'GET',undefined,'wrong-but-long-abc000000000000000000'),env(s.db))).status,401);
  const alternateBridgeToken='synthetic-activepieces-token-abcdef12345678900000';
  assert.equal((await worker.fetch(req('/api/owner-preview-reviews','GET',undefined,alternateBridgeToken),{...env(s.db),ACTIVEPIECES_BRIDGE_TOKEN:alternateBridgeToken,SCOTTY_ACTIVEPIECES_ENABLED:'true'})).status,401);
  const bridgeEnv={...env(s.db),ACTIVEPIECES_BRIDGE_TOKEN:alternateBridgeToken,SCOTTY_ACTIVEPIECES_ENABLED:'true'};
  const bridgeHeader={'x-scotty-activepieces-token':alternateBridgeToken};
  const catalog=new Request('https://isolated-scotty.invalid/api/activepieces/catalog',{headers:bridgeHeader});
  assert.equal((await worker.fetch(catalog,bridgeEnv)).status,200);
  const forgedOwner=new Request('https://isolated-scotty.invalid/api/owner-preview-reviews',{headers:bridgeHeader});
  assert.equal((await worker.fetch(forgedOwner,bridgeEnv)).status,401);
  const attempted=await worker.fetch(post('/api/activepieces/plan',{question:'fictional QA',ownerApproved:true},alternateBridgeToken),{...env(s.db),ACTIVEPIECES_BRIDGE_TOKEN:alternateBridgeToken,SCOTTY_ACTIVEPIECES_ENABLED:'true'});
  assert.equal(attempted.status,401); // Activepieces expects a dedicated header, not the owner bearer header.
  assert.equal((await worker.fetch(post('/api/owner-preview-reviews',{...proposal,ownerApproved:true}),env(s.db))).status,400);
 }finally{s.close();}
});
test('owner-only create, metadata readback and idempotent replay never execute',async()=>{
 const s=createDb();
 try{
  const first=await worker.fetch(post('/api/owner-preview-reviews',proposal),env(s.db));
  assert.equal(first.status,201,JSON.stringify(await first.clone().json()));
  const result=await first.json();
  assert.equal(result.reviewStatus,'pending');
  assert.equal(result.canExecute,false);
  assert.equal(result.agentExecutionAuthorized,false);
  assert.equal(result.created,true);
  assert.equal(result.auditVerified,true);
  const read=await worker.fetch(req('/api/owner-preview-reviews?requestId='+proposal.requestId),env(s.db));
  assert.equal(read.status,200);
  const out=await read.json();
  assert.equal(out.reviewStatus,'pending');
  assert.equal(out.canExecute,false);
  assert.equal(out.auditEventCount,1);
  const replay=await worker.fetch(post('/api/owner-preview-reviews',proposal),env(s.db));
  assert.equal(replay.status,201);
  assert.equal((await replay.json()).replayed,true);
  assert.equal(s.native.prepare('SELECT COUNT(*) AS n FROM scotty_activepieces_review_requests_v1').get().n,1);
  assert.equal(s.native.prepare('SELECT COUNT(*) AS n FROM scotty_activepieces_review_audit_v1').get().n,1);
 }finally{s.close();}
});
test('owner can approve review preview, revoke, and no agent work is started',async()=>{
 const s=createDb();
 try{
  const created=await worker.fetch(post('/api/owner-preview-reviews',proposal),env(s.db));
  assert.equal(created.status,201);
  const approved=await worker.fetch(post('/api/owner-preview-reviews/decision',{
   requestId:proposal.requestId,revision:'r1',intentDigest:proposal.intentDigest,
   expectedVersion:1,decision:'approved',confirmed:true
  }),env(s.db));
  assert.equal(approved.status,200,JSON.stringify(await approved.clone().json()));
  const result=await approved.json();
  assert.equal(result.reviewStatus,'approved');
  assert.equal(result.canExecute,false);
  assert.equal(result.agentExecutionAuthorized,false);
  assert.equal(result.projectAssignmentsChanged,0);
  assert.equal(result.privateMemoryWrites,0);
  assert.equal(result.aiCalls,0);
  const revoked=await worker.fetch(post('/api/owner-preview-reviews/decision',{
   requestId:proposal.requestId,revision:'r1',intentDigest:proposal.intentDigest,
   expectedVersion:2,decision:'revoked',confirmed:true
  }),env(s.db));
  assert.equal(revoked.status,200,JSON.stringify(await revoked.clone().json()));
  assert.equal((await revoked.json()).reviewStatus,'revoked');
  assert.equal(s.native.prepare('SELECT COUNT(*) AS n FROM scotty_activepieces_review_audit_v1').get().n,3);
 }finally{s.close();}
});
test('reject requests for cross-project access, missing links or forged membership claims',async()=>{
 const s=createDb();
 try{
  for(const bad of [
   {...proposal,projectId:'bloodpool-trilogy'},
   {...proposal,agentIds:['agent-worf-01']},
   {...proposal,actor:{authenticated:true,role:'owner'}},
   {...proposal,project:{active:true,allowedAgentIds:proposal.agentIds}}
  ]){
   const r=await worker.fetch(post('/api/owner-preview-reviews',bad),env(s.db));
   assert.ok(r.status>=400);
  }
  s.native.prepare('DELETE FROM agent_project_links WHERE agent_id=?').run(proposal.agentIds[0]);
  const res=await worker.fetch(post('/api/owner-preview-reviews',proposal),env(s.db));
  assert.equal(res.status,403);
  assert.equal(s.native.prepare('SELECT COUNT(*) AS n FROM scotty_activepieces_review_requests_v1').get().n,0);
 }finally{s.close();}
});
test('missing schema, owner config, invalid method and query are denied',async()=>{
 const s=createDb();
 try{
  assert.equal((await worker.fetch(post('/api/owner-preview-reviews',proposal),{...env(s.db),SCOTTY_REVIEW_OWNER_ID:undefined})).status,400);
  assert.equal((await worker.fetch(post('/api/owner-preview-reviews',proposal),{...env(s.db),BRAIN_DB:undefined})).status,503);
  assert.equal((await worker.fetch(req('/api/owner-preview-reviews/decision'),env(s.db))).status,405);
  assert.equal((await worker.fetch(post('/api/owner-preview-reviews/decision?ownerApproved=true',{
   requestId:proposal.requestId,decision:'approved'
  }),env(s.db))).status,400);
  assert.equal((await worker.fetch(req('/api/owner-preview-reviews?requestId='+proposal.requestId+'&admin=true'),env(s.db))).status,400);
 }finally{s.close();}
});


test('owner-only preflight diagnoses isolated setup without any data write or secret disclosure',async()=>{
 const s=createDb();
 try{
  const before=s.native.prepare('SELECT COUNT(*) AS n FROM scotty_activepieces_review_audit_v1').get().n;
  const path='/api/owner-preview-reviews/readiness';
  const ok=await worker.fetch(req(path),env(s.db));
  assert.equal(ok.status,200);
  const state=await ok.json();
  assert.equal(state.type,'SCOTTY_OWNER_PREVIEW_REVIEW_PREFLIGHT');
  assert.equal(state.status,'ISOLATED_PREVIEW_REVIEW_CONFIG_READY');
  assert.equal(state.readyForIsolatedPreviewReviews,true);
  assert.equal(state.projectAllowlistValid,true);
  assert.equal(state.projectsConfigured,1);
  assert.equal(state.matchingProjectCount,1);
  assert.equal(state.linkedAgentCount,2);
  assert.equal(state.readyForProduction,false);
  assert.equal(state.canExecute,false);
  assert.equal(state.canDeploy,false);
  assert.equal(state.canPublish,false);
  assert.equal(state.memoryReads,0);
  assert.equal(state.databaseWrites,0);
  assert.equal(s.native.prepare('SELECT COUNT(*) AS n FROM scotty_activepieces_review_audit_v1').get().n,before);
  const serialized=JSON.stringify(state);
  assert.doesNotMatch(serialized,/OWNER_BEARER_TOKEN|SCOTTY_REVIEW_OWNER_ID|synthetic-owner-token|owner-demo-0001/);
  assert.equal((await worker.fetch(req(path,'GET',undefined,null),env(s.db))).status,401);
  assert.equal((await worker.fetch(post(path,{ownerApproved:true}),env(s.db))).status,405);
  assert.equal((await worker.fetch(req(path+'?token=secret'),env(s.db))).status,400);
 }finally{s.close();}
});

test('owner preflight remains accessible with feature OFF but refuses to imply launch approval',async()=>{
 const s=createDb();
 try{
  const out=await worker.fetch(req('/api/owner-preview-reviews/readiness'),{...env(s.db),SCOTTY_PREVIEW_REVIEWS_ENABLED:'false'});
  assert.equal(out.status,200);
  const state=await out.json();
  assert.equal(state.status,'BLOCKED');
  assert.equal(state.featureSwitchOn,false);
  assert.equal(state.readyForIsolatedPreviewReviews,false);
  assert.equal(state.canExecute,false);
  assert.ok(state.blockers.includes('OWNER_REVIEW_SWITCH_OFF'));
  assert.equal((await worker.fetch(post('/api/owner-preview-reviews',proposal),{...env(s.db),SCOTTY_PREVIEW_REVIEWS_ENABLED:'false'})).status,503);
 }finally{s.close();}
});

test('owner preflight reports missing identity and incomplete isolated D1 project links',async()=>{
 const s=createDb();
 try{
  const path='/api/owner-preview-reviews/readiness';
  const invalid=await worker.fetch(req(path),{...env(s.db),SCOTTY_REVIEW_OWNER_ID:undefined});
  assert.equal(invalid.status,200);
  assert.equal((await invalid.json()).readyForIsolatedPreviewReviews,false);
  s.native.prepare('DELETE FROM agent_project_links WHERE agent_id=?').run(proposal.agentIds[0]);
  const one=await worker.fetch(req(path),env(s.db));
  assert.equal((await one.json()).linkedAgentCount,1);
  s.native.prepare('DELETE FROM agent_project_links WHERE project_id=?').run(proposal.projectId);
  const empty=await worker.fetch(req(path),env(s.db));
  const state=await empty.json();
  assert.equal(state.status,'BLOCKED');
  assert.equal(state.publicDevelopmentMembershipReady,false);
  assert.equal(state.readyForIsolatedPreviewReviews,false);
  assert.ok(state.blockers.includes('PROJECT_AGENT_MEMBERSHIP_NOT_READY'));
  s.native.prepare('INSERT INTO agent_project_links(agent_id,project_id,assigned_at) VALUES(?,?,?)').run('agent-pretend-unknown',proposal.projectId,'2026-11-07T00:00:00Z');
  const forged=await worker.fetch(req(path),env(s.db));
  assert.ok((await forged.json()).blockers.includes('PROJECT_MEMBERSHIP_QUERY_UNVERIFIED'));
 }finally{s.close();}
});

test('preflight cannot be reached with the independent Activepieces bridge token',async()=>{
 const s=createDb();
 try{
  const bridgeToken='synthetic-activepieces-token-abcdef12345678900000';
  const environment={...env(s.db),SCOTTY_ACTIVEPIECES_ENABLED:'true',ACTIVEPIECES_BRIDGE_TOKEN:bridgeToken};
  const bridgeOnly=new Request('https://isolated-scotty.invalid/api/owner-preview-reviews/readiness',{
   headers:{'x-scotty-activepieces-token':bridgeToken}
  });
  assert.equal((await worker.fetch(bridgeOnly,environment)).status,401);
  const bridgeBearer=req('/api/owner-preview-reviews/readiness','GET',undefined,bridgeToken);
  assert.equal((await worker.fetch(bridgeBearer,environment)).status,401);
 }finally{s.close();}
});
