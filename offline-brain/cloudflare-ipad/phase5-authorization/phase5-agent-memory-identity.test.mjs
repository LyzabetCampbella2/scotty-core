import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createPhase5SyntheticAgentMemoryPreview} from './phase5-agent-memory-identity.mjs';

const NOW=Date.parse('2026-11-09T19:00:00Z');
const issuer='scotty-p5-synthetic-agent-idp';
const audience='scotty-p5-synthetic-memory-preview';
const action='synthetic-memory:preview';
const keys=generateKeyPairSync('ed25519'),wrong=generateKeyPairSync('ed25519');
const kid='SYN-AGENT-KEY-001';
const header={alg:'EdDSA',typ:'SCOTTY-P5-SYNTHETIC-AGENT',kid};
const claims={iss:issuer,aud:audience,sub:'agent-creative-pulse',projectId:'synthetic',
 scope:'individual',purpose:action,jti:'SYN-AGENT-SESSION-001',
 iat:Math.floor(NOW/1000)-30,nbf:Math.floor(NOW/1000)-30,
 exp:Math.floor(NOW/1000)+90,version:1};
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const token=(c=claims,h=header,key=keys.privateKey)=>{
 const body=b64(h)+'.'+b64(c);
 return body+'.'+sign(null,Buffer.from(body),key).toString('base64url');
};
const request=(t=token(),body={})=>({headers:{get:k=>k==='authorization'?'Bearer '+t:null},body});
function fixture(config={}){
 const calls=[],records={
  'scotty_p5_agent_pulse':['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B'],
  'scotty_p5_agent_iris':['SYN-MEM-IRIS-A'],
  'scotty_p5_agent_pulse_other':['SYN-MEM-PULSE-OTHER']
 };
 const bindings=[
  ['agent-creative-pulse','synthetic','scotty_p5_agent_pulse'],
  ['agent-creative-iris','synthetic','scotty_p5_agent_iris'],
  ['agent-creative-pulse','SYN-PROJECT-OTHER','scotty_p5_agent_pulse_other']
 ].map(([agentId,projectId,login])=>({
  agentId,projectId,login,sql:{unsafe:async(sql,params)=>{
   calls.push({login,sql,params});
   if(config.failSql)throw Error('sensitive sql failure');
   if(sql.startsWith('select current_database()'))
    return [{db:'scotty_phase5_synthetic_test',login:config.wrongDbLogin?'scotty_p5_agent_iris':login,session:login}];
   if(sql.startsWith('select memory_id'))
    return records[login].map(memory_id=>({memory_id}));
   throw Error('unexpected SQL query');
  }}
 }));
 const preview=createPhase5SyntheticAgentMemoryPreview({
  enabled:true,now:()=>NOW,
  trustedKeys:{[kid]:{issuer,active:true,publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'})}},
  dbBindings:bindings,
  isAgentSessionRevoked:async()=>Boolean(config.revoked),
  verifyActiveAgentMembership:async identity=>!config.inactive&&
   (identity.agentId==='agent-creative-pulse'||identity.agentId==='agent-creative-iris'),
  ...config.overrides
 });
 return {preview,calls,bindings};
}
const deny=async (name,opts,reason='SYNTHETIC_AGENT_IDENTITY_REJECTED')=>
 test(name,async()=>{
  const {preview,calls}=fixture(opts?.fixture||{});
  const result=await preview({request:request(opts?.token??token()),...opts?.patch});
  assert.equal(result.decision,'DENY');assert.equal(result.reason,reason);
  assert.equal(result.actualPermissionGranted,false);
  if(opts?.expectNoDb)assert.equal(calls.length,0);
 });
test('requires independently provisioned trust store and complete three role bindings',()=>{
 assert.throws(()=>createPhase5SyntheticAgentMemoryPreview(),/TRUSTED_SYNTHETIC_AGENT_DEPENDENCIES_REQUIRED/);
 assert.throws(()=>createPhase5SyntheticAgentMemoryPreview({trustedKeys:{},dbBindings:[],verifyActiveAgentMembership:async()=>true,isAgentSessionRevoked:async()=>false}),/TRUSTED_SYNTHETIC_AGENT_DEPENDENCIES_REQUIRED/);
});
test('disabled by default, no DB read',async()=>{
 const {bindings,calls}=fixture();
 const preview=createPhase5SyntheticAgentMemoryPreview({
  enabled:false,now:()=>NOW,dbBindings:bindings,
  trustedKeys:{[kid]:{issuer,active:true,publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'})}},
  isAgentSessionRevoked:async()=>false,verifyActiveAgentMembership:async()=>true
 });
 const result=await preview({request:request()});
 assert.equal(result.decision,'DENY');assert.equal(result.reason,'PHASE5_MEMORY_IDENTITY_DISABLED');assert.equal(calls.length,0);
});
test('signed Pulse session previews only Pulse synthetic metadata',async()=>{
 const {preview,calls}=fixture();
 const result=await preview({request:request(token(),{role:'chief',agentId:'agent-creative-iris'})});
 assert.equal(result.decision,'SIMULATED_MEMORY_METADATA');
 assert.deepEqual(result.memoryIds,['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
 assert.equal(result.actualPermissionGranted,false);assert.equal(result.memoryWrites,0);
 assert.equal(calls.length,2);assert.deepEqual(calls[1].params,['synthetic','agent-creative-pulse']);
});
test('signed Iris identity selects Iris independent DB login',async()=>{
 const {preview,calls}=fixture();
 const result=await preview({request:request(token({...claims,sub:'agent-creative-iris',jti:'SYN-AGENT-SESSION-IRIS001'}))});
 assert.equal(result.decision,'SIMULATED_MEMORY_METADATA');assert.deepEqual(result.memoryIds,['SYN-MEM-IRIS-A']);
 assert.ok(calls.every(c=>c.login==='scotty_p5_agent_iris'));
});
test('same agent signed into other project cannot use previous project pool',async()=>{
 const {preview,calls}=fixture();
 const result=await preview({request:request(token({...claims,projectId:'SYN-PROJECT-OTHER',jti:'SYN-AGENT-SESSION-OTHER01'}))});
 assert.deepEqual(result.memoryIds,['SYN-MEM-PULSE-OTHER']);
 assert.ok(calls.every(c=>c.login==='scotty_p5_agent_pulse_other'));
});
test('concurrent identities never cross-select pools',async()=>{
 const {preview,calls}=fixture();
 const cases=[
  claims,{...claims,sub:'agent-creative-iris',jti:'SYN-AGENT-SESSION-IRIS002'},
  {...claims,projectId:'SYN-PROJECT-OTHER',jti:'SYN-AGENT-SESSION-OTHER02'}
 ];
 const r=await Promise.all(cases.map(c=>preview({request:request(token(c))})));
 assert.deepEqual(r.map(x=>x.memoryIds),[
  ['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B'],['SYN-MEM-IRIS-A'],['SYN-MEM-PULSE-OTHER']
 ]);
 assert.equal(calls.length,6);
});
await deny('request-supplied agent ID cannot override signed identity',{patch:{agentId:'agent-creative-iris'},expectNoDb:true});
await deny('request-supplied project cannot override signed project',{patch:{projectId:'SYN-PROJECT-OTHER'},expectNoDb:true});
await deny('shared-memory read attempt fails closed',{patch:{scope:'shared'},expectNoDb:true});
await deny('department-memory read attempt fails closed',{patch:{scope:'departmental'},expectNoDb:true});
await deny('actual memory:read action is not enabled',{patch:{action:'memory:read'},expectNoDb:true});
await deny('wrong session audience fails closed',{token:token({...claims,aud:'another-app'}),expectNoDb:true});
await deny('wrong issuer fails closed',{token:token({...claims,iss:'another-issuer'}),expectNoDb:true});
await deny('wrong token algorithm fails closed',{token:token(claims,{...header,alg:'HS256'}),expectNoDb:true});
await deny('forged signature fails closed',{token:token(claims,header,wrong.privateKey),expectNoDb:true});
await deny('unknown key ID fails closed',{token:token(claims,{...header,kid:'SYN-AGENT-KEY-UNKNOWN'}),expectNoDb:true});
await deny('expired session fails closed',{token:token({...claims,exp:Math.floor(NOW/1000)-1}),expectNoDb:true});
await deny('future session fails closed',{token:token({...claims,nbf:Math.floor(NOW/1000)+60}),expectNoDb:true});
await deny('invalid agent not on synthetic roster fails closed',{token:token({...claims,sub:'agent-creative-fake'}),expectNoDb:true});
await deny('token-claimed permissions are rejected',{token:token({...claims,permissions:['memory:write']}),expectNoDb:true});
await deny('stale revoked session fails closed',{fixture:{revoked:true},expectNoDb:true});
await deny('inactive agent membership fails closed',{fixture:{inactive:true},expectNoDb:true});
await deny('database role mismatch fails closed',{fixture:{wrongDbLogin:true}});
await deny('database outage fails closed',{fixture:{failSql:true}});
test('wrong preconfigured DB mapping fails at construction',()=>{
 const f=fixture();
 const wrongBindings=f.bindings.map(r=>r.agentId==='agent-creative-iris'?{...r,login:'scotty_p5_agent_pulse'}:r);
 assert.throws(()=>createPhase5SyntheticAgentMemoryPreview({
  trustedKeys:{[kid]:{issuer,active:true,publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'})}},
  dbBindings:wrongBindings,verifyActiveAgentMembership:async()=>true,isAgentSessionRevoked:async()=>false
 }),/INVALID_SYNTHETIC_DB_BINDING/);
});
