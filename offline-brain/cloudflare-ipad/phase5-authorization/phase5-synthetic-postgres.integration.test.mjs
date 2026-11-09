/**
 * INTEGRATION TEST ONLY: disposable local PostgreSQL service, no real accounts.
 * Never run with DATABASE_URL or non-loopback hosts. Requires exact CI opt-in.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {createPhase5SyntheticPostgresGate} from './phase5-synthetic-postgres-gate.mjs';

const DATABASE='scotty_phase5_synthetic_test';
const FIXED_NOW=Date.parse('2026-11-09T16:00:00Z');
const EXPIRY=new Date(FIXED_NOW+3_600_000);
const GRANT='SYN-GRANT-P5SQL-001';
const AUDIT_GRANT='SYN-GRANT-P5SQL-AUDIT';
const request={method:'GET',headers:{get:k=>({host:'scotty.example',origin:'https://scotty.example'})[k]??null}};
const base={request,projectId:'synthetic',resourceProjectId:'synthetic',resourceId:'SYN-BRIEF-001',action:'workspace:read',dataClass:'synthetic-only',grantId:GRANT};
const fakeProof=async()=>true; // NOT a valid real owner signature. Simulation only.
function checkedUrl(name,expectedUser) {
  const value=process.env[name];
  if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!value)
    throw Error('DISPOSABLE_POSTGRES_EXPLICIT_OPT_IN_REQUIRED');
  const parsed=new URL(value);
  if(parsed.protocol!=='postgres:'||parsed.hostname!=='127.0.0.1'||parsed.port!=='5432'||
     parsed.pathname!=='/'+DATABASE||decodeURIComponent(parsed.username)!==expectedUser||
     !parsed.password||parsed.search||parsed.hash)
    throw Error('REFUSING_UNKNOWN_POSTGRES_TARGET');
  return value;
}
const adminUrl=checkedUrl('P5_CI_ADMIN_URL','scotty_p5_admin');
const runtimeUrl=checkedUrl('P5_CI_RUNTIME_URL','scotty_p5_runtime');
const admin=postgres(adminUrl,{ssl:false,max:3,connect_timeout:5});
const runtime=postgres(runtimeUrl,{ssl:false,max:6,connect_timeout:5});
const runtimeOther=postgres(runtimeUrl,{ssl:false,max:4,connect_timeout:5});
const gate=(sql=runtime,custom={})=>createPhase5SyntheticPostgresGate({
  sql,enabled:true,verifyOwnerSession:async()=>true,loadAuthorizedProjectIds:async()=>['synthetic'],
  newId:()=> 'SYN-ONLY',verifyGrantProof:fakeProof,now:()=>FIXED_NOW,...custom
});
async function addGrant(id=GRANT,resource='SYN-BRIEF-001'){
  await admin`insert into scotty_p5_synthetic_grants
    (grant_id,subject,project_id,resource_project_id,resource_id,action,data_class,grant_version,state,revoked,expires_at,proof_digest)
    values (${id},'owner','synthetic','synthetic',${resource},'workspace:read','synthetic-only',1,'synthetic-approved',false,${EXPIRY},'FICTIONAL_PROOF_NOT_SIGNED')`;
}
async function nonceCount(nonce,grantId=GRANT){
  const r=await admin`select count(*)::int as n from scotty_p5_synthetic_nonce_claims where grant_id=${grantId} and nonce=${nonce}`;
  return r[0].n;
}
async function auditCount(resource='SYN-BRIEF-001'){
  const r=await admin`select count(*)::int as n from scotty_p5_synthetic_audit where resource_id=${resource}`;
  return r[0].n;
}

test('disposable PostgreSQL: real transaction and runtime privilege suite',async t=>{
  try{
    const a=await admin`select current_database() as name, current_user as role`;
    const u=await runtime`select current_database() as name, current_user as role`;
    assert.equal(a[0].name,DATABASE);assert.equal(a[0].role,'scotty_p5_admin');
    assert.equal(u[0].name,DATABASE);assert.equal(u[0].role,'scotty_p5_runtime');
    await addGrant();
    await t.test('preview creates one committed nonce and one audit row',async()=>{
      const nonce='SYN-NONCE-SQL-VALID001';
      const result=await gate()({...base,nonce});
      assert.equal(result.decision,'SIMULATED_ELIGIBLE');assert.equal(result.actualPermissionGranted,false);
      assert.equal(await nonceCount(nonce),1);assert.equal(await auditCount(),1);
    });
    await t.test('repeated nonce fails across independently pooled clients',async()=>{
      const nonce='SYN-NONCE-SQL-VALID001';
      const r=await gate(runtimeOther)({...base,nonce});
      assert.equal(r.decision,'DENY');assert.equal(r.reason,'NONCE_REPLAY_OR_STORE_FAILURE');
      assert.equal(await nonceCount(nonce),1);assert.equal(await auditCount(),1);
    });
    await t.test('eight concurrent requests across two client pools commit only once',async()=>{
      const nonce='SYN-NONCE-SQL-CONCURRENT01';
      const requests=Array.from({length:8},(_,i)=>gate(i%2?runtime:runtimeOther)({...base,nonce}));
      const out=await Promise.all(requests);
      assert.equal(out.filter(x=>x.decision==='SIMULATED_ELIGIBLE').length,1);
      assert.equal(out.filter(x=>x.reason==='NONCE_REPLAY_OR_STORE_FAILURE').length,7);
      assert.equal(await nonceCount(nonce),1);assert.equal(await auditCount(),2);
    });
    await t.test('runtime cannot modify the authoritative grant table',async()=>{
      await assert.rejects(runtime`update scotty_p5_synthetic_grants set revoked=true where grant_id=${GRANT}`,
        e=>e?.code==='42501');
      const g=await admin`select revoked from scotty_p5_synthetic_grants where grant_id=${GRANT}`;
      assert.equal(g[0].revoked,false);
    });
    await t.test('cross-project resource is rejected before nonce reservation',async()=>{
      const nonce='SYN-NONCE-SQL-CROSSPROJ1';
      const r=await gate()({...base,nonce,resourceProjectId:'other-project'});
      assert.equal(r.reason,'PROJECT_SCOPE_MISMATCH');assert.equal(await nonceCount(nonce),0);
    });
    await t.test('wrong resource denied even with a known grant',async()=>{
      const nonce='SYN-NONCE-SQL-WRONGRESOURCE';
      const r=await gate()({...base,nonce,resourceId:'SYN-BRIEF-OTHER'});
      assert.equal(r.reason,'GRANT_INVALID_OR_REVOKED');assert.equal(await nonceCount(nonce),0);
    });
    await t.test('revocation commits and immediately blocks subsequent requests',async()=>{
      await admin`update scotty_p5_synthetic_grants set revoked=true,state='synthetic-revoked' where grant_id=${GRANT}`;
      const nonce='SYN-NONCE-SQL-REVOKED01';
      const r=await gate(runtimeOther)({...base,nonce});
      assert.equal(r.reason,'GRANT_INVALID_OR_REVOKED');assert.equal(await nonceCount(nonce),0);
      await admin`update scotty_p5_synthetic_grants set revoked=false,state='synthetic-approved' where grant_id=${GRANT}`;
    });
    await t.test('expired grants cannot be used',async()=>{
      await admin`update scotty_p5_synthetic_grants set expires_at=${new Date(FIXED_NOW-1000)} where grant_id=${GRANT}`;
      const nonce='SYN-NONCE-SQL-EXPIRED01';
      const r=await gate()({...base,nonce});
      assert.equal(r.reason,'GRANT_INVALID_OR_REVOKED');assert.equal(await nonceCount(nonce),0);
      await admin`update scotty_p5_synthetic_grants set expires_at=${EXPIRY} where grant_id=${GRANT}`;
    });
    await t.test('failed audit rolls back nonce claim; retry is possible',async()=>{
      const resource='SYN-BRIEF-AUDITFAIL',nonce='SYN-NONCE-SQL-ROLLBACK01';
      await addGrant(AUDIT_GRANT,resource);
      await admin.unsafe("create function scotty_p5_test_fail_audit() returns trigger language plpgsql as $$ begin if NEW.resource_id='SYN-BRIEF-AUDITFAIL' then raise exception 'DISPOSABLE_FAULT_INJECTION'; end if; return NEW; end $$");
      await admin.unsafe('create trigger scotty_p5_test_audit_fault before insert on scotty_p5_synthetic_audit for each row execute function scotty_p5_test_fail_audit()');
      try{
        const r=await gate()({...base,grantId:AUDIT_GRANT,resourceId:resource,nonce});
        assert.equal(r.reason,'TRANSACTION_OR_AUDIT_UNAVAILABLE');
        assert.equal(await nonceCount(nonce,AUDIT_GRANT),0);assert.equal(await auditCount(resource),0);
      }finally{
        await admin.unsafe('drop trigger if exists scotty_p5_test_audit_fault on scotty_p5_synthetic_audit');
        await admin.unsafe('drop function if exists scotty_p5_test_fail_audit()');
      }
      const retry=await gate(runtimeOther)({...base,grantId:AUDIT_GRANT,resourceId:resource,nonce});
      assert.equal(retry.decision,'SIMULATED_ELIGIBLE');
      assert.equal(await nonceCount(nonce,AUDIT_GRANT),1);assert.equal(await auditCount(resource),1);
    });
    await t.test('invalid owner verification fails closed before database mutation',async()=>{
      const nonce='SYN-NONCE-SQL-OWNERFAIL1';
      const r=await gate(runtime,{verifyOwnerSession:async()=>false})({...base,nonce});
      assert.equal(r.reason,'OWNER_AUTHENTICATION_FAILED');assert.equal(await nonceCount(nonce),0);
    });
    await t.test('publishing memory production and paid calls stay blocked',async()=>{
      const nonce='SYN-NONCE-SQL-BLOCKEDACT1';
      for(const action of ['memory:read','memory:write','social:publish','outreach:send','ai:paid-call','production:read']){
        const r=await gate()({...base,nonce,action});
        assert.equal(r.reason,'ACTION_NOT_ALLOWED');
      }
      assert.equal(await nonceCount(nonce),0);
    });
    await t.test('there are no actual access grants, agent executions or resource reads',()=>{
      assert.equal(typeof gate(),'function');
      // These tests only call the synthetic decision module. No resource resolver is installed.
      assert.equal(base.dataClass,'synthetic-only');
    });
  }finally{
    await Promise.allSettled([admin.end({timeout:5}),runtime.end({timeout:5}),runtimeOther.end({timeout:5})]);
  }
});
