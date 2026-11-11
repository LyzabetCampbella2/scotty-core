import test from 'node:test';
import assert from 'node:assert/strict';
import {handleIndependentBrain} from './independent-bridge.mjs';
const owner='https://scotty-core.example';
const endpoint=owner+'/api/independent-brain/memory-change';
const env={SCOTTY_INDEPENDENT_BRAIN_ENABLED:'true',SCOTTY_INDEPENDENT_BRAIN_MEMORY_PROXY_ENABLED:'true',
 SCOTTY_INDEPENDENT_BRAIN_TOKEN:'synthetic-token-0123456789abcdef0123456789',
 SCOTTY_INDEPENDENT_BRAIN_URL:'https://synthetic-owner-brain.workers.dev'};
const make=(data,path=endpoint)=>new Request(path,{method:'POST',headers:{'content-type':'application/json',origin:owner},body:JSON.stringify(data)});
test('D1 changes reject missing owner approval and never reach Worker',async()=>{
 let invoked=0;
 const options={env,authenticated:async()=>true,fetcher:async()=>{invoked++;return Response.json({ok:true})}};
 const base={noteId:'00000000-0000-0000-0000-000000000001',action:'delete'};
 const denied=await handleIndependentBrain(make({...base,stage:'apply',noPrivateDataConfirmed:true}),new URL(endpoint),options);
 assert.equal(denied.status,403);assert.equal(invoked,0);
 const noPrivacy=await handleIndependentBrain(make({...base,stage:'preview'}),new URL(endpoint),options);
 assert.equal(noPrivacy.status,403);assert.equal(invoked,0);
});
test('valid approved mutation is proxied with server token only',async()=>{
 let called=0;
 const options={env,authenticated:async()=>true,fetcher:async(url,init)=>{
  called++;assert.equal(url,env.SCOTTY_INDEPENDENT_BRAIN_URL+'/api/memory-change');
  assert.equal(init.headers.authorization,'Bearer '+env.SCOTTY_INDEPENDENT_BRAIN_TOKEN);
  assert.equal(JSON.parse(init.body).approved,true);
  return Response.json({stage:'applied',verified:true});
 }};
 const r=await handleIndependentBrain(make({stage:'apply',noteId:'00000000-0000-0000-0000-000000000001',action:'delete',previewToken:'synthetic-digest',approved:true,reviewAcknowledged:true,noPrivateDataConfirmed:true}),new URL(endpoint),options);
 assert.equal(r.status,200);assert.equal(called,1);assert.equal((await r.json()).verified,true);
});
test('redacted history requires owner authentication and an exact note ID',async()=>{
 const url=owner+'/api/independent-brain/memory-history?noteId=00000000-0000-0000-0000-000000000001';
 let count=0;
 const opts={env,authenticated:async()=>true,fetcher:async(u,init)=>{count++;assert.ok(u.includes('/api/memory-history?noteId='));return Response.json({changes:[]})}};
 const r=await handleIndependentBrain(new Request(url),new URL(url),opts);
 assert.equal(r.status,200);assert.equal(count,1);
 const denied=await handleIndependentBrain(new Request(url),new URL(url),{...opts,authenticated:async()=>false});
 assert.equal(denied.status,401);
 const malformed=owner+'/api/independent-brain/memory-history?noteId=bad';
 const bad=await handleIndependentBrain(new Request(malformed),new URL(malformed),opts);
 assert.equal(bad.status,400);
});

test('read-only memory and conflict-history routes also require an explicitly enabled memory proxy',async()=>{
 let calls=0;
 const locked={...env,SCOTTY_INDEPENDENT_BRAIN_MEMORY_PROXY_ENABLED:'false'};
 const opts={env:locked,authenticated:async()=>true,fetcher:async()=>{calls++;return Response.json({notes:[]})}};
 for(const suffix of [
   'memory?agentId=scotty',
   'memory-history?noteId=00000000-0000-0000-0000-000000000001',
   'memory-conflicts?agentId=scotty'
 ]){
  const u=owner+'/api/independent-brain/'+suffix;
  const res=await handleIndependentBrain(new Request(u),new URL(u),opts);
  assert.equal(res.status,503);
  assert.equal((await res.json()).error,'MEMORY_PROXY_DISABLED');
 }
 assert.equal(calls,0);
});


