import test from 'node:test';
import assert from 'node:assert/strict';
import {handleActivepieces,isActivepiecesPath} from './activepieces-bridge.mjs';

const token='synthetic-activepieces-token-abcdef12345678900000';
const env={ACTIVEPIECES_BRIDGE_TOKEN:token,SCOTTY_ACTIVEPIECES_ENABLED:'true',OWNER_BEARER_TOKEN:'synthetic-owner-token-abcdef1234567890'};
const req=(path,method='GET',body,auth=token)=>new Request('https://example.invalid'+path,{
  method,headers:{...(auth?{'x-scotty-activepieces-token':auth}:{}),...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
});
test('isolated namespace disabled unless explicitly activated',async()=>{
  assert.equal(isActivepiecesPath('/api/activepieces/catalog'),true);
  assert.equal(isActivepiecesPath('/api/team'),false);
  assert.equal((await handleActivepieces(req('/api/activepieces/catalog'),{...env,SCOTTY_ACTIVEPIECES_ENABLED:'false'})).status,503);
});
test('isolated credential never reuses owner session',async()=>{
  for(const bad of [null,'too-short',env.OWNER_BEARER_TOKEN,'different-secret-mock-abc1234567890123456789']){
    assert.equal((await handleActivepieces(req('/api/activepieces/catalog','GET',undefined,bad),env)).status,401);
  }
  assert.equal((await handleActivepieces(req('/api/activepieces/catalog'),{...env,OWNER_BEARER_TOKEN:token})).status,401);
});
test('catalog only contains metadata, 25 chiefs and 160 specialists',async()=>{
  const r=await handleActivepieces(req('/api/activepieces/catalog'),env),b=await r.json();
  assert.equal(r.status,200);assert.equal(b.mode,'READ_ONLY');assert.equal(b.count,185);
  assert.equal(b.chiefs,25);assert.equal(b.specialists,160);assert.equal(b.liveRosterVerified,false);
  for(const a of b.agents)assert.deepEqual(Object.keys(a).sort(),['id','name','isChief','department','specialty','chiefId','skills'].sort());
  assert.doesNotMatch(JSON.stringify(b),/OWNER_BEARER_TOKEN|privateNotes|projectContext/);
});
test('plan never reads memory, creates projects, executes AI or missions',async()=>{
  const r=await handleActivepieces(req('/api/activepieces/plan','POST',{question:'Plan fictional software QA checks.'}),env);
  assert.equal(r.status,200);const b=await r.json();
  assert.equal(b.status,'PROPOSAL_ONLY');
  assert.equal(b.aiCalls,0);assert.equal(b.memoryReads,0);assert.equal(b.memoryWrites,0);
  assert.equal(b.missionsStarted,0);assert.equal(b.changesToProjects,0);
  assert.equal(b.ownerApprovalNeededForExecution,true);
});
test('rejects extra actions, long prompts, query secrets and unsupported methods',async()=>{
  for(const body of [{question:'Valid',ownerApproved:true},{question:'Valid',projectContext:{private:'X'}},{question:''},{question:'x'.repeat(501)}]){
    assert.equal((await handleActivepieces(req('/api/activepieces/plan','POST',body),env)).status,400);
  }
  for(const [p,m,s] of [['/api/activepieces/catalog','POST',405],['/api/activepieces/plan','GET',405],['/api/activepieces/execute','POST',404],['/api/activepieces/catalog?token=foo','GET',400]]){
    assert.equal((await handleActivepieces(req(p,m),env)).status,s);
  }
});
test('actual isolated Worker routes bridge before normal owner auth',async()=>{
  const worker=(await import('./worker.mjs')).default;
  assert.equal((await worker.fetch(req('/api/activepieces/catalog'),env)).status,200);
  assert.equal((await worker.fetch(req('/api/activepieces/catalog','GET',undefined,env.OWNER_BEARER_TOKEN),env)).status,401);
});

test('review readiness requires separate bridge secret and never grants owner authority',async()=>{
  const url='/api/activepieces/review-readiness';
  const disabled=await handleActivepieces(req(url),{...env,SCOTTY_ACTIVEPIECES_ENABLED:'false'});
  assert.equal(disabled.status,503);
  const wrong=await handleActivepieces(req(url,'GET',undefined,env.OWNER_BEARER_TOKEN),env);
  assert.equal(wrong.status,401);
  const ok=await handleActivepieces(req(url),env);
  assert.equal(ok.status,200);
  const info=await ok.json();
  assert.equal(info.type,'REVIEW_SCHEMA_READINESS');
  assert.equal(info.ready,false);
  assert.equal(info.reason,'ISOLATED_D1_BINDING_UNAVAILABLE');
  assert.equal(info.ownerSessionVerified,false);
  assert.equal(info.projectMembershipVerified,false);
  assert.equal(info.approvalsVerified,0);
  assert.equal(info.canExecute,false);
  assert.equal(info.changesMade,0);
  assert.equal((await handleActivepieces(req(url,'POST',{approved:true}),env)).status,405);
  assert.equal((await handleActivepieces(req(url+'?ownerApproved=true'),env)).status,400);
  const worker=(await import('./worker.mjs')).default;
  const response=await worker.fetch(req(url),env);
  assert.equal(response.status,200);
  assert.equal((await response.json()).canExecute,false);
});
