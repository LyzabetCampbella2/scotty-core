import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonicalPhase5SyntheticConsent,createPhase5SyntheticConsentReview} from './phase5-object-consent-review.mjs';
const roster=JSON.parse(readFileSync(new URL('./phase5-185-agent-roster-review.json',import.meta.url),'utf8'));
const NOW=Date.parse('2026-11-09T22:00:00Z'),issuer='scotty-p5-synthetic-owner-consent';
const keyId='SYN-CONSENT-KEY-001',PROJECT='SYN-PROJECT-REVIEW',RESOURCE='SYN-MEM-REVIEW-001';
const key=generateKeyPairSync('ed25519'),wrong=generateKeyPairSync('ed25519');
const spec=roster.agents.find(x=>x.role==='Specialist');
const chief=roster.agents.find(x=>x.id===spec.chiefId);
const otherChief=roster.agents.find(x=>x.role==='Chief'&&x.department!==spec.department);
const grantFor=(actorId=spec.id,memoryOwnerId=chief.id,scope='departmental')=>({
 grantId:'SYN-CONSENT-REVIEW-001',issuer,keyId,actorId,memoryOwnerId,
 projectId:PROJECT,scope,resourceId:RESOURCE,revision:1,
 issuedAt:NOW-1000,expiresAt:NOW+100000,status:'synthetic-approved-review'
});
const signed=(g=grantFor(),privateKey=key.privateKey)=>({
 ...g,signature:sign(null,canonicalPhase5SyntheticConsent(g),privateKey).toString('base64url')
});
const trust=()=>({[keyId]:{issuer,active:true,publicKeyPem:key.publicKey.export({type:'spki',format:'pem'})}});
function make(opts={}){
 const counters={actor:0,load:0,state:0};
 const review=createPhase5SyntheticConsentReview({
  snapshot:roster,enabled:opts.enabled??true,now:()=>opts.now??NOW,
  trustedOwnerKeys:opts.keyring||trust(),
  resolveVerifiedActor:async()=>{counters.actor++;if(opts.actorDown)throw Error('SENSITIVE_ACTOR_LOOKUP');
   return {verifiedByServer:true,agentId:opts.agentId??spec.id,projectId:opts.projectId??PROJECT};},
  loadTrustedConsentRecord:async()=>{counters.load++;if(opts.readDown)throw Error('SENSITIVE_GRANT_DB');
   return Object.hasOwn(opts,'record')?opts.record:signed();},
  resolveConsentState:async()=>{counters.state++;if(opts.stateDown)throw Error('SENSITIVE_REVOCATION');
   return {active:!opts.revoked,currentRevision:opts.currentRevision??1};}
 });
 return {review,counters};
}
const check=(h,params={})=>h.review.review({
 session:{opaque:'SYN-SESSION'},grantId:'SYN-CONSENT-REVIEW-001',
 scope:'departmental',resourceId:RESOURCE,...params
});
test('missing dependencies fail before constructing the consent reviewer',()=>{
 assert.throws(()=>createPhase5SyntheticConsentReview(),/TRUSTED_SYNTHETIC_CONSENT_SERVICES_REQUIRED/);
});
test('disabled by default, does not invoke callbacks',async()=>{
 const h=make({enabled:false}),r=await check(h);
 assert.equal(r.decision,'DENY');assert.equal(r.reason,'CONSENT_REVIEW_DISABLED');
 assert.deepEqual(h.counters,{actor:0,load:0,state:0});
});
test('only review method exposed; no access, signing or execution',()=>{
 const h=make();assert.deepEqual(Object.keys(h.review),['review']);
 assert.equal(h.review.read,undefined);assert.equal(h.review.sign,undefined);
 assert.equal(h.review.authorize,undefined);assert.ok(Object.isFrozen(h.review));
});
test('valid signed same-Chief departmental consent is eligible review, never access',async()=>{
 const h=make(),r=await check(h);
 assert.equal(r.decision,'SIMULATED_CONSENT_ELIGIBLE');
 assert.equal(r.actualPermissionGranted,false);assert.equal(r.realOwnerApprovalVerified,false);
 assert.equal(r.canRead,false);assert.equal(r.canWrite,false);assert.equal(r.canExecute,false);
 assert.equal(r.auditPersisted,false);assert.equal(r.memoryRowsReturned,0);
 assert.ok(r.requiredProductionControls.includes('durable-revocation'));
});
test('shared object-specific signature can be reviewed across departments, never accessed',async()=>{
 const h=make({record:signed(grantFor(spec.id,otherChief.id,'shared'))});
 const r=await check(h,{scope:'shared'});
 assert.equal(r.decision,'SIMULATED_CONSENT_ELIGIBLE');assert.equal(r.canRead,false);
});
test('signed departmental scope cannot cross departments',async()=>{
 const h=make({record:signed(grantFor(spec.id,otherChief.id))});
 assert.equal((await check(h)).decision,'DENY');
});
for(const [name,opts,request] of [
 ['wrong resource',{}, {resourceId:'SYN-MEM-OTHER'}],
 ['wrong scope',{}, {scope:'shared'}],
 ['wrong session actor',{agentId:otherChief.id},{}],
 ['wrong session project',{projectId:'SYN-PROJECT-OTHER'},{}],
 ['revised consent is stale',{currentRevision:2},{}],
 ['revoked consent',{revoked:true},{}],
 ['expired consent',{now:NOW+200000},{}],
 ['issued in future',{now:NOW-20000},{}],
 ['forged signature',{record:signed(grantFor(),wrong.privateKey)},{}],
 ['unknown signer',{record:{...signed(),keyId:'SYN-CONSENT-KEY-OTHER'}},{}],
 ['extra grant claims',{record:{...signed(),canExecute:true}},{}],
 ['unsigned consent',{record:{...signed(),signature:''}},{}],
 ['missing record',{record:null},{}],
 ['actor lookup outage',{actorDown:true},{}],
 ['grant lookup outage',{readDown:true},{}],
 ['revocation lookup outage',{stateDown:true},{}],
 ['production grant ID',{}, {grantId:'PROD-GRANT'}],
 ['production memory ID',{}, {resourceId:'REAL-MEMORY'}]
]){
 test('consent denied: '+name,async()=>{
  const h=make(opts),r=await check(h,request);
  assert.equal(r.decision,'DENY');assert.equal(r.actualPermissionGranted,false);
  assert.equal(r.canRead,false);assert.equal(JSON.stringify(r).includes('SENSITIVE'),false);
 });
}
test('old signing key cannot authorize after trusted key rotation',async()=>{
 const newer=generateKeyPairSync('ed25519');
 const h=make({keyring:{'SYN-CONSENT-KEY-NEW':{issuer,active:true,publicKeyPem:newer.publicKey.export({type:'spki',format:'pem'})}}});
 assert.equal((await check(h)).decision,'DENY');
});
test('post-signature tampering fails for actor, owner, scope, revision, expiration',async()=>{
 for(const mutation of [{actorId:chief.id},{memoryOwnerId:otherChief.id},{scope:'shared'},
   {revision:2},{expiresAt:NOW+90000},{status:'production-approved'}]){
  const h=make({record:{...signed(),...mutation}});
  assert.equal((await check(h)).decision,'DENY');
 }
});
test('signer cannot create individual grant or 25-hour approval',()=>{
 assert.throws(()=>canonicalPhase5SyntheticConsent({...grantFor(),scope:'individual'}),/INVALID_SYNTHETIC_CONSENT/);
 assert.throws(()=>canonicalPhase5SyntheticConsent({...grantFor(),expiresAt:NOW+90_000_000}),/INVALID_SYNTHETIC_CONSENT/);
});
for(const agent of roster.agents){
 test('no consent provisioned for roster agent: '+agent.id,async()=>{
  const h=make({agentId:agent.id,record:null});
  const r=await check(h);
  assert.equal(r.decision,'DENY');assert.equal(r.actualPermissionGranted,false);
  assert.equal(r.canRead,false);
 });
}
for(const specialist of roster.agents.filter(x=>x.role==='Specialist')){
 test('departmental consent for specialist requires real approval: '+specialist.id,async()=>{
  const h=make({agentId:specialist.id,record:signed(grantFor(specialist.id,specialist.chiefId))});
  const r=await check(h);
  assert.equal(r.decision,'SIMULATED_CONSENT_ELIGIBLE');
  assert.equal(r.realOwnerApprovalVerified,false);assert.equal(r.actualPermissionGranted,false);
  assert.equal(r.canRead,false);
 });
}
