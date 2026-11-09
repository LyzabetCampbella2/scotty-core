/**
 * Disposable PostgreSQL bridge acceptance: temporary Ed25519 agent sessions
 * select only pre-provisioned database roles whose RLS permits fake memory IDs.
 * This file must run AFTER phase5-synthetic-memory-rls.integration.test.mjs
 * and ONLY on the disposable CI database. It never reads live SCOTTY memory.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import postgres from 'postgres';
import {createPhase5SyntheticAgentMemoryPreview} from './phase5-agent-memory-identity.mjs';

const DB='scotty_phase5_synthetic_test';
const NOW=Date.parse('2026-11-09T19:00:00Z');
const ISSUER='scotty-p5-synthetic-agent-idp',AUDIENCE='scotty-p5-synthetic-memory-preview';
const ACTION='synthetic-memory:preview';
const checked=(variable,login)=>{
 const raw=process.env[variable];
 if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE'||!raw)
   throw Error('DISPOSABLE_BRIDGE_EXPLICIT_OPT_IN_REQUIRED');
 const u=new URL(raw);
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/'+DB||decodeURIComponent(u.username)!==login||
    !u.password||u.search||u.hash)throw Error('REFUSING_NON_DISPOSABLE_DATABASE');
 return raw;
};
const admin=postgres(checked('P5_CI_ADMIN_URL','scotty_p5_admin'),{ssl:false,max:2,connect_timeout:5});
const pulse=postgres(checked('P5_CI_AGENT_PULSE_URL','scotty_p5_agent_pulse'),{ssl:false,max:2,connect_timeout:5});
const iris=postgres(checked('P5_CI_AGENT_IRIS_URL','scotty_p5_agent_iris'),{ssl:false,max:2,connect_timeout:5});
const other=postgres(checked('P5_CI_AGENT_PULSE_OTHER_URL','scotty_p5_agent_pulse_other'),{ssl:false,max:2,connect_timeout:5});
const key=generateKeyPairSync('ed25519');
const stranger=generateKeyPairSync('ed25519');
const kid='SYN-AGENT-KEY-001',header={alg:'EdDSA',typ:'SCOTTY-P5-SYNTHETIC-AGENT',kid};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const claims={iss:ISSUER,aud:AUDIENCE,sub:'agent-creative-pulse',projectId:'synthetic',
 scope:'individual',purpose:ACTION,jti:'SYN-AGENT-SESSION-DB001',
 iat:Math.floor(NOW/1000)-40,nbf:Math.floor(NOW/1000)-40,
 exp:Math.floor(NOW/1000)+90,version:1};
function token(payload=claims,privateKey=key.privateKey){
 const data=b64(header)+'.'+b64(payload);
 return data+'.'+sign(null,Buffer.from(data),privateKey).toString('base64url');
}
const req=(jwt,body={})=>({headers:{get:k=>k==='authorization'?'Bearer '+jwt:null},body});
const poolBindings=[
 {agentId:'agent-creative-pulse',projectId:'synthetic',login:'scotty_p5_agent_pulse',sql:pulse},
 {agentId:'agent-creative-iris',projectId:'synthetic',login:'scotty_p5_agent_iris',sql:iris},
 {agentId:'agent-creative-pulse',projectId:'SYN-PROJECT-OTHER',login:'scotty_p5_agent_pulse_other',sql:other}
];
const build=(opts={})=>createPhase5SyntheticAgentMemoryPreview({
 enabled:true,now:()=>NOW,
 trustedKeys:{[kid]:{issuer:ISSUER,active:true,publicKeyPem:key.publicKey.export({type:'spki',format:'pem'})}},
 dbBindings:poolBindings,
 isAgentSessionRevoked:async()=>false,
 verifyActiveAgentMembership:async()=>true,
 ...opts
});
const preview=(service,jwt=token(),props={})=>service({request:req(jwt),...props});

test('disposable signed-agent identity-to-PostgreSQL RLS bridge',async t=>{
 try{
  assert.equal((await admin`select current_database() as db`)[0].db,DB);
  const fixtures=await admin`select count(*)::int as n from scotty_p5_synthetic_memory_items`;
  assert.equal(fixtures[0].n,4);
  const accounts=await admin`select count(*)::int as n from scotty_p5_synthetic_memory_identity_acl`;
  assert.equal(accounts[0].n,3);
  const service=build();
  await t.test('signed Pulse accesses only synthetic Pulse memory metadata',async()=>{
   const r=await preview(service);
   assert.equal(r.decision,'SIMULATED_MEMORY_METADATA');
   assert.equal(r.actualPermissionGranted,false);
   assert.deepEqual(r.memoryIds,['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
  });
  await t.test('signed Iris accesses only synthetic Iris memory metadata',async()=>{
   const r=await preview(service,token({...claims,sub:'agent-creative-iris',jti:'SYN-AGENT-SESSION-DBIRIS'}));
   assert.deepEqual(r.memoryIds,['SYN-MEM-IRIS-A']);
  });
  await t.test('same signed agent in other project gets only other project memory',async()=>{
   const r=await preview(service,token({...claims,projectId:'SYN-PROJECT-OTHER',jti:'SYN-AGENT-SESSION-DBOTHER'}));
   assert.deepEqual(r.memoryIds,['SYN-MEM-PULSE-OTHER']);
  });
  await t.test('different signed subjects read simultaneously without crossing pools',async()=>{
   const tokens=[token(),token({...claims,sub:'agent-creative-iris',jti:'SYN-AGENT-SESSION-DBIRIS2'}),
     token({...claims,projectId:'SYN-PROJECT-OTHER',jti:'SYN-AGENT-SESSION-DBOTHER2'})];
   const r=await Promise.all(tokens.map(x=>preview(service,x)));
   assert.deepEqual(r.map(x=>x.memoryIds),[
    ['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B'],['SYN-MEM-IRIS-A'],['SYN-MEM-PULSE-OTHER']
   ]);
  });
  await t.test('signed Pulse cannot request Iris identity or other project',async()=>{
   for(const fields of [{agentId:'agent-creative-iris'},{projectId:'SYN-PROJECT-OTHER'}]){
    const r=await preview(service,token(),fields);
    assert.equal(r.decision,'DENY');assert.equal(r.actualPermissionGranted,false);
   }
  });
  await t.test('separately signed other owner project cannot borrow Pulse project',async()=>{
   const jwt=token({...claims,projectId:'SYN-PROJECT-OTHER',jti:'SYN-AGENT-SESSION-OTHER03'});
   const r=await preview(service,jwt,{projectId:'synthetic'});
   assert.equal(r.decision,'DENY');
  });
  await t.test('forged signature cannot reach any memory read',async()=>{
   const r=await preview(service,token(claims,stranger.privateKey));
   assert.equal(r.decision,'DENY');
  });
  await t.test('revoked signed session cannot reach database',async()=>{
   const r=await preview(build({isAgentSessionRevoked:async()=>true}));
   assert.equal(r.decision,'DENY');
  });
  await t.test('agent deactivation denies even with valid signed session and DB login',async()=>{
   const r=await preview(build({verifyActiveAgentMembership:async()=>false}));
   assert.equal(r.decision,'DENY');
  });
  await t.test('signed valid agent with miswired database client is rejected',async()=>{
   const wrongPool=poolBindings.map(row=>row.agentId==='agent-creative-iris'?
     {...row,sql:pulse}:row);
   const r=await preview(build({dbBindings:wrongPool}),
     token({...claims,sub:'agent-creative-iris',jti:'SYN-AGENT-SESSION-WRONGPOOL'}));
   assert.equal(r.decision,'DENY');
  });
  await t.test('cross-agent RLS cannot be bypassed by client-settable session variables',async()=>{
   await pulse.begin(async tx=>{
    await tx`select set_config('scotty.p5_agent_id','agent-creative-iris',true)`;
    const rows=await tx`select memory_id from scotty_p5_synthetic_memory_items order by memory_id`;
    assert.deepEqual(rows.map(x=>x.memory_id),['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
   });
  });
  await t.test('deactivating synthetic ACL blocks subsequent correctly signed request',async()=>{
   await admin`update scotty_p5_synthetic_memory_identity_acl set active=false
      where login_name='scotty_p5_agent_pulse' and project_id='synthetic'`;
   try{
    const r=await preview(service);
    assert.equal(r.decision,'SIMULATED_MEMORY_METADATA');
    assert.deepEqual(r.memoryIds,[]);
   }finally{
    await admin`update scotty_p5_synthetic_memory_identity_acl set active=true
      where login_name='scotty_p5_agent_pulse' and project_id='synthetic'`;
   }
  });
  await t.test('memory preview never grants writes, outbound calls, or live access',async()=>{
   const r=await preview(service);
   assert.equal(r.memoryWrites,0);
   assert.equal(r.externalCalls,0);
   assert.equal(r.actualPermissionGranted,false);
   for(const action of ['memory:read','memory:write','social:publish','ai:paid-call']){
    assert.equal((await preview(service,token(),{action})).decision,'DENY');
   }
  });
 }finally{
  await Promise.allSettled([admin.end({timeout:5}),pulse.end({timeout:5}),iris.end({timeout:5}),other.end({timeout:5})]);
 }
});
