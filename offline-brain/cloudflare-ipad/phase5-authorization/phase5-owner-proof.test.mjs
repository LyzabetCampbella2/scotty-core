import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonicalSyntheticOwnerGrant,createSyntheticOwnerGrantProofVerifier} from './phase5-owner-proof.mjs';

const now=Date.parse('2026-11-09T16:00:00Z');
const a=generateKeyPairSync('ed25519');
const b=generateKeyPairSync('ed25519');
const pub=key=>key.publicKey.export({type:'spki',format:'pem'});
const issuer='scotty-p5-synthetic-owner';
const grant={
 id:'SYN-GRANT-CRYPTO-001',subject:'owner',projectId:'synthetic',
 resourceProjectId:'synthetic',resourceId:'SYN-BRIEF-001',action:'workspace:read',
 dataClass:'synthetic-only',version:1,status:'synthetic-approved',revoked:false,
 expiresAt:new Date(now+3_600_000),proofIssuer:issuer,proofKeyId:'SYN-KEY-001',
};
const signed=(patch={},key=a.privateKey)=>{const g={...grant,...patch};return {...g,proofSignature:sign(null,canonicalSyntheticOwnerGrant(g),key).toString('base64url')}};
const trustedKeys={'SYN-KEY-001':{issuer,active:true,publicKeyPem:pub(a)}};
const make=()=>createSyntheticOwnerGrantProofVerifier({trustedKeys});

test('requires a separately supplied trusted keyring',()=>{
 assert.throws(()=>createSyntheticOwnerGrantProofVerifier(),/TRUST_ANCHOR_REQUIRED/);
 assert.throws(()=>createSyntheticOwnerGrantProofVerifier({trustedKeys:{}}),/TRUST_ANCHOR_REQUIRED/);
});
test('synthetic Ed25519 signed grant verifies against pinned key',async()=>{
 assert.equal(await make()(signed()),true);
});
test('Date vs canonical ISO string produces same proof bytes',async()=>{
 const proof=signed();
 assert.equal(await make()({...proof,expiresAt:proof.expiresAt.toISOString()}),true);
});
test('signed grant cannot grant real permissions by itself',async()=>{
 const proof=signed();
 assert.equal(await make()(proof),true);
 assert.equal('actualPermissionGranted'in proof,false);
});
const mutations=[
 ['projectId','another-project'],['resourceProjectId','different-project'],
 ['resourceId','SYN-BRIEF-OTHER'],['action','knowledge:propose'],
 ['dataClass','production'],['status','synthetic-revoked'],
 ['revoked',true],['expiresAt',new Date(now+12_000_000)],['subject','chief'],
 ['version',2],['proofIssuer','attacker'],['proofKeyId','SYN-KEY-OTHER'],
 ['id','SYN-GRANT-OTHER'],
];
for(const [field,value] of mutations){
 test('post-signature '+field+' mutation is rejected',async()=>{
  assert.equal(await make()({...signed(),[field]:value}),false);
 });
}
test('unknown key identifier is denied even with a matching signature',async()=>{
 const other=signed({proofKeyId:'SYN-KEY-999'});
 assert.equal(await make()(other),false);
});
test('wrong signer with valid-looking signature is denied',async()=>{
 assert.equal(await make()(signed({},b.privateKey)),false);
});
test('malformed signature is rejected',async()=>{
 assert.equal(await make()({...signed(),proofSignature:'bad-signature'}),false);
});
test('empty signature and undefined proof are rejected',async()=>{
 assert.equal(await make()({...signed(),proofSignature:''}),false);
 assert.equal(await make()(null),false);
});
test('corrupt signature cannot verify',async()=>{
 const g=signed();const suffix=g.proofSignature.endsWith('A')?'B':'A';
 assert.equal(await make()({...g,proofSignature:g.proofSignature.slice(0,-1)+suffix}),false);
});
test('removing a key from independently trusted registry revokes it',async()=>{
 const g=signed();assert.equal(await make()(g),true);
 const rotation=createSyntheticOwnerGrantProofVerifier({trustedKeys:{
  'SYN-KEY-002':{issuer,active:true,publicKeyPem:pub(b)}
 }});
 assert.equal(await rotation(g),false);
});
test('active new key may be trusted explicitly',async()=>{
 const second=signed({proofKeyId:'SYN-KEY-002'},b.privateKey);
 const two=createSyntheticOwnerGrantProofVerifier({trustedKeys:{
  ...trustedKeys,'SYN-KEY-002':{issuer,active:true,publicKeyPem:pub(b)}
 }});
 assert.equal(await two(second),true);
});
test('inactive public key never becomes trusted',()=>{
 assert.throws(()=>createSyntheticOwnerGrantProofVerifier({trustedKeys:{
  'SYN-KEY-001':{issuer,active:false,publicKeyPem:pub(a)}
 }}),/INVALID_SYNTHETIC_TRUSTED_KEY/);
});
test('public-key issuer must be pinned',()=>{
 assert.throws(()=>createSyntheticOwnerGrantProofVerifier({trustedKeys:{
  'SYN-KEY-001':{issuer:'another-issuer',active:true,publicKeyPem:pub(a)}
 }}),/INVALID_SYNTHETIC_TRUSTED_KEY/);
});
test('invalid claims cannot be canonicalized for signing',()=>{
 assert.throws(()=>canonicalSyntheticOwnerGrant({...grant,projectId:'SYN/UNSAFE'}),/INVALID_SYNTHETIC_PROOF_PAYLOAD/);
 assert.throws(()=>canonicalSyntheticOwnerGrant({...grant,expiresAt:'yesterday'}),/INVALID_SYNTHETIC_PROOF_PAYLOAD/);
});
test('non-Ed25519 public key is rejected',()=>{
 const ec=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 assert.throws(()=>createSyntheticOwnerGrantProofVerifier({trustedKeys:{
  'SYN-KEY-001':{issuer,active:true,publicKeyPem:pub(ec)}
 }}),/ED25519_PUBLIC_KEY_REQUIRED/);
});
