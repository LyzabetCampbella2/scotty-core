import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase5DenialAuditBoundary} from './phase5-denial-audit.mjs';

function setup({answer={decision:'DENY',reason:'ACTION_NOT_ALLOWED',actualPermissionGranted:false,stagingOnly:true},failAudit=false,throwGate=false,enabled=true}={}){
 const writes=[],queries=[];let calls=0;
 const sql={begin:async fn=>{
   if(failAudit)throw Error('SENSITIVE_DB_FAILURE_DO_NOT_LEAK');
   return fn({unsafe:async(query,values)=>{
     queries.push(query);writes.push(values);return Object.assign([],{count:1});
   }});
 }};
 const gate=async()=>{calls++;if(throwGate)throw Error('SENSITIVE_GATE_EXCEPTION_DO_NOT_LEAK');return answer};
 const preview=createPhase5DenialAuditBoundary({sql,gate,enabled});
 return {preview,writes,queries,getCalls:()=>calls};
}
test('missing dependencies rejected',()=>{
 assert.throws(()=>createPhase5DenialAuditBoundary({}),/TRUSTED_DEPENDENCIES_REQUIRED/);
});
test('disabled by default never invokes gate or database',async()=>{
 const h=setup({enabled:false});const out=await h.preview({action:'workspace:read'});
 assert.equal(out.decision,'DENY');assert.equal(out.denialAuditPersisted,false);
 assert.equal(h.getCalls(),0);assert.equal(h.writes.length,0);
});
test('denied request is recorded in a separate synthetic audit',async()=>{
 const h=setup();const out=await h.preview({action:'memory:read',projectId:'secret-project'});
 assert.equal(out.reason,'ACTION_NOT_ALLOWED');assert.equal(out.denialAuditPersisted,true);
 assert.deepEqual(h.writes,[['ACTION_NOT_ALLOWED','OTHER']]);
 assert.match(h.queries[0],/insert into scotty_p5_synthetic_denial_audit/);
});
test('audit only sees fixed classification, not sensitive request data',async()=>{
 const secret='BEARER-VISIBLE-ONLY-IN-INPUT-999';
 const h=setup();await h.preview({action:'workspace:read',nonce:secret,authorization:secret,body:{token:secret},projectId:secret,resourceId:secret,grantId:secret});
 const footprint=JSON.stringify({writes:h.writes,queries:h.queries});
 assert.equal(footprint.includes(secret),false);
 assert.deepEqual(h.writes[0],['ACTION_NOT_ALLOWED','WORKSPACE_READ']);
});
test('audit write failure remains denied without leaking internal error',async()=>{
 const h=setup({failAudit:true});const out=await h.preview({action:'knowledge:propose'});
 assert.equal(out.decision,'DENY');assert.equal(out.denialAuditPersisted,false);
 assert.equal(JSON.stringify(out).includes('SENSITIVE_'),false);
});
test('underlying gate throw fails closed with independent denial audit',async()=>{
 const h=setup({throwGate:true});const out=await h.preview({});
 assert.equal(out.reason,'UNDERLYING_GATE_FAILURE');assert.equal(out.denialAuditPersisted,true);
 assert.deepEqual(h.writes,[['UNDERLYING_GATE_FAILURE','OTHER']]);
 assert.equal(JSON.stringify(out).includes('SENSITIVE'),false);
});
test('unrecognized result cannot be treated as authorization',async()=>{
 const h=setup({answer:{decision:'ALLOW',actualPermissionGranted:true}});
 const out=await h.preview({action:'workspace:read'});
 assert.equal(out.decision,'DENY');assert.equal(out.reason,'UNSAFE_GATE_RESPONSE');
 assert.deepEqual(h.writes[0],['UNSAFE_GATE_RESPONSE','WORKSPACE_READ']);
});
test('untrusted error text is discarded before audit insertion',async()=>{
 const h=setup({answer:{decision:'DENY',reason:'TOKEN-LEAK-OR-SQL',actualPermissionGranted:false}});
 const out=await h.preview({action:'credential:dump'});
 assert.equal(out.reason,'UNSAFE_GATE_RESPONSE');assert.equal(out.denialAuditPersisted,true);
 assert.equal(JSON.stringify(h.writes).includes('TOKEN-LEAK'),false);
});
test('eligible mock preview does not duplicate its transactional audit',async()=>{
 const h=setup({answer:{decision:'SIMULATED_ELIGIBLE',reason:'NO_REAL_ACCESS',actualPermissionGranted:false,stagingOnly:true}});
 const out=await h.preview({action:'workspace:read'});
 assert.equal(out.decision,'SIMULATED_ELIGIBLE');assert.equal(out.denialAuditPersisted,null);
 assert.equal(h.writes.length,0);
});
test('eligible-looking response with real permission flag is rejected and logged',async()=>{
 const h=setup({answer:{decision:'SIMULATED_ELIGIBLE',stagingOnly:true,actualPermissionGranted:true}});
 const out=await h.preview({action:'workspace:read'});
 assert.equal(out.reason,'UNSAFE_GATE_RESPONSE');assert.equal(out.actualPermissionGranted,false);
 assert.equal(h.writes.length,1);
});
test('multiple denied attempts independently append',async()=>{
 const h=setup();
 const out=await Promise.all(Array.from({length:5},(_,i)=>h.preview({nonce:'SECRET'+i,action:'memory:read'})));
 assert.equal(out.length,5);assert.ok(out.every(x=>x.denialAuditPersisted===true));
 assert.equal(h.writes.length,5);
});
