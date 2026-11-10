/**
 * Phase 5 guarded memory preview integration, disposable PostgreSQL only.
 * Temporary signing keys, fictional agents, synthetic memory IDs; no live route.
 * Must run after disposable RLS fixture tests, never with SCOTTY databases.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import postgres from 'postgres';
import {createPhase5SyntheticAgentMemoryPreview} from './phase5-agent-memory-identity.mjs';
import {createPhase5GuardedSyntheticMemoryPreview} from './phase5-guarded-memory-preview.mjs';

const DB='scotty_phase5_synthetic_test',NOW=Date.parse('2026-11-09T19:00:00Z');
const checked=(field,role)=>{
 const raw=process.env[field];
 if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!raw)
   throw Error('DISPOSABLE_GUARD_TEST_OPT_IN_REQUIRED');
 const url=new URL(raw);
 if(url.protocol!=='postgres:'||url.hostname!=='127.0.0.1'||url.port!=='5432'||
    url.pathname!=='/'+DB||decodeURIComponent(url.username)!==role||
    !url.password||url.search||url.hash)throw Error('WRONG_DATABASE_TARGET');
 return raw;
};
const admin=postgres(checked('P5_CI_ADMIN_URL','scotty_p5_admin'),{ssl:false,max:3,connect_timeout:5});
const control=postgres(checked('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{ssl:false,max:3,connect_timeout:5});
const pulse=postgres(checked('P5_CI_AGENT_PULSE_URL','scotty_p5_agent_pulse'),{ssl:false,max:2,connect_timeout:5});
const iris=postgres(checked('P5_CI_AGENT_IRIS_URL','scotty_p5_agent_iris'),{ssl:false,max:2,connect_timeout:5});
const other=postgres(checked('P5_CI_AGENT_PULSE_OTHER_URL','scotty_p5_agent_pulse_other'),{ssl:false,max:2,connect_timeout:5});
const all=[admin,control,pulse,iris,other];
const keys=generateKeyPairSync('ed25519');
const issuer='scotty-p5-synthetic-agent-idp';
const keyId='SYN-AGENT-KEY-001',purpose='synthetic-memory:preview';
const header={alg:'EdDSA',typ:'SCOTTY-P5-SYNTHETIC-AGENT',kid:keyId};
const claims={iss:issuer,aud:'scotty-p5-synthetic-memory-preview',
 sub:'agent-creative-pulse',projectId:'synthetic',scope:'individual',
 purpose,jti:'SYN-AGENT-SESSION-GUARD01',iat:Math.floor(NOW/1000)-40,
 nbf:Math.floor(NOW/1000)-40,exp:Math.floor(NOW/1000)+90,version:1};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(c=claims,key=keys.privateKey){
 const msg=b64(header)+'.'+b64(c);
 return msg+'.'+sign(null,Buffer.from(msg),key).toString('base64url');
}
const request=(jwt=token())=>({headers:{get:k=>k==='authorization'?'Bearer '+jwt:null}});
const bindings=[
 {agentId:'agent-creative-pulse',projectId:'synthetic',login:'scotty_p5_agent_pulse',sql:pulse},
 {agentId:'agent-creative-iris',projectId:'synthetic',login:'scotty_p5_agent_iris',sql:iris},
 {agentId:'agent-creative-pulse',projectId:'SYN-PROJECT-OTHER',login:'scotty_p5_agent_pulse_other',sql:other}
];
const buildInner=opts=>createPhase5SyntheticAgentMemoryPreview({
 enabled:true,now:()=>NOW,dbBindings:bindings,
 trustedKeys:{[keyId]:{issuer,active:true,publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'})}},
 isAgentSessionRevoked:async()=>false,verifyActiveAgentMembership:async()=>true,...opts
});
const guard=(inner=buildInner(),enabled=true)=>createPhase5GuardedSyntheticMemoryPreview({
 preview:inner,coordinatorSql:control,enabled
});
const call=(gate,jwt=token(),rest={})=>gate({request:request(jwt),...rest});
async function state(stopped){
 await admin`update scotty_p5_synthetic_emergency_stop
    set stopped=${stopped},version=version+1 where scope='synthetic'`;
}
const latest=()=>admin`select outcome,reason_code,stop_version from
 scotty_p5_synthetic_memory_request_audit order by event_id desc limit 1`;
const total=async()=>Number((await admin`select count(*)::int as n from
 scotty_p5_synthetic_memory_request_audit`)[0].n);

test('Phase 5 synthetic memory: kill switch and audited every guarded attempt',async t=>{
 try{
  assert.equal((await admin`select current_database() as db`)[0].db,DB);
  await state(true);
  await t.test('stopped request is denied and durably audited without metadata',async()=>{
   const before=await total();
   const r=await call(guard());
   assert.equal(r.decision,'DENY');assert.equal(r.reason,'SYNTHETIC_MEMORY_STOPPED');
   assert.equal(r.memoryIds,undefined);assert.equal(r.auditPersisted,true);
   assert.equal(await total(),before+1);
   const audit=await latest();
   assert.deepEqual({outcome:audit[0].outcome,reason:audit[0].reason_code},
      {outcome:'DENY',reason:'SYNTHETIC_MEMORY_STOPPED'});
  });
  await t.test('ordinary runtime cannot write, delete or read the redacted audit table',async()=>{
   await assert.rejects(control`select * from scotty_p5_synthetic_memory_request_audit`,e=>e?.code==='42501');
   await assert.rejects(control`delete from scotty_p5_synthetic_memory_request_audit`,e=>e?.code==='42501');
   await assert.rejects(control`update scotty_p5_synthetic_memory_request_audit set reason_code='SYNTHETIC_MEMORY_STOPPED'`,e=>e?.code==='42501');
  });
  await t.test('opening synthetic stop allows only audited, fictional metadata',async()=>{
   await state(false);
   const before=await total();
   const r=await call(guard());
   assert.equal(r.decision,'SIMULATED_MEMORY_METADATA');
   assert.deepEqual(r.memoryIds,['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
   assert.equal(r.auditPersisted,true);assert.equal(r.actualPermissionGranted,false);
   assert.equal(await total(),before+1);
   assert.equal((await latest())[0].reason_code,'SYNTHETIC_MEMORY_PREVIEW_OK');
  });
  await t.test('forged session is denied and stored without raw credentials',async()=>{
   const before=await total();
   const wrong=generateKeyPairSync('ed25519');
   const r=await call(guard(),token(claims,wrong.privateKey),{projectId:'PRIVATE-CANARY-DO-NOT-LOG'});
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
   assert.equal(r.memoryIds,undefined);assert.equal(await total(),before+1);
   const audit=await latest();
   assert.equal(audit[0].reason_code,'SYNTHETIC_AGENT_IDENTITY_REJECTED');
   const columns=await admin`select column_name from information_schema.columns where table_name='scotty_p5_synthetic_memory_request_audit'`;
   const fields=columns.map(x=>x.column_name);
   assert.ok(!fields.includes('token')&&!fields.includes('agent_id')&&
     !fields.includes('memory_id')&&!fields.includes('project_id'));
  });
  await t.test('cross-agent claim is rejected and audited',async()=>{
   const before=await total();
   const r=await call(guard(),token(),{agentId:'agent-creative-iris'});
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
   assert.equal(await total(),before+1);
  });
  await t.test('revoked agent session is denied and audited',async()=>{
   const before=await total();
   const r=await call(guard(buildInner({isAgentSessionRevoked:async()=>true})));
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
   assert.equal(await total(),before+1);
  });
  await t.test('audit INSERT outage fails closed even for otherwise eligible preview',async()=>{
   const before=await total();
   await admin.unsafe('revoke insert on table scotty_p5_synthetic_memory_request_audit from scotty_p5_runtime');
   try{
    const r=await call(guard());
    assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
    assert.equal(r.memoryIds,undefined);assert.equal(r.actualPermissionGranted,false);
    assert.equal(await total(),before);
   }finally{
    await admin.unsafe('grant insert on table scotty_p5_synthetic_memory_request_audit to scotty_p5_runtime');
   }
  });
  await t.test('stopping immediately blocks subsequent guarded request across pools',async()=>{
   await state(true);
   const r=await call(guard());
   assert.equal(r.reason,'SYNTHETIC_MEMORY_STOPPED');
   assert.equal(r.memoryIds,undefined);assert.equal(r.auditPersisted,true);
  });
  await t.test('administrative stop update cannot pass held preview FOR SHARE lock',async()=>{
   await state(false);
   let release,entered;
   const gateEntered=new Promise(resolve=>{entered=resolve});
   const resume=new Promise(resolve=>{release=resolve});
   const blockingInner=async input=>{
    entered();
    await resume;
    return buildInner()(input);
   };
   const pending=call(guard(blockingInner));
   try{
    await gateEntered; // guarded request holds FOR SHARE on stop row
    await assert.rejects(admin.begin(async tx=>{
      await tx`set local lock_timeout='100ms'`;
      await tx`update scotty_p5_synthetic_emergency_stop set stopped=true where scope='synthetic'`;
    }),e=>e?.code==='55P03');
   }finally{release?.();}
   const r=await pending;
   assert.equal(r.decision,'SIMULATED_MEMORY_METADATA');
   assert.equal(r.auditPersisted,true);
   await state(true);
  });
  await t.test('missing stop row still creates a redacted DENY audit record',async()=>{
   const before=await total();
   await admin`delete from scotty_p5_synthetic_emergency_stop where scope='synthetic'`;
   try{
    const r=await call(guard());
    assert.equal(r.reason,'SYNTHETIC_MEMORY_STOP_MISSING');
    assert.equal(r.auditPersisted,true);assert.equal(await total(),before+1);
   }finally{
    await admin`insert into scotty_p5_synthetic_emergency_stop(scope,stopped) values('synthetic',true)`;
   }
  });
  await t.test('disabled wrapper never produces metadata or claims audit persistence',async()=>{
   const before=await total();
   const r=await call(guard(buildInner(),false));
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
   assert.equal(await total(),before);
  });
  await t.test('cross-project signed request uses scoped RLS and one redacted audit',async()=>{
   await state(false);
   const before=await total();
   const otherToken=token({...claims,projectId:'SYN-PROJECT-OTHER',jti:'SYN-AGENT-SESSION-GUARDOTHER'});
   const r=await call(guard(),otherToken);
   assert.deepEqual(r.memoryIds,['SYN-MEM-PULSE-OTHER']);
   assert.equal(r.auditPersisted,true);
   assert.equal(await total(),before+1);
   await state(true);
  });
 }finally{
  await Promise.allSettled([state(true),...all.map(x=>x.end({timeout:5}))]);
 }
});
