import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhase5StagingGate } from './workspace-authorization-adapter.mjs';

const NOW = Date.parse('2026-11-09T16:00:00Z');
const PROJECT = 'synthetic';
const base = {projectId:PROJECT, resourceProjectId:PROJECT, resourceId:'SYN-BRIEF-001',
  action:'workspace:read', grantId:'SYN-GRANT-001', nonce:'SYN-NONCE-ABCDEF123', dataClass:'synthetic-only'};
const request = (method='GET', origin='https://scotty.example') => ({method,headers:{get:key=>({host:'scotty.example',origin})[key]??null}});
const defaultGrant = {id:'SYN-GRANT-001',subject:'owner',projectId:PROJECT,
  resourceProjectId:PROJECT, resourceId:base.resourceId, action:base.action,
  dataClass:'synthetic-only',version:1,status:'synthetic-approved',revoked:false,expiresAt:NOW+60_000};
function harness(patch={}) {
  const seen = new Set(); const audits=[];
  const args = {
    enabled:true, now:()=>NOW,
    verifyOwnerSession:async()=>true, loadAuthorizedProjectIds:async()=>[PROJECT], newId:()=> 'SYN-ID-001',
    readGrant:async()=>({...defaultGrant}), verifyGrantProof:async()=>true,
    claimNonceAtomic:async key => {if(seen.has(key))return false;seen.add(key);return true;},
    recordAudit:async entry => {audits.push(entry);return true;},...patch,
  };
  return {gate:createPhase5StagingGate(args),audits,seen};
}
const run=async(patch={},overrides={})=>harness(overrides).gate({...base,request:request(),...patch});
function deny(name, patch, reason, overrides={}) {
  test(name,async()=>{const result=await run(patch,overrides);assert.equal(result.decision,'DENY');assert.equal(result.reason,reason);assert.equal(result.actualPermissionGranted,false);});
}
test('constructor refuses missing trusted dependencies',()=>assert.throws(()=>createPhase5StagingGate({}),/TRUSTED_DEPENDENCIES_REQUIRED/));
test('default disabled; does not issue authorization',async()=>{
  const h=harness({enabled:false});const r=await h.gate({...base,request:request()});
  assert.equal(r.decision,'DENY');assert.equal(r.reason,'PHASE5_DISABLED_BY_DEFAULT');
});
test('synthetic view eligible only as preview with audit',async()=>{
  const h=harness();const r=await h.gate({...base,request:request()});
  assert.equal(r.decision,'SIMULATED_ELIGIBLE');assert.equal(r.actualPermissionGranted,false);
  assert.equal(h.audits.at(-1).outcome,'SIMULATED_ELIGIBLE');
});
test('synthetic nonce cannot be replayed',async()=>{
  const h=harness();assert.equal((await h.gate({...base,request:request()})).decision,'SIMULATED_ELIGIBLE');
  const r=await h.gate({...base,request:request()});assert.equal(r.reason,'REPLAY_OR_NONCE_STORE_FAILURE');
});
deny('cross-project request denied',{resourceProjectId:'other'},'PROJECT_SCOPE_MISMATCH');
deny('non-synthetic data denied',{dataClass:'restricted'},'NON_SYNTHETIC_RESOURCE');
deny('non-synthetic resource denied',{resourceId:'REAL-BRIEF-001'},'NON_SYNTHETIC_RESOURCE');
deny('memory read denied',{action:'memory:read'},'ACTION_NOT_ALLOWED');
deny('memory write denied',{action:'memory:write'},'ACTION_NOT_ALLOWED');
deny('publish denied',{action:'social:publish'},'ACTION_NOT_ALLOWED');
deny('brand contact denied',{action:'outreach:send'},'ACTION_NOT_ALLOWED');
deny('paid AI denied',{action:'ai:paid-call'},'ACTION_NOT_ALLOWED');
deny('missing nonce denied',{nonce:''},'INVALID_NONCE');
deny('invalid grant reference denied',{grantId:'FAKE-GRANT'},'GRANT_REFERENCE_REQUIRED');
deny('unauthenticated denied',{},'OWNER_AUTHENTICATION_FAILED',{verifyOwnerSession:async()=>false});
deny('no owner project membership denied',{},'OWNER_AUTHENTICATION_FAILED',{loadAuthorizedProjectIds:async()=>[]});
deny('grant lookup unavailable denied',{},'GRANT_LOOKUP_FAILED',{readGrant:async()=>{throw Error('unavailable');}});
deny('grant for another project denied',{},'GRANT_INVALID_OR_REVOKED',{readGrant:async()=>({...defaultGrant,projectId:'other'})});
deny('grant for another resource denied',{},'GRANT_INVALID_OR_REVOKED',{readGrant:async()=>({...defaultGrant,resourceId:'SYN-OTHER'})});
deny('revoked grant denied',{},'GRANT_INVALID_OR_REVOKED',{readGrant:async()=>({...defaultGrant,revoked:true})});
deny('expired grant denied',{},'GRANT_INVALID_OR_REVOKED',{readGrant:async()=>({...defaultGrant,expiresAt:NOW-1})});
deny('unverified grant proof denied',{},'GRANT_PROOF_UNVERIFIED',{verifyGrantProof:async()=>false});
deny('unavailable nonce store denied',{},'REPLAY_OR_NONCE_STORE_FAILURE',{claimNonceAtomic:async()=>{throw Error('unavailable');}});
deny('rejected nonce claim denied',{},'REPLAY_OR_NONCE_STORE_FAILURE',{claimNonceAtomic:async()=>false});
deny('audit unavailable denies otherwise eligible request',{},'AUDIT_UNAVAILABLE',{recordAudit:async()=>{throw Error('audit unavailable');}});
test('POST with untrusted origin rejected before credentials are checked',async()=>{
  let called=false;const h=harness({verifyOwnerSession:async()=>{called=true;return true;}});
  const r=await h.gate({...base,request:request('POST','https://outside.example')});
  assert.equal(r.reason,'UNSAFE_HTTP_REQUEST');assert.equal(called,false);
});
test('browser-supplied permissions and roles never enter decision inputs',async()=>{
  const h=harness();const r=await h.gate({...base,request:{...request(),body:{roles:['owner'],permissions:{other:['workspace:read']}}}});
  assert.equal(r.decision,'SIMULATED_ELIGIBLE');assert.equal(r.actualPermissionGranted,false);
});
test('audit event stores only safe identifiers and decision metadata',async()=>{
  const h=harness();await h.gate({...base,request:request(),token:'NEVER-LOG-TOKEN'});
  assert.equal(h.audits.length,1);assert.equal(JSON.stringify(h.audits).includes('NEVER-LOG-TOKEN'),false);
});
