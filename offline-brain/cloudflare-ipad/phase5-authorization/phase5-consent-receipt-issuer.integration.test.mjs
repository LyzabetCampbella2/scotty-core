/**
 * Isolated consent receipt issuer acceptance. Disposable local PostgreSQL ONLY.
 * All temporary owner/session keys are generated during this test. No real
 * owner identity, real owner approval, production credentials or memory.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,sign} from 'node:crypto';
import postgres from 'postgres';
import {createPhase5SyntheticOwnerSessionResolver} from './phase5-signed-owner-session.mjs';
import {canonicalPhase5SyntheticConsent} from './phase5-object-consent-review.mjs';
import {createPhase5SyntheticConsentReceiptIssuer} from './phase5-consent-receipt-issuer.mjs';

const DB='scotty_phase5_synthetic_test';
const NOW=Date.parse('2026-11-09T22:00:00Z');
function safeUrl(field,login){
 const url=process.env[field];
 if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!url)
  throw Error('DISPOSABLE_ISSUER_OPT_IN_REQUIRED');
 const u=new URL(url);
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/'+DB||decodeURIComponent(u.username)!==login||
    !u.password||u.search||u.hash)throw Error('REFUSING_NON_DISPOSABLE_ISSUER');
 return url;
}
const admin=postgres(safeUrl('P5_CI_ADMIN_URL','scotty_p5_admin'),{max:3,ssl:false,connect_timeout:5});
const issuerPool=postgres(safeUrl('P5_CI_ISSUER_URL','scotty_p5_consent_issuer'),{max:3,ssl:false,connect_timeout:5});
const runtime=postgres(safeUrl('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{max:2,ssl:false,connect_timeout:5});
const roster=JSON.parse(readFileSync(new URL('./phase5-185-agent-roster-review.json',import.meta.url),'utf8'));
const actor=roster.agents.find(x=>x.role==='Specialist'&&x.chiefId==='chief-data');
assert.ok(actor,'Canonical synthetic actor required');
const owner='chief-data',project='SYN-PROJECT-REVIEW',object='SYN-MEM-ISSUER-TEST';
const sessionKeys=generateKeyPairSync('ed25519');
const consentKeys=generateKeyPairSync('ed25519');
const forgerKeys=generateKeyPairSync('ed25519');
const sessionIssuer='scotty-p5-synthetic-idp',consentIssuer='scotty-p5-synthetic-owner-consent';
const sessionKid='SYN-SESSION-KEY-ISSUER001',consentKid='SYN-CONSENT-KEY-ISSUER001';
const sessionHdr={alg:'EdDSA',typ:'SCOTTY-P5-SYNTHETIC-SESSION',kid:sessionKid};
const toB64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const claims=(subject='SYN-OWNER-ISSUER001')=>({
 iss:sessionIssuer,aud:'scotty-p5-synthetic-preview',
 sub:subject,jti:'SYN-SESSION-ISSUER001',iat:Math.floor(NOW/1000)-30,
 nbf:Math.floor(NOW/1000)-30,exp:Math.floor(NOW/1000)+120,
 version:1,purpose:'synthetic-owner-preview'
});
function ownerJwt(subject='SYN-OWNER-ISSUER001',signer=sessionKeys.privateKey){
 const data=toB64(sessionHdr)+'.'+toB64(claims(subject));
 return data+'.'+sign(null,Buffer.from(data),signer).toString('base64url');
}
const request=jwt=>({headers:{get:k=>k==='authorization'?'Bearer '+jwt:null}});
const grantClaim=(grantId,patch={})=>({
 grantId,revision:2,issuer:consentIssuer,keyId:consentKid,
 actorId:actor.id,memoryOwnerId:owner,projectId:project,
 scope:'departmental',resourceId:object,issuedAt:NOW-2000,
 expiresAt:NOW+120000,status:'synthetic-approved-review',...patch
});
function signedGrant(grantId,patch={},signer=consentKeys.privateKey){
 const c=grantClaim(grantId,patch);
 return {...c,signature:sign(null,canonicalPhase5SyntheticConsent(c),signer).toString('base64url')};
}
async function addFixture(grantId,opts={}){
 const row=signedGrant(grantId,{},opts.forger?forgerKeys.privateKey:consentKeys.privateKey);
 const v1={...row,revision:1};
 // Build a fresh valid version-one proof using canonical revision one.
 const first=signedGrant(grantId,{revision:1},opts.forger?forgerKeys.privateKey:consentKeys.privateKey);
 for(const r of [first,row]){
  await admin.unsafe(
   'insert into scotty_p5_synthetic_consent_versions (grant_id,revision,issuer,key_id,actor_id,memory_owner_id,project_id,scope,resource_id,issued_at,expires_at,status,signature) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
   [r.grantId,r.revision,r.issuer,r.keyId,r.actorId,r.memoryOwnerId,r.projectId,
    r.scope,r.resourceId,r.issuedAt,r.expiresAt,r.status,r.signature]
  );
 }
 await admin.unsafe('insert into scotty_p5_synthetic_consent_state (grant_id,current_revision) values ($1,1)',[grantId]);
 if(opts.active!==false)
  await admin.unsafe('update scotty_p5_synthetic_consent_state set current_revision=2,revoked=false,state_version=state_version+1 where grant_id=$1',[grantId]);
 return row;
}
const stop=flag=>admin.unsafe(
 "update scotty_p5_synthetic_emergency_stop set stopped=$1,version=version+1 where scope='synthetic'",[flag]);
const receiptCount=async id=>Number((await admin.unsafe(
 'select count(*)::int as n from scotty_p5_synthetic_verified_consent_receipts where grant_id=$1',[id]))[0].n);
const auditCount=async()=>Number((await admin.unsafe(
 'select count(*)::int as n from scotty_p5_synthetic_consent_review_events'))[0].n);
function make(opts={}){
 const session=createPhase5SyntheticOwnerSessionResolver({
  enabled:true,now:()=>NOW,
  trustedKeys:{[sessionKid]:{issuer:sessionIssuer,active:true,
   publicKeyPem:sessionKeys.publicKey.export({format:'pem',type:'spki'})}},
  loadProjectMembershipForSubject:async()=>opts.wrongProject
   ?['SYN-PROJECT-OTHER']:[project],
  isSessionRevoked:async()=>opts.revokedSession===true
 });
 return createPhase5SyntheticConsentReceiptIssuer({
  sql:issuerPool,snapshot:roster,enabled:opts.enabled??true,now:()=>NOW,
  resolveSignedOwnerSession:session,
  trustedOwnerKeys:{[consentKid]:{issuer:consentIssuer,active:true,
   publicKeyPem:consentKeys.publicKey.export({format:'pem',type:'spki'})}},
  loadOwnerSigningKeyAssignment:async identity=>({
   active:true,projectId:identity.projectId,
   keyId:opts.wrongSigner||identity.ownerPrincipalId!=='SYN-OWNER-ISSUER001'
    ?'SYN-CONSENT-KEY-UNASSIGNED':consentKid
  }),
  verifyActiveAgentMembership:async identity=>
   opts.agentInactive!==true&&identity.agentId===actor.id&&identity.projectId===project
 });
}
const issue=(service,id,jwt=ownerJwt())=>service.issue({
 ownerRequest:request(jwt),grantId:id,scope:'departmental',resourceId:object
});

test('independent synthetic owner approval and agent identity receipt issuer',async t=>{
 const primary='SYN-CONSENT-ISSUER-GOOD001';
 const bogus='SYN-CONSENT-ISSUER-FORGED001';
 const auditFault='SYN-CONSENT-ISSUER-AUDIT001';
 const race='SYN-CONSENT-ISSUER-RACE001';
 try{
  assert.equal((await admin`select current_database() as db`)[0].db,DB);
  await addFixture(primary);
  await addFixture(bogus,{forger:true});
  await addFixture(auditFault);
  await addFixture(race);

  await t.test('issuer role cannot change grant history, status, or emergency stop',async()=>{
   for(const query of [
    "update scotty_p5_synthetic_consent_state set revoked=false",
    "delete from scotty_p5_synthetic_consent_versions",
    "update scotty_p5_synthetic_emergency_stop set stopped=false"
   ]){
    await assert.rejects(issuerPool.unsafe(query),e=>e?.code==='42501');
   }
  });
  await t.test('ordinary agent/runtime has no INSERT privilege for privileged receipts',async()=>{
   await assert.rejects(runtime.unsafe(
    'insert into scotty_p5_synthetic_verified_consent_receipts(grant_id,revision,test_verified) values($1,2,true)',[primary]),
    e=>e?.code==='42501');
  });
  await t.test('stopped by default causes denial and does not insert a receipt',async()=>{
   await stop(true);
   const r=await issue(make(),primary);
   assert.equal(r.decision,'DENY');
   assert.equal(r.actualPermissionGranted,false);
   assert.equal(r.reason,'SYNTHETIC_EMERGENCY_STOPPED');
   assert.equal(await receiptCount(primary),0);
  });
  await t.test('revoked owner session denies and cannot create receipt',async()=>{
   await stop(false);
   const r=await issue(make({revokedSession:true}),primary);
   assert.equal(r.decision,'DENY');assert.equal(r.receiptRecorded,false);
   assert.equal(await receiptCount(primary),0);
  });
  await t.test('forged session signature denies and creates no receipt',async()=>{
   const r=await issue(make(),primary,ownerJwt('SYN-OWNER-ISSUER001',forgerKeys.privateKey));
   assert.equal(r.decision,'DENY');assert.equal(await receiptCount(primary),0);
  });
  await t.test('different signed owner cannot borrow first owners project key',async()=>{
   const r=await issue(make(),primary,ownerJwt('SYN-OWNER-SOMEONEELSE'));
   assert.equal(r.decision,'DENY');assert.equal(await receiptCount(primary),0);
  });
  await t.test('owner session lacking grant project membership is denied',async()=>{
   const r=await issue(make({wrongProject:true}),primary);
   assert.equal(r.decision,'DENY');assert.equal(await receiptCount(primary),0);
  });
  await t.test('project-scoped owner signing key mismatch denies',async()=>{
   const r=await issue(make({wrongSigner:true}),primary);
   assert.equal(r.decision,'DENY');assert.equal(await receiptCount(primary),0);
  });
  await t.test('inactive independently checked agent cannot receive receipt',async()=>{
   const r=await issue(make({agentInactive:true}),primary);
   assert.equal(r.decision,'DENY');assert.equal(await receiptCount(primary),0);
  });
  await t.test('forged signed consent is denied even if owner session is valid',async()=>{
   const r=await issue(make(),bogus);
   assert.equal(r.decision,'DENY');assert.equal(await receiptCount(bogus),0);
  });
  await t.test('verified owner session, key assignment, roster and grant insert one synthetic receipt',async()=>{
   const before=await auditCount();
   const r=await issue(make(),primary);
   assert.equal(r.decision,'SIMULATED_RECEIPT_RECORDED');
   assert.equal(r.receiptRecorded,true);assert.equal(r.auditPersisted,true);
   assert.equal(r.actualPermissionGranted,false);
   assert.equal(r.realOwnerApprovalVerified,false);assert.equal(r.canRead,false);
   assert.equal(r.canExecute,false);assert.equal(r.memoryRowsReturned,0);
   assert.equal(await receiptCount(primary),1);assert.equal(await auditCount(),before+1);
  });
  await t.test('duplicate receipt cannot create a second record or grant permission',async()=>{
   const r=await issue(make(),primary);
   assert.equal(r.decision,'DENY');assert.equal(r.receiptRecorded,false);
   assert.equal(await receiptCount(primary),1);
  });
  await t.test('revoked current revision denies even with an existing receipt',async()=>{
   await admin.unsafe(
    'update scotty_p5_synthetic_consent_state set revoked=true,state_version=state_version+1 where grant_id=$1',[primary]);
   const r=await issue(make(),primary);
   assert.equal(r.decision,'DENY');assert.equal(await receiptCount(primary),1);
  });
  await t.test('audit INSERT outage rolls back synthetic receipt insertion',async()=>{
   await admin.unsafe('revoke insert on table scotty_p5_synthetic_consent_review_events from scotty_p5_consent_issuer');
   try{
    const r=await issue(make(),auditFault);
    assert.equal(r.decision,'DENY');
    assert.equal(r.auditPersisted,false);
    assert.equal(r.receiptRecorded,false);
    assert.equal(await receiptCount(auditFault),0);
   }finally{
    await admin.unsafe('grant insert on table scotty_p5_synthetic_consent_review_events to scotty_p5_consent_issuer');
   }
  });
  await t.test('revocation update waits for transaction-bound signature and actor check',async()=>{
   let entered,release;
   const ready=new Promise(resolve=>entered=resolve);
   const gate=new Promise(resolve=>release=resolve);
   const session=createPhase5SyntheticOwnerSessionResolver({
    enabled:true,now:()=>NOW,
    trustedKeys:{[sessionKid]:{issuer:sessionIssuer,active:true,
     publicKeyPem:sessionKeys.publicKey.export({format:'pem',type:'spki'})}},
    loadProjectMembershipForSubject:async()=>[project],
    isSessionRevoked:async()=>false
   });
   const issuer=createPhase5SyntheticConsentReceiptIssuer({
    sql:issuerPool,snapshot:roster,enabled:true,now:()=>NOW,
    resolveSignedOwnerSession:session,
    trustedOwnerKeys:{[consentKid]:{issuer:consentIssuer,active:true,
     publicKeyPem:consentKeys.publicKey.export({format:'pem',type:'spki'})}},
    loadOwnerSigningKeyAssignment:async()=>({
     active:true,keyId:consentKid,projectId:project
    }),
    verifyActiveAgentMembership:async()=>{
     entered();await gate;return true;
    }
   });
   const pending=issue(issuer,race);
   try{
    await ready;
    await assert.rejects(admin.begin(async tx=>{
     await tx`set local lock_timeout='100ms'`;
     await tx.unsafe('update scotty_p5_synthetic_consent_state set revoked=true,state_version=state_version+1 where grant_id=$1',[race]);
    }),e=>e?.code==='55P03');
   }finally{release?.();}
   const r=await pending;
   assert.equal(r.decision,'SIMULATED_RECEIPT_RECORDED');
   assert.equal(r.actualPermissionGranted,false);assert.equal(await receiptCount(race),1);
   await admin.unsafe(
    'update scotty_p5_synthetic_consent_state set revoked=true,state_version=state_version+1 where grant_id=$1',[race]);
  });
  await t.test('receipt issuer disabled by default performs no database writes',async()=>{
   const r=await issue(make({enabled:false}),auditFault);
   assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
   assert.equal(await receiptCount(auditFault),0);
  });
  await t.test('receipt issuer cannot read actual memory or return a grant',async()=>{
   const r=await issue(make(),auditFault);
   assert.equal(r.decision,'SIMULATED_RECEIPT_RECORDED');
   assert.equal(r.actualPermissionGranted,false);assert.equal(r.canRead,false);
   assert.equal(r.canWrite,false);assert.equal(r.canExecute,false);
   assert.equal(r.memoryRowsReturned,0);
  });
  await t.test('leave test consent records revoked and emergency stop engaged',async()=>{
   for(const id of [bogus,auditFault]){
    await admin.unsafe('update scotty_p5_synthetic_consent_state set revoked=true,state_version=state_version+1 where grant_id=$1',[id]);
   }
   await stop(true);
   const rows=await admin.unsafe(
    "select grant_id,revoked from scotty_p5_synthetic_consent_state where grant_id like 'SYN-CONSENT-ISSUER-%' order by grant_id");
   assert.equal(rows.length,4);assert.ok(rows.every(x=>x.revoked===true));
  });
 }finally{
  await Promise.allSettled([stop(true),admin.end({timeout:5}),issuerPool.end({timeout:5}),runtime.end({timeout:5})]);
 }
});