test('stale-mission recovery refuses disabled proxy and missing exact owner CSRF approval',async()=>{
 const url=owner+'/api/independent-brain/mission-recovery',missionId='test-stale-mission-00000001';
 let calls=0;
 const opts={env:{...env,SCOTTY_INDEPENDENT_BRAIN_RECOVERY_ENABLED:'false'},authenticated:async()=>true,
  fetcher:async()=>{calls++;return Response.json({ok:true})}};
 const req=(body,headers={})=>new Request(url,{method:'POST',headers:{'content-type':'application/json',origin:owner,...headers},body:JSON.stringify(body)});
 const disabled=await handleIndependentBrain(req({stage:'preview',missionId}),new URL(url),opts);
 assert.equal(disabled.status,503);
 assert.equal(calls,0);
 const enabled={...opts,env:{...opts.env,SCOTTY_INDEPENDENT_BRAIN_RECOVERY_ENABLED:'true'}};
 const withoutCSRF=await handleIndependentBrain(req({stage:'preview',missionId}),new URL(url),enabled);
 assert.equal(withoutCSRF.status,403);
 const incomplete=await handleIndependentBrain(req({stage:'apply',missionId,ownerApproved:true}, {'x-scotty-csrf':'1'}),new URL(url),enabled);
 assert.equal(incomplete.status,403);
 assert.equal(calls,0);
});
test('owner-reviewed exact stale checkpoint forwards once, no model calls or private mission text',async()=>{
 const url=owner+'/api/independent-brain/mission-recovery';
 const envWithRecovery={...env,SCOTTY_INDEPENDENT_BRAIN_RECOVERY_ENABLED:'true'};
 const missionId='test-stale-mission-00000001',timestamp='2026-10-30T10:00:00.000Z';
 const input={stage:'apply',missionId,expectedUpdatedAt:timestamp,ownerApproved:true,reviewAcknowledged:true};
 let forwarded=0;
 const request=new Request(url,{method:'POST',headers:{origin:owner,'x-scotty-csrf':'1','content-type':'application/json'},body:JSON.stringify(input)});
 const response=await handleIndependentBrain(request,new URL(url),{
  env:envWithRecovery,authenticated:async()=>true,fetcher:async(endpoint,opts)=>{
   forwarded++;
   assert.equal(endpoint,env.SCOTTY_INDEPENDENT_BRAIN_URL+'/api/mission-recovery');
   assert.equal(opts.headers.authorization,'Bearer '+env.SCOTTY_INDEPENDENT_BRAIN_TOKEN);
   assert.deepEqual(JSON.parse(opts.body),input);
   assert.equal(opts.headers.cookie,undefined);
   return Response.json({missionId,status:'incomplete',verified:true,modelCalls:0});
  }
 });
 assert.equal(response.status,200);
 assert.equal(forwarded,1);
 assert.equal((await response.json()).verified,true);
});

test('recovery incident history is read-only and separately owner-gated',async()=>{
 const base=owner+'/api/independent-brain/mission-incidents';
 let called=0;
 const opts={env:{...env,SCOTTY_INDEPENDENT_BRAIN_RECOVERY_ENABLED:'false'},
  authenticated:async()=>true,fetcher:async()=>{called++;return Response.json({incidents:[]})}};
 const denied=await handleIndependentBrain(new Request(base),new URL(base),opts);
 assert.equal(denied.status,503);assert.equal(called,0);
 const enabled={...opts,env:{...opts.env,SCOTTY_INDEPENDENT_BRAIN_RECOVERY_ENABLED:'true'},fetcher:async(endpoint,init)=>{
  called++;assert.equal(endpoint,opts.env.SCOTTY_INDEPENDENT_BRAIN_URL+'/api/mission-incidents?missionId=example-mission-00001');
  assert.equal(init.method,'GET');
  assert.equal(init.headers.authorization,'Bearer '+opts.env.SCOTTY_INDEPENDENT_BRAIN_TOKEN);
  return Response.json({incidents:[{missionId:'example-mission-00001',eventId:'synthetic-event',newStatus:'incomplete'}],readOnly:true});
 }};
 const u=base+'?missionId=example-mission-00001';
 const okay=await handleIndependentBrain(new Request(u),new URL(u),enabled);
 assert.equal(okay.status,200);assert.equal(called,1);
 assert.equal((await okay.json()).incidents.length,1);
 const malformed=base+'?missionId=../other-project';
 const bad=await handleIndependentBrain(new Request(malformed),new URL(malformed),enabled);
 assert.equal(bad.status,400);assert.equal(called,1);
 const noAuth=await handleIndependentBrain(new Request(u),new URL(u),{...enabled,authenticated:async()=>false});
 assert.equal(noAuth.status,401);assert.equal(called,1);
});
