import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhase5SyntheticPostgresGate} from './phase5-synthetic-postgres-gate.mjs';
const NOW=Date.parse('2026-11-09T16:00:00Z');
const fixtureGrant={id:'SYN-GRANT-001',subject:'owner',projectId:'synthetic',resourceProjectId:'synthetic',resourceId:'SYN-BRIEF-001',action:'workspace:read',dataClass:'synthetic-only',version:1,status:'synthetic-approved',revoked:false,expiresAt:new Date(NOW+60_000),proofDigest:'SYN-ONLY'};
const request={method:'GET',headers:{get:key=>({host:'scotty.example',origin:'https://scotty.example'})[key]??null}};
const input={projectId:'synthetic',resourceProjectId:'synthetic',resourceId:'SYN-BRIEF-001',action:'workspace:read',grantId:'SYN-GRANT-001',nonce:'SYN-NONCE-ABCDEFGHI',dataClass:'synthetic-only',request};

function fakePg({grant={},failAudit=false,failTransaction=false,dependencies={}}={}) {
  const state={grant:{...fixtureGrant,...grant},nonces:new Set(),audits:[],calls:[],transactions:0,failAudit,failTransaction};
  let queue=Promise.resolve();
  const sql={begin:async callback=>{
    let release;const next=new Promise(ok=>{release=ok});const previous=queue;queue=next;await previous;
    state.transactions++;
    try{
      if(state.failTransaction)throw Error('disposable mock db unavailable');
      const staged={nonces:new Set(state.nonces),audits:[...state.audits]};
      const tx={unsafe:async(statement,params)=>{
        state.calls.push(statement);
        if(statement.startsWith('select grant_id'))return state.grant?[{...state.grant}]:[];
        if(statement.startsWith('insert into scotty_p5_synthetic_nonce_claims')){
          const key=params[0]+':'+params[1];if(staged.nonces.has(key))return [];
          staged.nonces.add(key);return [{nonce:params[1]}];
        }
        if(statement.startsWith('insert into scotty_p5_synthetic_audit')){
          if(state.failAudit)throw Error('mock audit unavailable');
          staged.audits.push({project:params[0],resource:params[1],action:params[2]});
          return [{event_id:staged.audits.length}];
        }
        throw Error('unexpected SQL in synthetic mock');
      }};
      const response=await callback(tx);
      state.nonces=staged.nonces;state.audits=staged.audits;
      return response;
    }finally{release();}
  }};
  const gate=createPhase5SyntheticPostgresGate({
    sql,enabled:true,now:()=>NOW,
    verifyOwnerSession:async()=>true,loadAuthorizedProjectIds:async()=>['synthetic'],
    newId:()=> 'SYN-ID',verifyGrantProof:async()=>true,...dependencies
  });
  return {gate,state,sql};
}
async function denial(name,patch,reason,options={}) {
  await test(name,async()=>{const {gate}=fakePg(options);const result=await gate({...input,...patch});assert.equal(result.decision,'DENY');assert.equal(result.reason,reason);assert.equal(result.actualPermissionGranted,false);});
}
test('requires all trusted dependencies',()=>assert.throws(()=>createPhase5SyntheticPostgresGate(),/TRUSTED_DEPENDENCIES_REQUIRED/));
test('disabled by default invokes no SQL',async()=>{
  const sql={begin:()=>{throw Error('should not execute')}};
  const gate=createPhase5SyntheticPostgresGate({sql,verifyOwnerSession:async()=>true,loadAuthorizedProjectIds:async()=>['synthetic'],newId:()=>'',verifyGrantProof:async()=>true});
  assert.equal((await gate({...input})).reason,'PHASE5_DISABLED_BY_DEFAULT');
});
test('matching synthetic request is preview-only and atomically audited',async()=>{
  const {gate,state}=fakePg();const result=await gate({...input});
  assert.equal(result.decision,'SIMULATED_ELIGIBLE');assert.equal(result.actualPermissionGranted,false);
  assert.equal(state.nonces.size,1);assert.equal(state.audits.length,1);assert.equal(state.transactions,1);assert.equal(state.calls.length,3);
});
test('replayed nonce is rejected without duplicate audit',async()=>{
  const {gate,state}=fakePg();assert.equal((await gate({...input})).decision,'SIMULATED_ELIGIBLE');
  assert.equal((await gate({...input})).reason,'NONCE_REPLAY_OR_STORE_FAILURE');assert.equal(state.nonces.size,1);assert.equal(state.audits.length,1);
});
test('parallel mock transaction requests reserve same nonce at most once',async()=>{
  const {gate,state}=fakePg();const outcomes=await Promise.all([gate({...input}),gate({...input})]);
  assert.deepEqual(outcomes.map(x=>x.decision).sort(),['DENY','SIMULATED_ELIGIBLE']);assert.equal(state.nonces.size,1);
});
test('audit failure rolls back nonce so a later retry can succeed',async()=>{
  const {gate,state}=fakePg({failAudit:true});assert.equal((await gate({...input})).reason,'TRANSACTION_OR_AUDIT_UNAVAILABLE');
  assert.equal(state.nonces.size,0);assert.equal(state.audits.length,0);state.failAudit=false;
  assert.equal((await gate({...input})).decision,'SIMULATED_ELIGIBLE');
});
test('database outage fails closed',async()=>{
  const {gate}=fakePg({failTransaction:true});assert.equal((await gate({...input})).reason,'TRANSACTION_OR_AUDIT_UNAVAILABLE');
});
test('revoked grant denies without nonce write',async()=>{
  const {gate,state}=fakePg({grant:{revoked:true}});assert.equal((await gate({...input})).reason,'GRANT_INVALID_OR_REVOKED');assert.equal(state.nonces.size,0);
});
test('expired grant denies',async()=>{
  const {gate}=fakePg({grant:{expiresAt:new Date(NOW-1)}});assert.equal((await gate({...input})).reason,'GRANT_INVALID_OR_REVOKED');
});
test('invalid proof denies',async()=>{
  const {gate}=fakePg({dependencies:{verifyGrantProof:async()=>false}});assert.equal((await gate({...input})).reason,'GRANT_PROOF_UNVERIFIED');
});
test('no grant denies',async()=>{
  const {gate,state}=fakePg();state.grant=null;assert.equal((await gate({...input})).reason,'GRANT_NOT_FOUND');
});
test('unauthenticated owner denied before SQL',async()=>{
  const {gate,state}=fakePg({dependencies:{verifyOwnerSession:async()=>false}});assert.equal((await gate({...input})).reason,'OWNER_AUTHENTICATION_FAILED');assert.equal(state.transactions,0);
});
test('cross-project access denied before SQL',async()=>{
  const {gate,state}=fakePg();assert.equal((await gate({...input,resourceProjectId:'other'})).reason,'PROJECT_SCOPE_MISMATCH');assert.equal(state.transactions,0);
});
test('object-specific grant cannot authorize another resource',async()=>{
  const {gate}=fakePg();assert.equal((await gate({...input,resourceId:'SYN-BRIEF-OTHER'})).reason,'GRANT_INVALID_OR_REVOKED');
});
test('memory access is always denied before SQL',async()=>{
  const {gate,state}=fakePg();for(const action of ['memory:read','memory:write'])assert.equal((await gate({...input,action})).reason,'ACTION_NOT_ALLOWED');assert.equal(state.transactions,0);
});
test('publishing outreach and paid AI denied before SQL',async()=>{
  const {gate,state}=fakePg();for(const action of ['social:publish','outreach:send','ai:paid-call'])assert.equal((await gate({...input,action})).reason,'ACTION_NOT_ALLOWED');assert.equal(state.transactions,0);
});
test('production classification denied before SQL',async()=>{
  const {gate,state}=fakePg();assert.equal((await gate({...input,dataClass:'production'})).reason,'NON_SYNTHETIC_RESOURCE');assert.equal(state.transactions,0);
});
test('nonce and grant identifiers must match synthetic format',async()=>{
  const {gate,state}=fakePg();assert.equal((await gate({...input,nonce:'short'})).reason,'INVALID_NONCE');assert.equal((await gate({...input,grantId:'GRANT-REAL'})).reason,'GRANT_REFERENCE_REQUIRED');assert.equal(state.transactions,0);
});
