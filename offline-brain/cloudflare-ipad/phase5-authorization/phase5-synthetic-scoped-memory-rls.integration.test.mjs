/**
 * Real disposable PostgreSQL 16 tests for scoped synthetic memory RLS.
 * No live agents, personal memory, genuine owner grants, or external systems.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,verify} from 'node:crypto';
import postgres from 'postgres';
import {canonicalPhase5SyntheticConsent} from './phase5-object-consent-review.mjs';
const DB='scotty_phase5_synthetic_test';
const NOW=Date.now();
function checked(name,login){
 const raw=process.env[name];
 if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!raw)
  throw Error('DISPOSABLE_SCOPED_RLS_OPT_IN_REQUIRED');
 const u=new URL(raw);
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/'+DB||decodeURIComponent(u.username)!==login||
    !u.password||u.search||u.hash)throw Error('REFUSING_NON_DISPOSABLE_TARGET');
 return raw;
}
const admin=postgres(checked('P5_CI_ADMIN_URL','scotty_p5_admin'),{max:3,ssl:false,connect_timeout:5});
const pulse=postgres(checked('P5_CI_AGENT_PULSE_URL','scotty_p5_agent_pulse'),{max:2,ssl:false,connect_timeout:5});
const iris=postgres(checked('P5_CI_AGENT_IRIS_URL','scotty_p5_agent_iris'),{max:2,ssl:false,connect_timeout:5});
const orion=postgres(checked('P5_CI_AGENT_UNMAPPED_URL','scotty_p5_agent_unmapped'),{max:2,ssl:false,connect_timeout:5});
const pulseOther=postgres(checked('P5_CI_AGENT_PULSE_OTHER_URL','scotty_p5_agent_pulse_other'),{max:2,ssl:false,connect_timeout:5});
const dbs=[admin,pulse,iris,orion,pulseOther];
const keys=generateKeyPairSync('ed25519'),wrong=generateKeyPairSync('ed25519');
const issuer='scotty-p5-synthetic-owner-consent',keyId='SYN-CONSENT-KEY-001';
const project='SYN-PROJECT-REVIEW',otherProject='SYN-PROJECT-OTHER';
const mem={
 dept:'SYN-MEM-DEPT-PULSE',shared:'SYN-MEM-SHARED-PULSE',
 other:'SYN-MEM-SHARED-OTHER'
};
const grants={
 dept:{id:'SYN-CONSENT-SCOPED-DEPT-IRIS',actor:'agent-creative-iris',owner:'agent-creative-pulse',project,scope:'departmental',resource:mem.dept},
 cross:{id:'SYN-CONSENT-SCOPED-DEPT-ORION',actor:'agent-creative-orion',owner:'agent-creative-pulse',project,scope:'departmental',resource:mem.dept},
 shared:{id:'SYN-CONSENT-SCOPED-SHARE-ORION',actor:'agent-creative-orion',owner:'agent-creative-pulse',project,scope:'shared',resource:mem.shared},
 other:{id:'SYN-CONSENT-SCOPED-OTHER-PROJECT',actor:'agent-creative-pulse',owner:'agent-creative-pulse',project:otherProject,scope:'shared',resource:mem.other}
};
function signedGrant(g,revision=2,privateKey=keys.privateKey){
 const claims={
  grantId:g.id,revision,issuer,keyId,actorId:g.actor,memoryOwnerId:g.owner,
  projectId:g.project,scope:g.scope,resourceId:g.resource,
  issuedAt:NOW-2000,expiresAt:NOW+1200000,
  status:'synthetic-approved-review'
 };
 return {...claims,signature:sign(null,canonicalPhase5SyntheticConsent(claims),privateKey).toString('base64url')};
}
async function insertSigned(r){
 await admin.unsafe(
  'insert into scotty_p5_synthetic_consent_versions (grant_id,revision,issuer,key_id,actor_id,memory_owner_id,project_id,scope,resource_id,issued_at,expires_at,status,signature) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
  [r.grantId,r.revision,r.issuer,r.keyId,r.actorId,r.memoryOwnerId,r.projectId,
   r.scope,r.resourceId,r.issuedAt,r.expiresAt,r.status,r.signature]
 );
}
const setStop=b=>admin.unsafe(
 "update scotty_p5_synthetic_emergency_stop set stopped=$1,version=version+1 where scope='synthetic'",[b]);
const read=async client=>(await client.unsafe(
 'select memory_id from public.scotty_p5_synthetic_scoped_memory_items order by memory_id'
)).map(r=>r.memory_id);
const activate=g=>admin.unsafe(
 'update scotty_p5_synthetic_consent_state set current_revision=2,revoked=false,state_version=state_version+1 where grant_id=$1',[g.id]);
const revoke=g=>admin.unsafe(
 'update scotty_p5_synthetic_consent_state set revoked=true,state_version=state_version+1 where grant_id=$1',[g.id]);
async function issueReceipt(g){
 const record=signedGrant(g);
 const {signature,...claims}=record;
 assert.equal(verify(null,canonicalPhase5SyntheticConsent(claims),
  keys.publicKey,Buffer.from(signature,'base64url')),true);
 await admin.unsafe(
  'insert into scotty_p5_synthetic_verified_consent_receipts(grant_id,revision,test_verified) values($1,2,true)',
  [g.id]
 );
}
test('departmental/shared synthetic memory RLS requires current receipt and revocable consent',async t=>{
 try{
  assert.equal((await admin`select current_database() as db`)[0].db,DB);
  await admin`insert into scotty_p5_synthetic_scoped_identity_acl
    (login_name,agent_id,project_id,chief_id,active) values
    ('scotty_p5_agent_pulse','agent-creative-pulse','SYN-PROJECT-REVIEW','SYN-CHIEF-A',true),
    ('scotty_p5_agent_iris','agent-creative-iris','SYN-PROJECT-REVIEW','SYN-CHIEF-A',true),
    ('scotty_p5_agent_unmapped','agent-creative-orion','SYN-PROJECT-REVIEW','SYN-CHIEF-B',true),
    ('scotty_p5_agent_pulse_other','agent-creative-pulse','SYN-PROJECT-OTHER','SYN-CHIEF-A',true)`;
  await admin`insert into scotty_p5_synthetic_scoped_memory_items
    (memory_id,project_id,owner_agent_id,owner_chief_id,memory_scope,data_class,payload) values
    ('SYN-MEM-DEPT-PULSE','SYN-PROJECT-REVIEW','agent-creative-pulse','SYN-CHIEF-A','departmental','synthetic-only','SYN-DEPT-FICTION'),
    ('SYN-MEM-SHARED-PULSE','SYN-PROJECT-REVIEW','agent-creative-pulse','SYN-CHIEF-A','shared','synthetic-only','SYN-SHARE-FICTION'),
    ('SYN-MEM-SHARED-OTHER','SYN-PROJECT-OTHER','agent-creative-pulse','SYN-CHIEF-A','shared','synthetic-only','SYN-OTHER-FICTION')`;
  for(const g of Object.values(grants)){
   await insertSigned(signedGrant(g,1));
   await insertSigned(signedGrant(g,2));
   await admin.unsafe('insert into scotty_p5_synthetic_consent_state(grant_id,current_revision) values($1,1)',[g.id]);
  }
  await t.test('RLS is enabled and forced, without write privileges for agents',async()=>{
   const flags=await admin`select relrowsecurity,relforcerowsecurity from pg_class where oid='public.scotty_p5_synthetic_scoped_memory_items'::regclass`;
   assert.equal(flags[0].relrowsecurity,true);assert.equal(flags[0].relforcerowsecurity,true);
   await assert.rejects(iris`update scotty_p5_synthetic_scoped_memory_items set payload='SYN-TAMPER' where memory_id='SYN-MEM-DEPT-PULSE'`,e=>e?.code==='42501');
  });
  await t.test('global stop denies all scoped memory, even where test grants exist',async()=>{
   await setStop(true);
   assert.deepEqual(await Promise.all([read(pulse),read(iris),read(orion),read(pulseOther)]),[[],[],[],[]]);
  });
  await t.test('opening stop cannot bypass default-revoked consent state',async()=>{
   await setStop(false);
   assert.deepEqual(await Promise.all([read(iris),read(orion),read(pulseOther)]),[[],[],[]]);
  });
  await t.test('active signed version without separate trusted verification receipt is denied',async()=>{
   await activate(grants.dept);
   assert.deepEqual(await read(iris),[]);
  });
  await t.test('tampered Ed25519 proof cannot qualify for a verification receipt',async()=>{
   const c=signedGrant(grants.dept,2,wrong.privateKey);
   const {signature,...claims}=c;
   assert.equal(verify(null,canonicalPhase5SyntheticConsent(claims),
     keys.publicKey,Buffer.from(signature,'base64url')),false);
   assert.deepEqual(await read(iris),[]);
  });
  await t.test('independently verified synthetic receipt permits same-Chief departmental memory',async()=>{
   await issueReceipt(grants.dept);
   assert.deepEqual(await read(iris),[mem.dept]);
   assert.deepEqual(await read(pulse),[]);
  });
  await t.test('even a signed receipt cannot grant cross-Chief departmental memory',async()=>{
   await activate(grants.cross);
   await issueReceipt(grants.cross);
   assert.deepEqual(await read(orion),[]);
  });
  await t.test('object-specific shared consent permits cross-Chief read in matching project',async()=>{
   await activate(grants.shared);
   await issueReceipt(grants.shared);
   assert.deepEqual(await read(orion),[mem.shared]);
   assert.deepEqual(await read(iris),[mem.dept]);
  });
  await t.test('same synthetic agent in another project remains isolated by DB login',async()=>{
   await activate(grants.other);
   await issueReceipt(grants.other);
   assert.deepEqual(await read(pulseOther),[mem.other]);
   assert.deepEqual(await read(pulse),[]);
  });
  await t.test('direct guessed object IDs cannot bypass scope and project rules',async()=>{
   const x=await iris`select memory_id from scotty_p5_synthetic_scoped_memory_items where memory_id='SYN-MEM-SHARED-PULSE'`;
   const y=await pulseOther`select memory_id from scotty_p5_synthetic_scoped_memory_items where memory_id='SYN-MEM-DEPT-PULSE'`;
   assert.equal(x.length,0);assert.equal(y.length,0);
  });
  await t.test('client-settable role, project and Chief settings never change SQL identity',async()=>{
   await iris.begin(async tx=>{
    await tx`select set_config('scotty.p5_agent_id','agent-creative-orion',true)`;
    await tx`select set_config('scotty.p5_chief_id','SYN-CHIEF-B',true)`;
    await tx`select set_config('scotty.p5_project_id','SYN-PROJECT-OTHER',true)`;
    const ids=(await tx`select memory_id from scotty_p5_synthetic_scoped_memory_items order by memory_id`).map(x=>x.memory_id);
    assert.deepEqual(ids,[mem.dept]);
   });
  });
  await t.test('runtime cannot read or create verified receipt or membership records',async()=>{
   await assert.rejects(iris`select * from scotty_p5_synthetic_verified_consent_receipts`,e=>e?.code==='42501');
   await assert.rejects(iris`select * from scotty_p5_synthetic_scoped_identity_acl`,e=>e?.code==='42501');
   await assert.rejects(iris`insert into scotty_p5_synthetic_verified_consent_receipts(grant_id,revision,test_verified) values('SYN-CONSENT-SCOPED-DEPT-IRIS',2,true)`,e=>e?.code==='42501');
   await assert.rejects(iris`update scotty_p5_synthetic_consent_state set revoked=false`,e=>e?.code==='42501');
  });
  await t.test('receipt history cannot be modified or deleted even by fixture administrator',async()=>{
   await assert.rejects(admin.unsafe(
    'delete from scotty_p5_synthetic_verified_consent_receipts where grant_id=$1',[grants.dept.id]),e=>e?.code==='P0001');
   await assert.rejects(admin.unsafe(
    'update scotty_p5_synthetic_verified_consent_receipts set test_verified=false where grant_id=$1',[grants.dept.id]),e=>e?.code==='P0001');
  });
  await t.test('revoking current departmental consent immediately hides rows across connections',async()=>{
   await revoke(grants.dept);
   assert.deepEqual(await read(iris),[]);
   assert.deepEqual(await read(orion),[mem.shared]);
  });
  await t.test('revoking shared consent immediately denies other Chief',async()=>{
   await revoke(grants.shared);
   assert.deepEqual(await read(orion),[]);
  });
  await t.test('deactivating subject role denies even still-current other-project consent',async()=>{
   await admin`update scotty_p5_synthetic_scoped_identity_acl set active=false where login_name='scotty_p5_agent_pulse_other'`;
   assert.deepEqual(await read(pulseOther),[]);
  });
  await t.test('stop is global across agent roles and restores to stopped by default',async()=>{
   await setStop(true);
   assert.deepEqual(await Promise.all([read(pulse),read(iris),read(orion),read(pulseOther)]),[[],[],[],[]]);
  });
  await t.test('all scoped payload and consent data are fictional test fixtures',async()=>{
   const rows=await admin`select memory_id,project_id,data_class,payload from scotty_p5_synthetic_scoped_memory_items`;
   assert.equal(rows.length,3);
   assert.ok(rows.every(x=>x.memory_id.startsWith('SYN-MEM-')&&x.project_id.startsWith('SYN-PROJECT-')&&
    x.data_class==='synthetic-only'&&x.payload.startsWith('SYN-')));
  });
 }finally{
  await Promise.allSettled([setStop(true),...dbs.map(db=>db.end({timeout:5}))]);
 }
});
