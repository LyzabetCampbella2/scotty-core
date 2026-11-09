/**
 * Real disposable PostgreSQL integration ONLY; no live identities, no secrets.
 * Uses exact loopback fixture roles created by the GitHub Actions service job.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {createPhase5DenialAuditBoundary} from './phase5-denial-audit.mjs';
import {createPhase5SyntheticPostgresGate} from './phase5-synthetic-postgres-gate.mjs';
const DATABASE='scotty_phase5_synthetic_test';
function checked(name,role) {
 const value=process.env[name];
 if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!value)
   throw Error('DISPOSABLE_DATABASE_OPT_IN_REQUIRED');
 const u=new URL(value);
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/'+DATABASE||decodeURIComponent(u.username)!==role||
    !u.password||u.search||u.hash)throw Error('REFUSING_NON_SYNTHETIC_DATABASE');
 return value;
}
const admin=postgres(checked('P5_CI_ADMIN_URL','scotty_p5_admin'),{ssl:false,max:2,connect_timeout:5});
const runtime=postgres(checked('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{ssl:false,max:4,connect_timeout:5});
const runtime2=postgres(checked('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{ssl:false,max:4,connect_timeout:5});
const req={method:'GET',headers:{get:k=>({host:'scotty.example',origin:'https://scotty.example'})[k]??null}};
const payload={request:req,projectId:'synthetic',resourceProjectId:'synthetic',resourceId:'SYN-BRIEF-001',
 action:'memory:read',grantId:'SYN-GRANT-P5SQL-001',nonce:'SYN-NONCE-AUDIT123456',
 dataClass:'synthetic-only'};
function audited(sql=runtime,enabled=true){
 const gate=createPhase5SyntheticPostgresGate({
  sql,enabled:true,verifyOwnerSession:async()=>false,
  loadAuthorizedProjectIds:async()=>['synthetic'],
  newId:()=> 'SYN-ID',verifyGrantProof:async()=>false,
  now:()=>Date.parse('2026-11-09T16:00:00Z')
 });
 return createPhase5DenialAuditBoundary({gate,sql,enabled});
}
async function count(){const rows=await admin`select count(*)::int as n from scotty_p5_synthetic_denial_audit`;return rows[0].n;}
test('denial audit persists on separate disposable PostgreSQL and is insert-only',async t=>{
 try{
  assert.equal((await admin`select current_database() as db`)[0].db,DATABASE);
  const before=await count();
  await t.test('memory denial writes one persistent redacted row',async()=>{
   const r=await audited()({...payload,nonce:'SYNTHETIC_SECRET_CANARY_TOKEN_742',body:{password:'SYNTHETIC_SECRET_CANARY_TOKEN_742'}});
   assert.equal(r.decision,'DENY');assert.equal(r.reason,'ACTION_NOT_ALLOWED');assert.equal(r.denialAuditPersisted,true);
   assert.equal(await count(),before+1);
   const rows=await admin`select outcome,reason_code,action_category from scotty_p5_synthetic_denial_audit order by event_id desc limit 1`;
   assert.deepEqual({...rows[0]},{outcome:'DENY',reason_code:'ACTION_NOT_ALLOWED',action_category:'OTHER'});
   assert.equal(JSON.stringify(rows).includes('CANARY'),false);
  });
  await t.test('concurrent denials from two connection pools append separately',async()=>{
   const start=await count();
   const results=await Promise.all(Array.from({length:6},(_,i)=>audited(i%2?runtime:runtime2)({...payload,nonce:'SYN-NONCE-REDACT-'+i})));
   assert.equal(results.filter(x=>x.decision==='DENY'&&x.denialAuditPersisted===true).length,6);
   assert.equal(await count(),start+6);
  });
  await t.test('runtime cannot read, delete or overwrite the denied-request audit',async()=>{
   await assert.rejects(runtime`select * from scotty_p5_synthetic_denial_audit limit 1`,e=>e?.code==='42501');
   await assert.rejects(runtime`delete from scotty_p5_synthetic_denial_audit`,e=>e?.code==='42501');
   await assert.rejects(runtime`update scotty_p5_synthetic_denial_audit set reason_code='HACKED'`,e=>e?.code==='42501');
  });
  await t.test('revoked INSERT privilege fails closed and does not invent audit evidence',async()=>{
   const prior=await count();
   await admin.unsafe('revoke insert on table scotty_p5_synthetic_denial_audit from scotty_p5_runtime');
   try{
    const r=await audited()({...payload,nonce:'SYN-NONCE-REVOKEAUDIT'});
    assert.equal(r.decision,'DENY');assert.equal(r.denialAuditPersisted,false);assert.equal(await count(),prior);
   }finally{
    await admin.unsafe('grant insert on table scotty_p5_synthetic_denial_audit to scotty_p5_runtime');
   }
  });
  await t.test('deny returns safe result even with malformed request secrets',async()=>{
   const r=await audited()({...payload,action:'knowledge:propose',request:null,body:{bearer:'SYNTHETIC_SECRET_CANARY_TOKEN_742'}});
   assert.equal(r.decision,'DENY');assert.equal(r.denialAuditPersisted,true);
   const last=await admin`select reason_code,action_category from scotty_p5_synthetic_denial_audit order by event_id desc limit 1`;
   assert.deepEqual({...last[0]},{reason_code:'UNSAFE_HTTP_REQUEST',action_category:'KNOWLEDGE_PROPOSE'});
   assert.equal(JSON.stringify(last).includes('CANARY'),false);
  });
  await t.test('disabled wrapper never writes to database',async()=>{
   const beforeDisabled=await count();
   const r=await audited(runtime,false)({...payload});
   assert.equal(r.reason,'PHASE5_DISABLED_BY_DEFAULT');assert.equal(r.denialAuditPersisted,false);
   assert.equal(await count(),beforeDisabled);
  });
 }finally{await Promise.allSettled([admin.end({timeout:5}),runtime.end({timeout:5}),runtime2.end({timeout:5})]);}
});
