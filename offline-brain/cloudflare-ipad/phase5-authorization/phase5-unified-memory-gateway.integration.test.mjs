/**
 * Synthetic ONLY. Exercises the ONE entrypoint against PostgreSQL's RLS,
 * stopped-by-default switch and append-only redacted request audit.
 * This runs in the ephemeral GitHub Actions service, never SCOTTY production.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import postgres from 'postgres';
import {createPhase5SyntheticMemoryGateway} from './phase5-unified-memory-gateway.mjs';

const DB='scotty_phase5_synthetic_test';
const NOW=Date.parse('2026-11-09T19:00:00Z');
function checked(field,user){
 const raw=process.env[field];
 if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!raw)
   throw Error('DISPOSABLE_PG_OPT_IN_REQUIRED');
 const u=new URL(raw);
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/'+DB||decodeURIComponent(u.username)!==user||!u.password||u.search||u.hash)
   throw Error('REFUSING_NON_DISPOSABLE_DATABASE');
 return raw;
}
const admin=postgres(checked('P5_CI_ADMIN_URL','scotty_p5_admin'),{ssl:false,max:2,connect_timeout:5});
const control=postgres(checked('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{ssl:false,max:3,connect_timeout:5});
const pulse=postgres(checked('P5_CI_AGENT_PULSE_URL','scotty_p5_agent_pulse'),{ssl:false,max:2,connect_timeout:5});
const iris=postgres(checked('P5_CI_AGENT_IRIS_URL','scotty_p5_agent_iris'),{ssl:false,max:2,connect_timeout:5});
const other=postgres(checked('P5_CI_AGENT_PULSE_OTHER_URL','scotty_p5_agent_pulse_other'),{ssl:false,max:2,connect_timeout:5});
const dbs=[admin,control,pulse,iris,other];
const key=generateKeyPairSync('ed25519'),wrong=generateKeyPairSync('ed25519');
const issuer='scotty-p5-synthetic-agent-idp',action='synthetic-memory:preview';
const kid='SYN-AGENT-KEY-001';
const header={alg:'EdDSA',typ:'SCOTTY-P5-SYNTHETIC-AGENT',kid};
const claims={
 iss:issuer,aud:'scotty-p5-synthetic-memory-preview',
 sub:'agent-creative-pulse',projectId:'synthetic',
 scope:'individual',purpose:action,jti:'SYN-AGENT-SESSION-UNIFIED001',
 iat:Math.floor(NOW/1000)-60,nbf:Math.floor(NOW/1000)-60,
 exp:Math.floor(NOW/1000)+90,version:1
};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=(body=claims,privateKey=key.privateKey)=>{
 const data=b64(header)+'.'+b64(body);
 return data+'.'+sign(null,Buffer.from(data),privateKey).toString('base64url');
};
const req=(jwt=token())=>({headers:{get:k=>k==='authorization'?'Bearer '+jwt:null}});
const bindings=[
 {agentId:'agent-creative-pulse',projectId:'synthetic',login:'scotty_p5_agent_pulse',sql:pulse},
 {agentId:'agent-creative-iris',projectId:'synthetic',login:'scotty_p5_agent_iris',sql:iris},
 {agentId:'agent-creative-pulse',projectId:'SYN-PROJECT-OTHER',login:'scotty_p5_agent_pulse_other',sql:other}
];
const make=({enabled=true,revoked=false,inactive=false}={})=>
 createPhase5SyntheticMemoryGateway({
  enabled,now:()=>NOW,coordinatorSql:control,dbBindings:bindings,
  trustedKeys:{[kid]:{issuer,active:true,
   publicKeyPem:key.publicKey.export({type:'spki',format:'pem'})}},
  isAgentSessionRevoked:async()=>revoked,
  verifyActiveAgentMembership:async()=>!inactive
 });
const execute=(gateway=make(),jwt=token(),props={})=>gateway.execute({
 request:req(jwt),action,...props
});
const auditCount=async()=>Number((await admin`
 select count(*)::int as n from scotty_p5_synthetic_memory_request_audit`)[0].n);
const stop=async stopped=>admin`update scotty_p5_synthetic_emergency_stop
 set stopped=${stopped},version=version+1 where scope='synthetic'`;

test('unified synthetic gateway: signed session, RLS, stop and durable audit',async t=>{
 try{
  assert.equal((await admin`select current_database() as db`)[0].db,DB);
  assert.equal((await admin`select count(*)::int as n from scotty_p5_synthetic_memory_items`)[0].n,4);
  const gateway=make();
  await stop(true);
  await t.test('stopped request cannot read memory but has redacted denial audit',async()=>{
   const count=await auditCount();
   const r=await execute(gateway);
   assert.equal(r.decision,'DENY');assert.equal(r.reason,'SYNTHETIC_MEMORY_STOPPED');
   assert.equal(r.memoryIds,undefined);assert.equal(r.auditPersisted,true);
   assert.equal(await auditCount(),count+1);
  });
  await t.test('non-public gateway cannot expose lower-level preview methods',async()=>{
   assert.deepEqual(Object.keys(gateway),['execute']);assert.ok(Object.isFrozen(gateway));
   assert.equal(gateway.preview,undefined);assert.equal(gateway.sql,undefined);
  });
  await t.test('signed synthetic agent can preview ONLY IDs and only with open stop and committed audit',async()=>{
   await stop(false);const before=await auditCount();
   const r=await execute(gateway);
   assert.equal(r.decision,'SIMULATED_MEMORY_METADATA');
   assert.deepEqual(r.memoryIds,['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
   assert.equal(r.actualPermissionGranted,false);assert.equal(r.auditPersisted,true);
   assert.equal(await auditCount(),before+1);
  });
  await t.test('forged signed session denied with redacted audit',async()=>{
   const before=await auditCount();
   const r=await execute(gateway,token(claims,wrong.privateKey));
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
   assert.equal(r.memoryIds,undefined);assert.equal(await auditCount(),before+1);
   const last=await admin`select outcome,reason_code from scotty_p5_synthetic_memory_request_audit order by event_id desc limit 1`;
   assert.deepEqual({...last[0]},{outcome:'DENY',reason_code:'SYNTHETIC_AGENT_IDENTITY_REJECTED'});
  });
  await t.test('unsupported action, arbitrary flags and another agent are audited denials',async()=>{
   const before=await auditCount();
   const attempts=[{action:'memory:read'},{disableStop:true},{disableAudit:true},{agentId:'agent-creative-iris'}];
   for(const input of attempts){
    const r=await execute(gateway,token(),input);
    assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
   }
   assert.equal(await auditCount(),before+4);
  });
  await t.test('signed Iris and other project Pulse remain isolated while guarded',async()=>{
   const irisToken=token({...claims,sub:'agent-creative-iris',jti:'SYN-AGENT-SESSION-UNIFIEDIRIS'});
   const otherToken=token({...claims,projectId:'SYN-PROJECT-OTHER',jti:'SYN-AGENT-SESSION-UNIFIEDOTHER'});
   const results=await Promise.all([execute(gateway,irisToken),execute(gateway,otherToken)]);
   assert.deepEqual(results.map(r=>r.memoryIds),[['SYN-MEM-IRIS-A'],['SYN-MEM-PULSE-OTHER']]);
   assert.ok(results.every(r=>r.auditPersisted===true&&r.actualPermissionGranted===false));
  });
  await t.test('revoked and inactive sessions both deny and produce audited decisions',async()=>{
   const before=await auditCount();
   const results=await Promise.all([execute(make({revoked:true})),execute(make({inactive:true}))]);
   assert.ok(results.every(r=>r.decision==='DENY'&&r.auditPersisted===true));
   assert.equal(await auditCount(),before+2);
  });
  await t.test('audit insertion privilege outage suppresses memory IDs and real grants',async()=>{
   const prior=await auditCount();
   await admin.unsafe('revoke insert on table scotty_p5_synthetic_memory_request_audit from scotty_p5_runtime');
   try{
    const r=await execute(gateway);
    assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
    assert.equal(r.memoryIds,undefined);assert.equal(r.actualPermissionGranted,false);
    assert.equal(await auditCount(),prior);
   }finally{
    await admin.unsafe('grant insert on table scotty_p5_synthetic_memory_request_audit to scotty_p5_runtime');
   }
  });
  await t.test('disabling wrapper denies without an audit claim',async()=>{
   const prior=await auditCount();
   const r=await execute(make({enabled:false}));
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
   assert.equal(await auditCount(),prior);
  });
  await t.test('emergency stop re-engaged blocks subsequent guarded previews',async()=>{
   await stop(true);const r=await execute(gateway);
   assert.equal(r.reason,'SYNTHETIC_MEMORY_STOPPED');assert.equal(r.memoryIds,undefined);
   assert.equal(r.auditPersisted,true);
  });
  await t.test('redacted audit schema lacks credential/identity/memory columns',async()=>{
   const columns=(await admin`select column_name from information_schema.columns
    where table_name='scotty_p5_synthetic_memory_request_audit'`).map(x=>x.column_name);
   for(const forbidden of ['token','agent_id','project_id','memory_id','request_body','authorization']){
    assert.ok(!columns.includes(forbidden));
   }
  });
 }finally{
  await Promise.allSettled([stop(true),...dbs.map(d=>d.end({timeout:5}))]);
 }
});
