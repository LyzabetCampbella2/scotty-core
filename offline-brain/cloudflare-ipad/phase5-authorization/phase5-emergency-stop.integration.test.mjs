/** Synthetic kill-switch tests; disposable PostgreSQL only; never live agent traffic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {createPhase5SyntheticPostgresGate} from './phase5-synthetic-postgres-gate.mjs';

const DATABASE='scotty_phase5_synthetic_test';
const NOW=Date.parse('2026-11-09T16:00:00Z');
const GRANT='SYN-GRANT-STOP-001';
const RESOURCE='SYN-BRIEF-STOP-001';
function disposableUrl(env,user){
 const raw=process.env[env];
 if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!raw)
  throw Error('DISPOSABLE_PG_TEST_OPT_IN_REQUIRED');
 const u=new URL(raw);
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
   u.pathname!=='/'+DATABASE||decodeURIComponent(u.username)!==user||
   !u.password||u.search||u.hash)throw Error('REFUSING_NON_SYNTHETIC_DB');
 return raw;
}
const admin=postgres(disposableUrl('P5_CI_ADMIN_URL','scotty_p5_admin'),{max:3,ssl:false,connect_timeout:5});
const runtime=postgres(disposableUrl('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{max:4,ssl:false,connect_timeout:5});
const runtime2=postgres(disposableUrl('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{max:3,ssl:false,connect_timeout:5});
const request={method:'GET',headers:{get:k=>({host:'scotty.example',origin:'https://scotty.example'})[k]??null}};
const base={request,projectId:'synthetic',resourceProjectId:'synthetic',resourceId:RESOURCE,
 action:'workspace:read',dataClass:'synthetic-only',grantId:GRANT};
const gate=(sql=runtime)=>createPhase5SyntheticPostgresGate({sql,enabled:true,requireEmergencyStop:true,
 now:()=>NOW,verifyOwnerSession:async()=>true,loadAuthorizedProjectIds:async()=>['synthetic'],
 newId:()=> 'SYN-ONLY',verifyGrantProof:async()=>true});
async function nonceCount(nonce){
 const x=await admin`select count(*)::int as n from scotty_p5_synthetic_nonce_claims where grant_id=${GRANT} and nonce=${nonce}`;
 return x[0].n;
}
async function switchState(stopped){
 await admin`update scotty_p5_synthetic_emergency_stop
  set stopped=${stopped},version=version+1,changed_at=now() where scope='synthetic'`;
}
const run=(nonce,sql=runtime)=>gate(sql)({...base,nonce});
test('Phase 0 emergency stop is default-deny and serializes with grant decisions',async t=>{
 try{
  const db=await admin`select current_database() as db`;
  assert.equal(db[0].db,DATABASE);
  await admin`insert into scotty_p5_synthetic_grants
   (grant_id,subject,project_id,resource_project_id,resource_id,action,data_class,grant_version,state,revoked,expires_at,proof_digest)
   values (${GRANT},'owner','synthetic','synthetic',${RESOURCE},'workspace:read','synthetic-only',1,
    'synthetic-approved',false,${new Date(NOW+3600000)},'FICTIONAL_STOP_TEST_ONLY')`;

  await t.test('new emergency control is STOPPED by default and does not reserve nonce',async()=>{
   const state=await admin`select stopped from scotty_p5_synthetic_emergency_stop where scope='synthetic'`;
   assert.equal(state[0].stopped,true);
   const n='SYN-NONCE-STOP-DEFAULT01';
   const res=await run(n);
   assert.equal(res.reason,'EMERGENCY_STOP_ACTIVE_OR_UNAVAILABLE');
   assert.equal(res.actualPermissionGranted,false);
   assert.equal(await nonceCount(n),0);
  });
  await t.test('runtime cannot disable or modify the stop flag',async()=>{
   await assert.rejects(runtime`update scotty_p5_synthetic_emergency_stop set stopped=false where scope='synthetic'`,
     e=>e?.code==='42501');
   await assert.rejects(runtime`update scotty_p5_synthetic_emergency_stop set version=version+1 where scope='synthetic'`,
     e=>e?.code==='42501');
   await assert.rejects(runtime`update scotty_p5_synthetic_emergency_stop set lock_pad=true where scope='synthetic'`,
     e=>e?.code==='23514');
   const x=await admin`select stopped from scotty_p5_synthetic_emergency_stop where scope='synthetic'`;
   assert.equal(x[0].stopped,true);
  });
  await t.test('authorized disposable admin can open test-only control for a preview',async()=>{
   await switchState(false);
   const n='SYN-NONCE-STOP-OPEN0001';
   const res=await run(n);
   assert.equal(res.decision,'SIMULATED_ELIGIBLE');
   assert.equal(res.actualPermissionGranted,false);
   assert.equal(await nonceCount(n),1);
  });
  await t.test('stopping immediately denies later independent runtime connections',async()=>{
   await switchState(true);
   const n='SYN-NONCE-STOP-REVOKED1';
   const res=await run(n,runtime2);
   assert.equal(res.reason,'EMERGENCY_STOP_ACTIVE_OR_UNAVAILABLE');
   assert.equal(await nonceCount(n),0);
  });
  await t.test('missing stop row fails closed, then restore stopped row',async()=>{
   await admin`delete from scotty_p5_synthetic_emergency_stop where scope='synthetic'`;
   try{
    const n='SYN-NONCE-STOP-NOROW0001';
    const res=await run(n);
    assert.equal(res.reason,'EMERGENCY_STOP_ACTIVE_OR_UNAVAILABLE');
    assert.equal(await nonceCount(n),0);
   }finally{
    await admin`insert into scotty_p5_synthetic_emergency_stop(scope,stopped)
      values('synthetic',true)`;
   }
  });
  await t.test('stop update waiting in transaction blocks an in-flight decision before it can read grant',async()=>{
   await switchState(false);
   let releaseStop;
   const ready=new Promise(resolve=>{
    releaseStop=resolve;
   });
   let updating;
   let updateStarted;
   const started=new Promise(resolve=>{updateStarted=resolve;});
   try{
    updating=admin.begin(async tx=>{
     await tx`update scotty_p5_synthetic_emergency_stop
      set stopped=true,version=version+1 where scope='synthetic'`;
     updateStarted();
     await ready;
    });
    await started;
    const n='SYN-NONCE-STOP-RACE00001';
    const pending=run(n,runtime2);
    releaseStop();
    await updating;
    const res=await pending;
    assert.equal(res.reason,'EMERGENCY_STOP_ACTIVE_OR_UNAVAILABLE');
    assert.equal(await nonceCount(n),0);
   }finally{
    releaseStop?.();
    if(updating)await updating.catch(()=>{});
    await switchState(true);
   }
  });
  await t.test('revocation remains durable across separate connections',async()=>{
   const r=await runtime2`select stopped,version from scotty_p5_synthetic_emergency_stop where scope='synthetic'`;
   assert.equal(r[0].stopped,true);
   assert.ok(Number(r[0].version)>1);
  });
 }finally{
  await Promise.allSettled([switchState(true),admin.end({timeout:5}),runtime.end({timeout:5}),runtime2.end({timeout:5})]);
 }
});
