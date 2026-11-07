import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code} from './steps/memory-access-preview.mjs';
const roster=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
const make=(scope)=>({id:'synthetic-'+scope,cells:{
  Scope:scope,'Owner Review Required':'Yes',
  'Current Backend Verification':'Unavailable — deny','Memory Content':'None — policy only',
  'Automatic Promotion':'Never'
}});
const policyRows=['agent','department','shared','project'].map(make);
test('self-scoped memory hint does not authorize reads or writes',async()=>{
 const r=await code({roster,policyRows,actorId:'agent-geordi-02',targetAgentId:'agent-geordi-02',scope:'agent'});
 assert.equal(r.metadataEligible,true);
 assert.equal(r.status,'DENIED_PENDING_PROTECTED_BACKEND');
 for(const key of ['memoryReadAllowed','memoryWriteAllowed','backendSessionVerified','ownerApprovedGrantVerified','grantCreated','privateMemoryLoaded'])assert.equal(r[key],false);
 assert.equal(r.memoryReads,0);assert.equal(r.memoryWrites,0);
});
test('cross-agent and cross-department requests remain denied',async()=>{
 for(const [scope,target] of [['agent','agent-worf-01'],['department','agent-worf-01'],['project','agent-geordi-02'],['shared','agent-geordi-02']]){
   const r=await code({roster,policyRows,actorId:'agent-geordi-02',targetAgentId:target,scope,projectId:'eirden-atelier'});
   assert.equal(r.metadataEligible,false);
   assert.equal(r.memoryReadAllowed,false);
   assert.equal(r.projectMembershipVerified,false);
 }
});
test('changed policy, fake roster or duplicate scope fails closed',async()=>{
 const check=(rows,r=roster)=>code({roster:r,policyRows:rows,actorId:'agent-geordi-02',targetAgentId:'agent-geordi-02',scope:'agent'});
 await assert.rejects(()=>check(policyRows.map((r,i)=>i===0?make('department'):r)));
 await assert.rejects(()=>check(policyRows.map((r,i)=>i===0?{...make('agent'),cells:{...make('agent').cells,'Current Backend Verification':'Verified by backend'}}:r)));
 await assert.rejects(()=>check(policyRows,{...roster,live_roster_verified:true}));
 await assert.rejects(()=>code({roster,policyRows,actorId:'unknown-agent',targetAgentId:'agent-geordi-02',scope:'agent'}));
});
