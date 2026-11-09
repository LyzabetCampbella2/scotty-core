import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createPhase5SyntheticMemoryGateway} from './phase5-unified-memory-gateway.mjs';

const NOW=Date.parse('2026-11-09T19:00:00Z');
const action='synthetic-memory:preview',issuer='scotty-p5-synthetic-agent-idp';
const key=generateKeyPairSync('ed25519'),attacker=generateKeyPairSync('ed25519');
const kid='SYN-AGENT-KEY-001',header={alg:'EdDSA',typ:'SCOTTY-P5-SYNTHETIC-AGENT',kid};
const claims={iss:issuer,aud:'scotty-p5-synthetic-memory-preview',
 sub:'agent-creative-pulse',projectId:'synthetic',scope:'individual',purpose:action,
 jti:'SYN-AGENT-SESSION-GATEWAY001',iat:Math.floor(NOW/1000)-30,
 nbf:Math.floor(NOW/1000)-30,exp:Math.floor(NOW/1000)+90,version:1};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=(c=claims,privateKey=key.privateKey)=>{
 const data=b64(header)+'.'+b64(c);
 return data+'.'+sign(null,Buffer.from(data),privateKey).toString('base64url');
};
const request=(jwt=token(),body={})=>({headers:{get:k=>k==='authorization'?'Bearer '+jwt:null},body});
function harness(opts={}){
 const audits=[],operations=[],seen={reads:0,proofCalls:0};
 const records={
   scotty_p5_agent_pulse:['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B'],
   scotty_p5_agent_iris:['SYN-MEM-IRIS-A'],
   scotty_p5_agent_pulse_other:['SYN-MEM-PULSE-OTHER']
 };
 const dbBindings=[
  ['agent-creative-pulse','synthetic','scotty_p5_agent_pulse'],
  ['agent-creative-iris','synthetic','scotty_p5_agent_iris'],
  ['agent-creative-pulse','SYN-PROJECT-OTHER','scotty_p5_agent_pulse_other']
 ].map(([agentId,projectId,login])=>({
  agentId,projectId,login,sql:{unsafe:async (sql,args)=>{
   seen.reads++;operations.push({query:sql,args,role:login});
   if(opts.sqlDown)throw Error('PRIVATE_DB_FAILURE');
   if(sql.startsWith('select current_database()'))return [{
     db:'scotty_phase5_synthetic_test',
     login:opts.wrongRole?'scotty_p5_agent_unmapped':login,session:login
   }];
   if(sql.startsWith('select memory_id'))return records[login].map(memory_id=>({memory_id}));
   throw Error('INVALID_SYNTHETIC_QUERY');
  }}
 }));
 const coordinatorSql={begin:async fn=>fn({unsafe:async(statement,params)=>{
  operations.push({query:statement,args:params,role:'coordinator'});
  if(opts.controlDown)throw Error('PRIVATE_STOP_FAILURE');
  if(statement.startsWith('select scope,stopped,version'))return opts.missingStop?[]:[{
   scope:'synthetic',stopped:opts.stopped!==false,version:7
  }];
  if(statement.startsWith('insert into scotty_p5_synthetic_memory_request_audit')){
   if(opts.auditDown)throw Error('PRIVATE_AUDIT_FAILURE');
   audits.push(params);return {count:1};
  }
  throw Error('INVALID_SYNTHETIC_CONTROL_QUERY');
 }})};
 const gateway=createPhase5SyntheticMemoryGateway({
  enabled:opts.enabled??true,now:()=>NOW,coordinatorSql,dbBindings,
  trustedKeys:{[kid]:{issuer,active:true,publicKeyPem:key.publicKey.export({type:'spki',format:'pem'})}},
  isAgentSessionRevoked:async()=>opts.revoked===true,
  verifyActiveAgentMembership:async()=>opts.inactive!==true
 });
 const execute=(args={})=>gateway.execute({request:request(),action,...args});
 return {gateway,execute,audits,seen,operations};
}
test('constructor rejects missing trusted coordinator and agent trust',()=>{
 assert.throws(()=>createPhase5SyntheticMemoryGateway(),/TRUSTED_SYNTHETIC_GATEWAY_COORDINATOR_REQUIRED/);
 assert.throws(()=>createPhase5SyntheticMemoryGateway({coordinatorSql:{begin:async()=>{}}}),/TRUSTED_SYNTHETIC_AGENT_DEPENDENCIES_REQUIRED/);
});
test('unified gateway exposes exactly one immutable execute method',()=>{
 const {gateway}=harness();assert.ok(Object.isFrozen(gateway));
 assert.deepEqual(Object.keys(gateway),['execute']);assert.equal(typeof gateway.execute,'function');
 assert.equal(gateway.preview,undefined);assert.equal(gateway.sql,undefined);
 assert.equal(gateway.coordinatorSql,undefined);assert.equal(gateway.disableStop,undefined);
});
test('disabled is default and calls no DB or audit services',async()=>{
 const h=harness({enabled:false});const r=await h.execute();
 assert.equal(r.reason,'PHASE5_GATEWAY_DISABLED');assert.equal(r.actualPermissionGranted,false);
 assert.equal(r.auditPersisted,false);assert.equal(h.operations.length,0);
});
test('stopped default denies and audits before consulting identity or memories',async()=>{
 const h=harness();const r=await h.execute();
 assert.equal(r.reason,'SYNTHETIC_MEMORY_STOPPED');
 assert.equal(r.auditPersisted,true);assert.equal(h.seen.reads,0);
 assert.deepEqual(h.audits,[['DENY','SYNTHETIC_MEMORY_STOPPED',7]]);
});
test('missing stop denies and redacted audit persists',async()=>{
 const h=harness({missingStop:true});const r=await h.execute();
 assert.equal(r.reason,'SYNTHETIC_MEMORY_STOP_MISSING');
 assert.equal(h.seen.reads,0);assert.equal(r.auditPersisted,true);
});
test('open stop allows only audited signed synthetic memory IDs',async()=>{
 const h=harness({stopped:false});const r=await h.execute();
 assert.equal(r.decision,'SIMULATED_MEMORY_METADATA');assert.equal(r.actualPermissionGranted,false);
 assert.equal(r.auditPersisted,true);assert.equal(r.emergencyStopChecked,true);
 assert.deepEqual(r.memoryIds,['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
 assert.equal(r.memoryWrites,0);assert.equal(r.externalCalls,0);
 assert.deepEqual(h.audits,[['SIMULATED_MEMORY_METADATA','SYNTHETIC_MEMORY_PREVIEW_OK',7]]);
});
test('gateway never accepts unsupported action, even with signed session',async()=>{
 const h=harness({stopped:false});const r=await h.execute({action:'memory:read'});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 assert.equal(h.seen.reads,0);
 assert.deepEqual(h.audits,[['DENY','SYNTHETIC_AGENT_IDENTITY_REJECTED',7]]);
});
test('request without explicit synthetic action is denied and audited',async()=>{
 const h=harness({stopped:false});
 const r=await h.gateway.execute({request:request()});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);assert.equal(h.seen.reads,0);
});
test('unsupported callback and escalation flags cannot be injected',async()=>{
 const h=harness({stopped:false});
 for(const [k,v] of [['forceAllow',true],['disableAudit',true],['writeMemory',true],['__proto__','x']]){
  const r=await h.gateway.execute({request:request(),action,[k]:v});
  assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 }
 assert.equal(h.seen.reads,0);assert.equal(h.audits.length,4);
});
test('cross-agent identity request denied, audited without memory read',async()=>{
 const h=harness({stopped:false});
 const r=await h.execute({agentId:'agent-creative-iris'});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 assert.equal(h.seen.reads,0);
});
test('cross-project identity request denied, audited',async()=>{
 const h=harness({stopped:false});
 const r=await h.execute({projectId:'SYN-PROJECT-OTHER'});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 assert.equal(h.seen.reads,0);
});
test('departmental and shared memory cannot be requested through gateway',async()=>{
 const h=harness({stopped:false});
 for(const scope of ['departmental','shared']){
  const r=await h.execute({scope});
  assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 }
 assert.equal(h.seen.reads,0);
});
test('forged signed agent is denied with one redacted audit entry',async()=>{
 const h=harness({stopped:false});
 const secret='NEVER-LOG-BEARER';
 const r=await h.gateway.execute({request:request(token(claims,attacker.privateKey),{password:secret}),action});
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 assert.equal(JSON.stringify(h.audits).includes(secret),false);
 assert.equal(h.seen.reads,0);
});
test('revoked and inactive agents cannot access metadata but are audited',async()=>{
 for(const opts of [{revoked:true},{inactive:true}]){
  const h=harness({...opts,stopped:false});const r=await h.execute();
  assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
  assert.equal(h.seen.reads,0);
 }
});
test('wrong PostgreSQL pool login cannot return memory IDs',async()=>{
 const h=harness({stopped:false,wrongRole:true});const r=await h.execute();
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 assert.equal(r.memoryIds,undefined);
});
test('audit unavailable denies and hides otherwise eligible IDs',async()=>{
 const h=harness({stopped:false,auditDown:true});const r=await h.execute();
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
 assert.equal(r.memoryIds,undefined);assert.equal(r.actualPermissionGranted,false);
});
test('stop unavailable denies without identity lookup, does not fabricate audit receipt',async()=>{
 const h=harness({stopped:false,controlDown:true});const r=await h.execute();
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,false);
 assert.equal(h.seen.reads,0);
});
test('database errors never disclose exception text or memory IDs',async()=>{
 const h=harness({stopped:false,sqlDown:true});const r=await h.execute();
 assert.equal(r.decision,'DENY');assert.equal(r.auditPersisted,true);
 assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
 assert.equal(r.memoryIds,undefined);
});
test('no synthetic enabled result ever sets actualPermissionGranted true',async()=>{
 const scenarios=[{}, {stopped:false}, {missingStop:true}, {stopped:false,wrongRole:true},
  {stopped:false,auditDown:true},{stopped:false,inactive:true}];
 const r=await Promise.all(scenarios.map(async opts=>{
  const h=harness(opts);return h.execute();
 }));
 assert.ok(r.every(x=>x.actualPermissionGranted===false));
});
