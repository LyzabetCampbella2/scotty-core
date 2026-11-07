import test from 'node:test';
import assert from 'node:assert/strict';
import {handleN8nBridge,isN8nBridgePath} from './n8n-bridge.mjs';

const key='test-only-n8n-bridge-secret-not-real-123456789';
const env={SCOTTY_N8N_BRIDGE_ENABLED:'true',N8N_BRIDGE_TOKEN:key,OWNER_BEARER_TOKEN:'different-test-only-owner-key-123456789'};
const request=(path,method='GET',body,token=key)=>new Request('https://staging.invalid'+path,{
  method,headers:{...(token?{'x-scotty-n8n-token':token}:{}),...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
});
test('dedicated n8n namespace and default-off configuration',async()=>{
  assert.equal(isN8nBridgePath('/api/n8n/catalog'),true);
  assert.equal(isN8nBridgePath('/api/team'),false);
  const r=await handleN8nBridge(request('/api/n8n/catalog'),{...env,SCOTTY_N8N_BRIDGE_ENABLED:'false'});
  assert.equal(r.status,503);
  assert.equal((await r.json()).error,'BRIDGE_DISABLED');
});
test('separate credential, no owner token or missing credential accepted',async()=>{
  for(const token of [null,'short',env.OWNER_BEARER_TOKEN,'bad-bridge-token-not-actually-valid-1234567890']){
    const r=await handleN8nBridge(request('/api/n8n/catalog','GET',null,token),env);
    assert.equal(r.status,401);
  }
  const reused=await handleN8nBridge(request('/api/n8n/catalog'),{...env,OWNER_BEARER_TOKEN:key});
  assert.equal(reused.status,401);
});
test('catalog metadata has 25 chiefs and 160 specialists but never memory',async()=>{
  const r=await handleN8nBridge(request('/api/n8n/catalog'),env);
  assert.equal(r.status,200);
  assert.equal(r.headers.get('cache-control'),'no-store');
  const b=await r.json();
  assert.equal(b.agentCount,185);
  assert.equal(b.chiefCount,25);
  assert.equal(b.specialistCount,160);
  assert.equal(b.agents.length,185);
  assert.equal(b.rosterVerifiedLive,false);
  for(const a of b.agents){
    assert.deepEqual(Object.keys(a).sort(),['chiefId','department','id','isChief','name','skills','specialty'].sort());
  }
  assert.doesNotMatch(JSON.stringify(b),/OWNER_BEARER_TOKEN|privateNotes|projectContext/);
});
test('route preview is inert and never starts model calls, memory or missions',async()=>{
  const r=await handleN8nBridge(request('/api/n8n/plan','POST',{question:'Create a synthetic software QA checklist and research plan.'}),env);
  assert.equal(r.status,200);
  const b=await r.json();
  assert.equal(b.mode,'READ_ONLY');
  assert.equal(b.inferenceCalls,0);
  assert.equal(b.memoryReads,0);
  assert.equal(b.memoryWrites,0);
  assert.equal(b.missionsStarted,0);
  assert.equal(b.ownerApprovalRequiredForExecution,true);
  assert.ok(Array.isArray(b.agents));
});
test('rejects privilege escalation, malformed bodies, query tokens and unsupported methods',async()=>{
  for(const body of [{question:'Safe',ownerApproved:true},{question:'Safe',projectContext:{secrets:'X'}},{question:''},{question:'x'.repeat(501)}]){
    const r=await handleN8nBridge(request('/api/n8n/plan','POST',body),env);
    assert.equal(r.status,400);
  }
  for(const [path,method,expected] of [['/api/n8n/catalog','POST',405],['/api/n8n/plan','GET',405],['/api/n8n/execute','POST',404],['/api/n8n/catalog?token=hello','GET',400]]){
    const r=await handleN8nBridge(request(path,method),env);
    assert.equal(r.status,expected);
  }
});

test('actual isolated Worker route uses the dedicated bridge credential',async()=>{
  const worker=(await import('./worker.mjs')).default;
  const ok=await worker.fetch(request('/api/n8n/catalog'),{...env,AI_ENABLED:'false'});
  assert.equal(ok.status,200);
  assert.equal((await ok.json()).agentCount,185);
  const rejected=await worker.fetch(request('/api/n8n/catalog','GET',null,env.OWNER_BEARER_TOKEN),env);
  assert.equal(rejected.status,401);
});
