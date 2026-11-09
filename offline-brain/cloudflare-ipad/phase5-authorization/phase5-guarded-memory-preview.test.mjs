import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase5GuardedSyntheticMemoryPreview} from './phase5-guarded-memory-preview.mjs';

const eligible={
 decision:'SIMULATED_MEMORY_METADATA',stagingOnly:true,
 actualPermissionGranted:false,memoryIds:['SYN-MEM-PULSE-A'],
 memoryWrites:0,externalCalls:0
};
function harness({stopped=true,missing=false,stopError=false,auditError=false,
 invalidAuditCount=false,reply=eligible,previewError=false,enabled=true}={}){
 const actions=[];let called=0;
 const sql={begin:async fn=>{
  if(stopError)throw Error('SENSITIVE_DB_ERROR_DO_NOT_LOG');
  return fn({unsafe:async(statement,params)=>{
   actions.push({statement,params});
   if(statement.startsWith('select scope,stopped,version'))
    return missing?[]:[{scope:'synthetic',stopped,version:1}];
   if(statement.startsWith('insert into scotty_p5_synthetic_memory_request_audit')){
    if(auditError)throw Error('SENSITIVE_AUDIT_OUTAGE');
    return {count:invalidAuditCount?0:1};
   }
   throw Error('Unexpected SQL');
  }});
 }};
 const preview=async()=>{called++;if(previewError)throw Error('PRIVATE_SECRET');return reply};
 const guard=createPhase5GuardedSyntheticMemoryPreview({coordinatorSql:sql,preview,enabled});
 return {guard,actions,getCalls:()=>called};
}
test('constructor rejects missing injected services',()=>{
 assert.throws(()=>createPhase5GuardedSyntheticMemoryPreview(),/TRUSTED_SYNTHETIC_MEMORY_GUARD_DEPENDENCIES_REQUIRED/);
});
test('disabled by default denies without external calls',async()=>{
 const h=harness({enabled:false});
 const r=await h.guard({request:{token:'PRIVATE'}});
 assert.equal(r.decision,'DENY');
 assert.equal(r.reason,'PHASE5_MEMORY_IDENTITY_DISABLED');
 assert.equal(r.actualPermissionGranted,false);assert.equal(h.actions.length,0);
 assert.equal(h.getCalls(),0);
});
test('stop active denies without calling memory preview but audits denial',async()=>{
 const h=harness();
 const r=await h.guard({body:{token:'PRIVATE'}});
 assert.equal(r.reason,'SYNTHETIC_MEMORY_STOPPED');
 assert.equal(r.auditPersisted,true);assert.equal(h.getCalls(),0);
 assert.equal(h.actions.length,2);
 assert.deepEqual(h.actions[1].params,['DENY','SYNTHETIC_MEMORY_STOPPED',1]);
});
test('missing stop row denies, auditable',async()=>{
 const h=harness({missing:true});
 const r=await h.guard({});
 assert.equal(r.reason,'SYNTHETIC_MEMORY_STOP_MISSING');
 assert.equal(r.auditPersisted,true);assert.equal(h.getCalls(),0);
 assert.deepEqual(h.actions[1].params,['DENY','SYNTHETIC_MEMORY_STOP_MISSING',null]);
});
test('open stop, synthetic preview and audit are one coordinator transaction',async()=>{
 const h=harness({stopped:false});
 const r=await h.guard({});
 assert.equal(r.decision,'SIMULATED_MEMORY_METADATA');
 assert.equal(r.auditPersisted,true);
 assert.deepEqual(r.memoryIds,['SYN-MEM-PULSE-A']);
 assert.equal(r.actualPermissionGranted,false);assert.equal(h.getCalls(),1);
 assert.match(h.actions[0].statement,/for share/);
 assert.deepEqual(h.actions[1].params,['SIMULATED_MEMORY_METADATA','SYNTHETIC_MEMORY_PREVIEW_OK',1]);
});
test('denied inner identity is durably recorded using controlled reason only',async()=>{
 const h=harness({stopped:false,reply:{decision:'DENY',reason:'SYNTHETIC_AGENT_IDENTITY_REJECTED',actualPermissionGranted:false}});
 const r=await h.guard({});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 assert.deepEqual(h.actions[1].params,['DENY','SYNTHETIC_AGENT_IDENTITY_REJECTED',1]);
});
test('untrusted inner reason cannot be stored or reflected',async()=>{
 const secret='SYN-PRIVATE-PERSONAL-BEARER-NEVER-LOG';
 const h=harness({stopped:false,reply:{decision:'DENY',reason:secret,actualPermissionGranted:false}});
 const r=await h.guard({request:{authorization:secret},memoryId:secret});
 assert.equal(r.reason,'SYNTHETIC_MEMORY_UNEXPECTED_RESPONSE');
 assert.equal(JSON.stringify(h.actions).includes(secret),false);
 assert.equal(JSON.stringify(r).includes(secret),false);
});
test('malformed eligible response cannot bypass audit or grant real access',async()=>{
 const h=harness({stopped:false,reply:{...eligible,actualPermissionGranted:true}});
 const r=await h.guard({});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 assert.equal(r.reason,'SYNTHETIC_MEMORY_UNEXPECTED_RESPONSE');
});
test('out-of-scope record identifiers deny and audit',async()=>{
 const h=harness({stopped:false,reply:{...eligible,memoryIds:['REAL-MEM-001']}});
 const r=await h.guard({});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
});
test('audit failure after memory preview denies and suppresses IDs',async()=>{
 const h=harness({stopped:false,auditError:true});
 const r=await h.guard({});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
 assert.equal(r.memoryIds,undefined);assert.equal(r.actualPermissionGranted,false);
});
test('missing audit confirmation denies and suppresses memory IDs',async()=>{
 const h=harness({stopped:false,invalidAuditCount:true});
 const r=await h.guard({});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
 assert.equal(r.memoryIds,undefined);
});
test('stop lookup outage denies without preview and without false audit success',async()=>{
 const h=harness({stopError:true,stopped:false});
 const r=await h.guard({});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
 assert.equal(h.getCalls(),0);
});
test('inner memory provider failure denies and redacted audit still succeeds',async()=>{
 const h=harness({stopped:false,previewError:true});
 const r=await h.guard({request:{token:'SECRET'}});
 assert.equal(r.reason,'SYNTHETIC_MEMORY_BACKEND_FAILURE');
 assert.equal(r.auditPersisted,true);
 assert.equal(JSON.stringify(h.actions).includes('SECRET'),false);
});
test('malformed preview ID array never returned despite open stop',async()=>{
 const h=harness({stopped:false,reply:{...eligible,memoryIds:'NOT_ARRAY'}});
 const r=await h.guard({});
 assert.equal(r.decision,'DENY');assert.equal(r.memoryIds,undefined);
});
test('no secret, agent ID, project, or token enters redacted audit values',async()=>{
 const secret='SYN-SECRET-CANARY-123';
 const h=harness({stopped:false});
 await h.guard({request:{headers:{authorization:secret}},agentId:secret,projectId:secret,rawToken:secret});
 assert.equal(JSON.stringify(h.actions).includes(secret),false);
});

test('eligible callback extra fields never leak to the caller',async()=>{
 const secret='SYN-NO-LEAK-TOKEN-PAYLOAD';
 const h=harness({stopped:false,reply:{
  ...eligible,token:secret,rawMemoryContent:secret,
  projectSecret:secret,otherMetadata:{password:secret}
 }});
 const r=await h.guard({request:{authorization:secret}});
 assert.equal(r.decision,'SIMULATED_MEMORY_METADATA');
 assert.deepEqual(r.memoryIds,['SYN-MEM-PULSE-A']);
 assert.equal(r.auditPersisted,true);
 assert.equal(JSON.stringify(r).includes(secret),false);
 assert.equal(JSON.stringify(h.actions).includes(secret),false);
});
