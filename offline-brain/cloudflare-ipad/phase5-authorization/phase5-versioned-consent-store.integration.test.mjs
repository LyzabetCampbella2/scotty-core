/**
 * Synthetic versioned consent + revocation integration — disposable PG16 only.
 * Private keys are generated in CI; no owner/agent prod credentials or memory.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,sign} from 'node:crypto';
import postgres from 'postgres';
import {canonicalPhase5SyntheticConsent} from './phase5-object-consent-review.mjs';
import {createPhase5DisposableVersionedConsentReview} from './phase5-versioned-consent-store.mjs';

const DB='scotty_phase5_synthetic_test',NOW=Date.parse('2026-11-09T22:00:00Z');
function fixtureUrl(name,login){
 const raw=process.env[name];
 if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!raw)
  throw Error('EXPLICIT_DISPOSABLE_PG_OPT_IN_REQUIRED');
 const u=new URL(raw);
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/'+DB||decodeURIComponent(u.username)!==login||
    !u.password||u.search||u.hash)throw Error('REFUSING_NON_SYNTHETIC_TARGET');
 return raw;
}
const admin=postgres(fixtureUrl('P5_CI_ADMIN_URL','scotty_p5_admin'),{max:3,ssl:false,connect_timeout:5});
const runtime=postgres(fixtureUrl('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{max:3,ssl:false,connect_timeout:5});
const runtime2=postgres(fixtureUrl('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{max:2,ssl:false,connect_timeout:5});
const roster=JSON.parse(readFileSync(new URL('./phase5-185-agent-roster-review.json',import.meta.url),'utf8'));
const specialist=roster.agents.find(a=>a.role==='Specialist');
const chief=roster.agents.find(a=>a.id===specialist.chiefId);
const otherChief=roster.agents.find(a=>a.role==='Chief'&&a.department!==chief.department);
const keys=generateKeyPairSync('ed25519'),forger=generateKeyPairSync('ed25519');
const issuer='scotty-p5-synthetic-owner-consent',keyId='SYN-CONSENT-KEY-001';
const grantId='SYN-CONSENT-DURABLE-001',resourceId='SYN-MEM-DURABLE-001';
const projectId='SYN-PROJECT-REVIEW';
const claim=(revision,patch={})=>({
 grantId,revision,issuer,keyId,actorId:specialist.id,memoryOwnerId:chief.id,
 projectId,scope:'departmental',resourceId,issuedAt:NOW-2000,
 expiresAt:NOW+180000,status:'synthetic-approved-review',...patch
});
const signed=(c,privateKey=keys.privateKey)=>({
 ...c,signature:sign(null,canonicalPhase5SyntheticConsent(c),privateKey).toString('base64url')
});
const insertVersion=r=>admin.unsafe(
 'insert into scotty_p5_synthetic_consent_versions(grant_id,revision,issuer,key_id,actor_id,memory_owner_id,project_id,scope,resource_id,issued_at,expires_at,status,signature) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
 [r.grantId,r.revision,r.issuer,r.keyId,r.actorId,r.memoryOwnerId,
  r.projectId,r.scope,r.resourceId,r.issuedAt,r.expiresAt,r.status,r.signature]
);
const state=async()=>(await admin.unsafe(
 'select current_revision,state_version,revoked from scotty_p5_synthetic_consent_state where grant_id=$1',[grantId]))[0];
const events=()=>admin.unsafe(
 'select revision,state_version,event_code from scotty_p5_synthetic_consent_lifecycle_events where grant_id=$1 order by state_version',[grantId]);
const auditCount=async()=>Number((await admin.unsafe(
 'select count(*)::int as n from scotty_p5_synthetic_consent_review_events'))[0].n);
const stop=b=>admin.unsafe(
 "update scotty_p5_synthetic_emergency_stop set stopped=$1,version=version+1 where scope='synthetic'",[b]);
const transition=(revision,revoked)=>admin.unsafe(
 'update scotty_p5_synthetic_consent_state set current_revision=$1,revoked=$2,state_version=state_version+1 where grant_id=$3',
 [revision,revoked,grantId]);
function build({sql=runtime,actorId=specialist.id,project=projectId,clock=NOW,
 enabled=true,actorError=false}={}){
 return createPhase5DisposableVersionedConsentReview({
  sql,enabled,now:()=>clock,snapshot:roster,
  trustedOwnerKeys:{[keyId]:{issuer,active:true,
   publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'})}},
  resolveVerifiedActor:async()=>{
   if(actorError)throw Error('PRIVATE_ACTOR_PROVIDER_OUTAGE');
   return {verifiedByServer:true,agentId:actorId,projectId:project};
  }
 });
}
const review=(service=build(),opts={})=>service.review({
 session:{synthetic:true},grantId,scope:'departmental',resourceId,...opts
});
test('disposable versioned consent history and transactional review',async t=>{
 try{
  assert.equal((await admin`select current_database() as name`)[0].name,DB);
  await insertVersion(signed(claim(1)));
  await admin.unsafe('insert into scotty_p5_synthetic_consent_state(grant_id,current_revision) values($1,1)',[grantId]);

  await t.test('registration is revoked by default and auto-appends first event',async()=>{
   const s=await state();
   assert.equal(s.current_revision,1);assert.equal(s.state_version,'1');
   assert.equal(s.revoked,true);
   const e=await events();
   assert.equal(e.length,1);assert.equal(e[0].event_code,'REGISTERED_STOPPED');
  });
  await t.test('initial request with stop active denies and audits without identities',async()=>{
   const n=await auditCount();
   const r=await review();
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
   assert.equal(r.reason,'SYNTHETIC_EMERGENCY_STOPPED');assert.equal(await auditCount(),n+1);
  });
  await t.test('opening emergency stop does not authorize a revoked consent',async()=>{
   await stop(false);
   const r=await review();
   assert.equal(r.reason,'CONSENT_REVOKED_OR_MISSING');assert.equal(r.canRead,false);
   assert.equal(r.auditPersisted,true);
  });
  await t.test('same revision cannot reactivate after revocation',async()=>{
   await assert.rejects(transition(1,false),e=>e?.code==='P0001');
   assert.equal((await state()).revoked,true);
  });
  await t.test('immutable signed history forbids updates, deletes, duplicate revisions',async()=>{
   await assert.rejects(admin.unsafe(
    "update scotty_p5_synthetic_consent_versions set scope='shared' where grant_id=$1",[grantId]),e=>e?.code==='P0001');
   await assert.rejects(admin.unsafe(
    'delete from scotty_p5_synthetic_consent_versions where grant_id=$1',[grantId]),e=>e?.code==='P0001');
   await assert.rejects(insertVersion(signed(claim(1))),e=>e?.code==='23505');
   await assert.rejects(admin.unsafe(
    'delete from scotty_p5_synthetic_consent_state where grant_id=$1',[grantId]),e=>e?.code==='P0001');
  });
  await t.test('restricted runtime cannot manufacture approval, update state, or alter audit',async()=>{
   await assert.rejects(runtime.unsafe(
    'update scotty_p5_synthetic_consent_state set revoked=false where grant_id=$1',[grantId]),
    e=>e?.code==='42501');
   await assert.rejects(runtime.unsafe(
    "insert into scotty_p5_synthetic_consent_versions(grant_id) values('SYN-CONSENT-FAKE')"),
    e=>e?.code==='42501');
   await assert.rejects(runtime.unsafe(
    'delete from scotty_p5_synthetic_consent_lifecycle_events'),
    e=>e?.code==='42501');
   await assert.rejects(runtime.unsafe(
    'select * from scotty_p5_synthetic_consent_review_events'),
    e=>e?.code==='42501');
  });
  await t.test('revision 2 activation requires new signed revision and appends lifecycle',async()=>{
   await insertVersion(signed(claim(2)));
   await transition(2,false);
   const s=await state();assert.equal(s.current_revision,2);
   assert.equal(s.revoked,false);assert.equal(Number(s.state_version),2);
   assert.deepEqual((await events()).map(x=>x.event_code),[
    'REGISTERED_STOPPED','ACTIVATED_NEW_REVISION']);
  });
  await t.test('signed current revision yields review-only decision with durable redacted audit',async()=>{
   const n=await auditCount();
   const r=await review();
   assert.equal(r.decision,'SIMULATED_CONSENT_ELIGIBLE');
   assert.equal(r.auditPersisted,true);assert.equal(r.actualPermissionGranted,false);
   assert.equal(r.realOwnerApprovalVerified,false);assert.equal(r.canRead,false);
   assert.equal(r.canWrite,false);assert.equal(r.canExecute,false);
   assert.equal(r.memoryRowsReturned,0);assert.equal(await auditCount(),n+1);
   const a=await admin.unsafe('select outcome,reason_code,state_version from scotty_p5_synthetic_consent_review_events order by event_id desc limit 1');
   assert.equal(a[0].outcome,'SIMULATED_ELIGIBLE');
   assert.equal(a[0].reason_code,'SYNTHETIC_CONSENT_REVIEW_OK');
   assert.equal(Number(a[0].state_version),2);
  });
  await t.test('object, agent, project and scope mismatches deny',async()=>{
   for(const opts of [{resourceId:'SYN-MEM-OTHER-001'},{scope:'shared'}]){
    assert.equal((await review(build(),opts)).decision,'DENY');
   }
   assert.equal((await review(build({actorId:otherChief.id}))).decision,'DENY');
   assert.equal((await review(build({project:'SYN-PROJECT-OTHER'}))).decision,'DENY');
  });
  await t.test('expired consent is denied with audited outcome',async()=>{
   const r=await review(build({clock:NOW+300000}));
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
  });
  await t.test('runtime cannot alter signed state using inert lock column',async()=>{
   await assert.rejects(runtime.unsafe(
    'update scotty_p5_synthetic_consent_state set lock_pad=false where grant_id=$1',[grantId]),
    e=>e?.code==='P0001');
  });
  await t.test('concurrent revocation waits on held consent-review FOR SHARE lock',async()=>{
   let entered,release;
   const locked=new Promise(resolve=>entered=resolve);
   const resume=new Promise(resolve=>release=resolve);
   const proxy={begin:fn=>runtime2.begin(tx=>fn({unsafe:async(query,args)=>{
    const rows=await tx.unsafe(query,args);
    if(query.startsWith('select grant_id,current_revision,state_version,revoked')){
     entered();await resume;
    }
    return rows;
   }}))};
   const pending=review(build({sql:proxy}));
   try{
    await locked;
    await assert.rejects(admin.begin(async tx=>{
     await tx`set local lock_timeout='100ms'`;
     await tx.unsafe('update scotty_p5_synthetic_consent_state set revoked=true,state_version=state_version+1 where grant_id=$1',[grantId]);
    }),e=>e?.code==='55P03');
   }finally{release?.();}
   const r=await pending;
   assert.equal(r.decision,'SIMULATED_CONSENT_ELIGIBLE');
   assert.equal(r.actualPermissionGranted,false);
  });
  await t.test('revocation persists across runtime pools and prevents review',async()=>{
   await transition(2,true);
   const s=await state();assert.equal(s.revoked,true);assert.equal(Number(s.state_version),3);
   const results=await Promise.all([review(build()),review(build({sql:runtime2}))]);
   assert.ok(results.every(r=>r.decision==='DENY'&&r.auditPersisted===true));
   assert.equal((await events()).at(-1).event_code,'REVOKED');
  });
  await t.test('revoked revision cannot be reused even with valid signature',async()=>{
   await assert.rejects(transition(2,false),e=>e?.code==='P0001');
  });
  await t.test('new revision with forged signature is not trusted',async()=>{
   await insertVersion(signed(claim(3),forger.privateKey));
   await transition(3,false);
   const r=await review();
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
  });
  await t.test('old signed revision cannot override newly selected revision',async()=>{
   const s=await state();assert.equal(s.current_revision,3);
   await assert.rejects(transition(2,false),e=>e?.code==='P0001');
   const r=await review();assert.equal(r.decision,'DENY');
  });
  await t.test('rotating to valid revision 4 requires a new signed proof',async()=>{
   await insertVersion(signed(claim(4)));
   await transition(4,false);
   const r=await review();
   assert.equal(r.decision,'SIMULATED_CONSENT_ELIGIBLE');assert.equal(r.canRead,false);
   assert.equal(Number((await state()).state_version),5);
  });
  await t.test('audit insert outage fails closed after otherwise valid review',async()=>{
   const before=await auditCount();
   await admin.unsafe('revoke insert on table scotty_p5_synthetic_consent_review_events from scotty_p5_runtime');
   try{
    const r=await review();
    assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
    assert.equal(r.memoryRowsReturned,0);assert.equal(await auditCount(),before);
   }finally{
    await admin.unsafe('grant insert on table scotty_p5_synthetic_consent_review_events to scotty_p5_runtime');
   }
  });
  await t.test('malformed actor source denies with redacted audit',async()=>{
   const r=await review(build({actorError:true}));
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
   assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
  });
  await t.test('global stop denies valid signed current revision',async()=>{
   await stop(true);
   const r=await review();
   assert.equal(r.decision,'DENY');assert.equal(r.reason,'SYNTHETIC_EMERGENCY_STOPPED');
   assert.equal(r.auditPersisted,true);
  });
  await t.test('history and state remain durable; audit table excludes raw identities',async()=>{
   const e=await events();assert.equal(e.length,5);
   assert.deepEqual(e.map(r=>r.event_code),[
    'REGISTERED_STOPPED','ACTIVATED_NEW_REVISION','REVOKED',
    'ACTIVATED_NEW_REVISION','ROTATED_REVISION']);
   const cols=(await admin.unsafe(
    "select column_name from information_schema.columns where table_name='scotty_p5_synthetic_consent_review_events'")).map(x=>x.column_name);
   assert.ok(!cols.includes('actor_id')&&!cols.includes('resource_id')&&
    !cols.includes('signature')&&!cols.includes('bearer_token'));
  });
  await t.test('leave synthetic fixture revoked and emergency stop engaged',async()=>{
   await transition(4,true);
   await stop(true);
   assert.equal((await state()).revoked,true);
   assert.equal((await events()).at(-1).event_code,'REVOKED');
  });
 }finally{
  await Promise.allSettled([stop(true),...[
    admin.end({timeout:5}),runtime.end({timeout:5}),runtime2.end({timeout:5})
  ]]);
 }
});
