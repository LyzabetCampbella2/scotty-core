import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createPhase5SignedRosterScopeReview} from './phase5-signed-roster-policy-review.mjs';
const snapshot=JSON.parse(readFileSync(new URL('./phase5-185-agent-roster-review.json',import.meta.url),'utf8'));
const NOW=Date.parse('2026-11-09T21:00:00Z');
const issuer='scotty-p5-synthetic-roster-idp';
const keys=generateKeyPairSync('ed25519'),wrong=generateKeyPairSync('ed25519');
const keyId='SYN-ROSTER-KEY-001';
const header={typ:'SCOTTY-P5-SYNTHETIC-ROSTER-IDENTITY',alg:'EdDSA',kid:keyId};
const claimsFor=id=>({
 iss:issuer,aud:'scotty-p5-synthetic-roster-review',
 sub:id,jti:'SYN-ROSTER-SESSION-'+id.toUpperCase(),
 iat:Math.floor(NOW/1000)-30,nbf:Math.floor(NOW/1000)-30,
 exp:Math.floor(NOW/1000)+90,version:1,
 purpose:'scotty-p5-roster-membership-review'
});
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(claims,h=header,privateKey=keys.privateKey){
 const text=b64(h)+'.'+b64(claims);
 return text+'.'+sign(null,Buffer.from(text),privateKey).toString('base64url');
}
const request=jwt=>({headers:{get:k=>k==='authorization'?'Bearer '+jwt:null}});
const newReviewer=opts=>createPhase5SignedRosterScopeReview({
 snapshot,enabled:true,now:()=>NOW,
 trustedKeys:{[keyId]:{issuer,active:true,
  publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'})}},
 isSessionRevoked:async()=>false,
 verifyReviewedRosterIdentity:async()=>true,
 ...opts
});
const reviewer=newReviewer();
const review=(id,ownerAgentId=id,scope='individual',more={})=>
 reviewer.review({request:request(token(claimsFor(id))),ownerAgentId,scope,projectId:'SYN-PROJECT-REVIEW',...more});

test('default disabled and independent test key required',async()=>{
 assert.throws(()=>createPhase5SignedRosterScopeReview({}),/TRUSTED_SYNTHETIC_ROSTER_DEPS_REQUIRED/);
 const off=createPhase5SignedRosterScopeReview({
  snapshot,enabled:false,now:()=>NOW,
  trustedKeys:{[keyId]:{issuer,active:true,publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'})}},
  isSessionRevoked:async()=>false,verifyReviewedRosterIdentity:async()=>true
 });
 const denied=await off.review({request:request(token(claimsFor('chief-spock'))),ownerAgentId:'chief-spock',scope:'individual',projectId:'SYN-PROJECT-REVIEW'});
 assert.equal(denied.decision,'DENY');assert.equal(denied.actualPermissionGranted,false);
});
test('signing-verifier only exposes review, not memory or execution',()=>{
 assert.deepEqual(Object.keys(reviewer),['review']);
 assert.ok(Object.isFrozen(reviewer));
 assert.equal(reviewer.execute,undefined);
 assert.equal(reviewer.authorize,undefined);
 assert.equal(reviewer.sql,undefined);
});
for(const agent of snapshot.agents){
 test('signed canonical roster scope: '+agent.id,async()=>{
  const result=await review(agent.id);
  assert.equal(result.decision,'SIGNED_REVIEW_ONLY_PENDING_APPROVAL');
  assert.equal(result.agentId,agent.id);
  assert.equal(result.signedSyntheticIdentityVerified,true);
  assert.equal(result.ownerApprovalVerified,false);
  assert.equal(result.actualPermissionGranted,false);
  assert.equal(result.canExecute,false);
  assert.equal(result.memoryRowsReturned,0);
  assert.equal(result.externalCalls,0);
  assert.ok(result.requiredApprovals.includes('owner-signed-specific-grant'));
 });
}
test('specialist cannot use signed session to read chief individual memory',async()=>{
 const spec=snapshot.agents.find(a=>a.role==='Specialist');
 const result=await review(spec.id,spec.chiefId,'individual');
 assert.equal(result.decision,'DENY');
 assert.equal(result.reason,'INDIVIDUAL_SCOPE_DIFFERENT_AGENT');
});
test('chief cannot use signed session to read specialist individual memory',async()=>{
 const spec=snapshot.agents.find(a=>a.role==='Specialist');
 const result=await review(spec.chiefId,spec.id,'individual');
 assert.equal(result.decision,'DENY');
});
test('departmental review uses Chief relationships, but not permission',async()=>{
 const spec=snapshot.agents.find(a=>a.role==='Specialist');
 const result=await review(spec.id,spec.chiefId,'departmental');
 assert.equal(result.decision,'SIGNED_REVIEW_ONLY_PENDING_APPROVAL');
 assert.equal(result.actualPermissionGranted,false);
 assert.ok(result.requiredApprovals.includes('owner-signed-department-grant'));
});
test('cross-departmental signed agent request denied',async()=>{
 const a=snapshot.agents.find(a=>a.role==='Chief');
 const b=snapshot.agents.find(x=>x.role==='Chief'&&x.department!==a.department);
 const result=await review(a.id,b.id,'departmental');
 assert.equal(result.decision,'DENY');
 assert.equal(result.reason,'CROSS_DEPARTMENT_SCOPE');
});
test('cross-department shared scope still only approval-pending, never access',async()=>{
 const a=snapshot.agents.find(a=>a.role==='Chief');
 const b=snapshot.agents.find(x=>x.role==='Chief'&&x.department!==a.department);
 const result=await review(a.id,b.id,'shared');
 assert.equal(result.decision,'SIGNED_REVIEW_ONLY_PENDING_APPROVAL');
 assert.equal(result.actualPermissionGranted,false);
 assert.ok(result.requiredApprovals.includes('owner-signed-object-specific-share-grant'));
});
test('client-forged actorId is rejected despite valid signing proof',async()=>{
 const result=await review('chief-spock','chief-spock','individual',{actorId:'chief-worf'});
 assert.equal(result.decision,'DENY');assert.equal(result.reason,'SYNTHETIC_ROSTER_IDENTITY_UNVERIFIED');
});
test('unlisted agent subject rejected even if signed by test key',async()=>{
 const result=await reviewer.review({
  request:request(token(claimsFor('agent-attacker'))),
  ownerAgentId:'chief-spock',scope:'shared',projectId:'SYN-PROJECT-REVIEW'
 });
 assert.equal(result.decision,'DENY');
});
test('unknown / replaced signing key rejected',async()=>{
 const t=token(claimsFor('chief-spock'),{...header,kid:'SYN-ROSTER-KEY-OTHER'});
 const result=await reviewer.review({request:request(t),ownerAgentId:'chief-spock',scope:'individual',projectId:'SYN-PROJECT-REVIEW'});
 assert.equal(result.decision,'DENY');
});
test('forged Ed25519 signature fails even for known roster subject',async()=>{
 const t=token(claimsFor('chief-spock'),header,wrong.privateKey);
 const result=await reviewer.review({request:request(t),ownerAgentId:'chief-spock',scope:'individual',projectId:'SYN-PROJECT-REVIEW'});
 assert.equal(result.decision,'DENY');
});
test('expired and future session tokens denied',async()=>{
 const id='chief-spock';
 for(const claims of [
  {...claimsFor(id),exp:Math.floor(NOW/1000)-1},
  {...claimsFor(id),nbf:Math.floor(NOW/1000)+20},
  {...claimsFor(id),iat:Math.floor(NOW/1000)+20},
  {...claimsFor(id),exp:Math.floor(NOW/1000)+1200}
 ]){
  const r=await reviewer.review({request:request(token(claims)),ownerAgentId:id,scope:'individual',projectId:'SYN-PROJECT-REVIEW'});
  assert.equal(r.decision,'DENY');
 }
});
test('role/department appended to signed token cannot assert authority',async()=>{
 const claims={...claimsFor('chief-spock'),role:'SCOTTY-OWNER',department:'ALL-DEPARTMENTS'};
 const r=await reviewer.review({request:request(token(claims)),ownerAgentId:'chief-spock',scope:'individual',projectId:'SYN-PROJECT-REVIEW'});
 assert.equal(r.decision,'DENY');
});
test('revoked synthetic roster session denied',async()=>{
 const checker=newReviewer({isSessionRevoked:async()=>true});
 const r=await checker.review({request:request(token(claimsFor('chief-spock'))),ownerAgentId:'chief-spock',scope:'individual',projectId:'SYN-PROJECT-REVIEW'});
 assert.equal(r.decision,'DENY');
});
test('unreviewed roster identity and membership outage denied',async()=>{
 for(const callback of [async()=>false,async()=>{throw Error('SENSITIVE_LOOKUP_FAILURE')}]) {
  const checker=newReviewer({verifyReviewedRosterIdentity:callback});
  const r=await checker.review({request:request(token(claimsFor('chief-spock'))),ownerAgentId:'chief-spock',scope:'individual',projectId:'SYN-PROJECT-REVIEW'});
  assert.equal(r.decision,'DENY');assert.equal(JSON.stringify(r).includes('SENSITIVE'),false);
 }
});
test('real project names are rejected',async()=>{
 const r=await review('chief-spock','chief-spock','individual',{projectId:'production'});
 assert.equal(r.decision,'DENY');
});
