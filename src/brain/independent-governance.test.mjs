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
