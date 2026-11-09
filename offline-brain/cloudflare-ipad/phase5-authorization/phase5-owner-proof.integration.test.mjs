/**
 * Disposable PostgreSQL integration for independent Ed25519 verification.
 * Keys are GENERATED INSIDE THIS TEST. Not a real owner session/approval.
 * Exact localhost, disposable database and user checks are mandatory.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import postgres from 'postgres';
import {canonicalSyntheticOwnerGrant,createSyntheticOwnerGrantProofVerifier} from './phase5-owner-proof.mjs';
import {createPhase5SyntheticPostgresGate} from './phase5-synthetic-postgres-gate.mjs';
const DATABASE='scotty_phase5_synthetic_test';
const NOW=Date.parse('2026-11-09T16:00:00Z');
const GRANT_ID='SYN-GRANT-CRYPTO-001';
const RESOURCE='SYN-BRIEF-CRYPTO-001';
const ISSUER='scotty-p5-synthetic-owner';
function checkUrl(name,role){
 const text=process.env[name];
 if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!text)throw Error('DISPOSABLE_POSTGRES_OPT_IN_REQUIRED');
 const u=new URL(text);
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/'+DATABASE||decodeURIComponent(u.username)!==role||
    !u.password||u.search||u.hash)throw Error('WRONG_DATABASE_TARGET');
 return text;
}
const admin=postgres(checkUrl('P5_CI_ADMIN_URL','scotty_p5_admin'),{ssl:false,max:2,connect_timeout:5});
const runtime=postgres(checkUrl('P5_CI_RUNTIME_URL','scotty_p5_runtime'),{ssl:false,max:3,connect_timeout:5});
const keys=generateKeyPairSync('ed25519');
const wrongKeys=generateKeyPairSync('ed25519');
const pub=k=>k.publicKey.export({type:'spki',format:'pem'});
const trustedKeys={'SYN-KEY-001':{issuer:ISSUER,active:true,publicKeyPem:pub(keys)}};
const verifyProof=createSyntheticOwnerGrantProofVerifier({trustedKeys});
const request={method:'GET',headers:{get:k=>({host:'scotty.example',origin:'https://scotty.example'})[k]??null}};
const grant={
 id:GRANT_ID,subject:'owner',projectId:'synthetic',resourceProjectId:'synthetic',
 resourceId:RESOURCE,action:'workspace:read',dataClass:'synthetic-only',
 version:1,status:'synthetic-approved',revoked:false,
 expiresAt:new Date(NOW+3_600_000),proofIssuer:ISSUER,proofKeyId:'SYN-KEY-001'
};
const signature=sign(null,canonicalSyntheticOwnerGrant(grant),keys.privateKey).toString('base64url');
const req=(nonce)=>({
 request,projectId:'synthetic',resourceProjectId:'synthetic',resourceId:RESOURCE,
 action:'workspace:read',grantId:GRANT_ID,nonce,dataClass:'synthetic-only'
});
function makeGate(proof=verifyProof,owner=true){
 return createPhase5SyntheticPostgresGate({
  sql:runtime,enabled:true,now:()=>NOW,
  verifyOwnerSession:async()=>owner,
  loadAuthorizedProjectIds:async()=>['synthetic'],
  newId:()=> 'SYN-ID',verifyGrantProof:proof
 });
}
async function nonceCount(n){
 const rows=await admin.unsafe(
 'select count(*)::int as n from scotty_p5_synthetic_nonce_claims where grant_id=$1 and nonce=$2',
 [GRANT_ID,n]);return rows[0].n;
}
async function updateProof(column,value){
 const allow=['proof_key_id','proof_signature','expires_at'];
 if(!allow.includes(column))throw Error('UNSAFE_TEST_COLUMN');
 await admin.unsafe('update scotty_p5_synthetic_grants set '+column+'=$1 where grant_id=$2',[value,GRANT_ID]);
}
test('independently verified synthetic Ed25519 grant in disposable PostgreSQL',async t=>{
 try{
  const name=await admin`select current_database() as db`;
  assert.equal(name[0].db,DATABASE);
  await admin.unsafe(
   "insert into scotty_p5_synthetic_grants (grant_id,subject,project_id,resource_project_id,resource_id,action,data_class,grant_version,state,revoked,expires_at,proof_digest,proof_issuer,proof_key_id,proof_signature) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
   [GRANT_ID,'owner','synthetic','synthetic',RESOURCE,'workspace:read','synthetic-only',1,'synthetic-approved',false,grant.expiresAt,
    'SYNTHETIC_SIGNED_FIXTURE',ISSUER,'SYN-KEY-001',signature]
  );
  await t.test('verified signature allows a preview but grants no real permission',async()=>{
   const n='SYN-NONCE-ED25519-VALID001';
   const result=await makeGate()(req(n));
   assert.equal(result.decision,'SIMULATED_ELIGIBLE');
   assert.equal(result.actualPermissionGranted,false);
   assert.equal(await nonceCount(n),1);
  });
  await t.test('wrong public key rejects signed row with no nonce',async()=>{
   const other=createSyntheticOwnerGrantProofVerifier({trustedKeys:{
    'SYN-KEY-001':{issuer:ISSUER,active:true,publicKeyPem:pub(wrongKeys)}
   }});
   const n='SYN-NONCE-ED25519-WRONGKEY';
   const result=await makeGate(other)(req(n));
   assert.equal(result.reason,'GRANT_PROOF_UNVERIFIED');assert.equal(await nonceCount(n),0);
  });
  await t.test('tampered expiration remains in future but fails signature',async()=>{
   const n='SYN-NONCE-ED25519-TAMPEREXP';
   await updateProof('expires_at',new Date(NOW+2_000_000));
   try{
    const result=await makeGate()(req(n));
    assert.equal(result.reason,'GRANT_PROOF_UNVERIFIED');assert.equal(await nonceCount(n),0);
   }finally{await updateProof('expires_at',grant.expiresAt);}
  });
  await t.test('untrusted key identifier fails closed',async()=>{
   const n='SYN-NONCE-ED25519-UNKNOWNKEY';
   await updateProof('proof_key_id','SYN-KEY-UNTRUSTED');
   try{
    const result=await makeGate()(req(n));
    assert.equal(result.reason,'GRANT_PROOF_UNVERIFIED');assert.equal(await nonceCount(n),0);
   }finally{await updateProof('proof_key_id','SYN-KEY-001');}
  });
  await t.test('forged signature fails closed without nonce or preview audit',async()=>{
   const n='SYN-NONCE-ED25519-FORGERY01';
   await updateProof('proof_signature','A'.repeat(86));
   try{
    const result=await makeGate()(req(n));
    assert.equal(result.reason,'GRANT_PROOF_UNVERIFIED');assert.equal(await nonceCount(n),0);
   }finally{await updateProof('proof_signature',signature);}
  });
  await t.test('removed trust anchor immediately prevents new synthetic preview',async()=>{
   const n='SYN-NONCE-ED25519-REMOVEDKEY';
   const rotated=createSyntheticOwnerGrantProofVerifier({trustedKeys:{
    'SYN-KEY-ROTATED':{issuer:ISSUER,active:true,publicKeyPem:pub(wrongKeys)}
   }});
   const result=await makeGate(rotated)(req(n));
   assert.equal(result.reason,'GRANT_PROOF_UNVERIFIED');assert.equal(await nonceCount(n),0);
  });
  await t.test('trusted session boundary still required even with valid signature',async()=>{
   const n='SYN-NONCE-ED25519-NOSESSION';
   const result=await makeGate(verifyProof,false)(req(n));
   assert.equal(result.reason,'OWNER_AUTHENTICATION_FAILED');assert.equal(await nonceCount(n),0);
  });
  await t.test('signed proof never authorizes memory, outreach, publishing, or paid AI',async()=>{
   for(const action of ['memory:read','memory:write','outreach:send','social:publish','ai:paid-call']){
    const result=await makeGate()({...req('SYN-NONCE-ED25519-NOACTION'),action});
    assert.equal(result.reason,'ACTION_NOT_ALLOWED');
   }
  });
 }finally{await Promise.allSettled([admin.end({timeout:5}),runtime.end({timeout:5})]);}
});
