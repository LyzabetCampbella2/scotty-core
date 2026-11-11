import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareOfflineGrokBrain,invokeGrokOffline,GROK_BRAIN_MODE} from './grok-offline.mjs';

test('never activates provider or changes production',()=>{
 const r=prepareOfflineGrokBrain({requestId:'synthetic-1',messages:[{role:'user',content:'test'}]});
 assert.equal(GROK_BRAIN_MODE,'disconnected');
 assert.deepEqual([r.executed,r.connected,r.providerCalls,r.productionWrites],[false,false,0,0]);
});
test('does not output synthetic private text, references or credentials',()=>{
 const r=prepareOfflineGrokBrain({requestId:'synthetic-2',projectId:'test',messages:[{role:'user',content:'SECRET_SAMPLE'}],approvedReferenceIds:['private_sample']});
 assert.ok(!JSON.stringify(r).includes('SECRET_SAMPLE'));
 assert.ok(!JSON.stringify(r).includes('private_sample'));
});
test('rejects out-of-scope and malformed requests',()=>{
 assert.throws(()=>prepareOfflineGrokBrain({requestId:'bad id'}),/identifier/);
 assert.throws(()=>prepareOfflineGrokBrain({requestId:'safe',intent:'deploy'}),/intent/);
 assert.throws(()=>prepareOfflineGrokBrain({requestId:'safe',approvedReferenceIds:['private_sample']}),/project/);
 assert.throws(()=>prepareOfflineGrokBrain({requestId:'safe',projectId:'p',approvedReferenceIds:['a','a']}),/Duplicate/);
});
test('never invokes network',async()=>{
 const original=globalThis.fetch;
 let called=false;
 globalThis.fetch=async()=>{called=true;throw Error('No network permitted');};
 try{const r=await invokeGrokOffline();assert.equal(r.code,'GROK_DISCONNECTED');assert.equal(called,false);}
 finally{globalThis.fetch=original;}
});
test('input remains unchanged',()=>{
 const r={requestId:'test',messages:[{role:'user',content:'hello'}]};
 const before=JSON.stringify(r);
 const out=prepareOfflineGrokBrain(r);
 assert.equal(JSON.stringify(r),before);
 assert.equal(Object.isFrozen(out),true);
});
