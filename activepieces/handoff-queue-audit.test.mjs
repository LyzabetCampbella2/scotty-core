import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code} from './steps/handoff-queue-audit.mjs';
const directory=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
const row=(id,stage,from,to,depends='')=>({cells:{
 'Handoff ID':id,'Project ID':'eirden-atelier','Stage':stage,
 'From Agent ID':from,'To Reviewer ID':to,'Depends On':depends,
 'Review Status':'Proposed — not reviewed','Delivery Status':'Not sent — no messaging connection',
 'Execution Allowed':'No'}});
const entries=[
 row('sp-geordi','Specialist → Chief','agent-geordi-04','chief-geordi'),
 row('sp-worf','Specialist → Chief','agent-worf-01','chief-worf'),
 row('sp-zora','Specialist → Chief','agent-zora-08','chief-zora'),
 row('cross-worf','Chief → Chief','chief-worf','chief-geordi','sp-worf'),
 row('cross-zora','Chief → Chief','chief-zora','chief-geordi','sp-zora'),
 row('summary','Chief → SCOTTY','chief-geordi','scotty','cross-worf, cross-zora, sp-geordi')
];
const args={directory,queueRows:entries,projectId:'eirden-atelier'};
test('synthetic handoff queue validates dependencies and keeps execution disabled',async()=>{
 const r=await code(args);
 assert.equal(r.status,'VALID_PUBLIC_HANDOFF_QUEUE_ONLY');
 assert.deepEqual(r.counts,{specialistToChief:3,crossChief:2,chiefToScotty:1});
 assert.equal(r.handoffCount,6);assert.equal(r.dependencyEdges,5);
 for(const key of ['approvedForExecution','readyToSend','ownerReviewVerified','projectMembershipVerified'])assert.equal(r[key],false);
 for(const key of ['messagesSent','memoryReads','memoryWrites','assignmentsCreated','aiCalls','externalActions','missionStarts'])assert.equal(r[key],0);
});
test('forged approval, sent message or execution flag fails closed',async()=>{
 for(const [field,value] of [['Review Status','Approved for demo only'],['Delivery Status','Sent'],['Execution Allowed','Yes']]){
  const rows=structuredClone(entries);rows[0].cells[field]=value;
  await assert.rejects(()=>code({...args,queueRows:rows}),/UNSAFE_OR_DUPLICATED_HANDOFF/);
 }
});
test('missing dependencies, cycle and invalid chief-child relationship fail',async()=>{
 const missing=structuredClone(entries);missing[3].cells['Depends On']='nonexistent';
 await assert.rejects(()=>code({...args,queueRows:missing}),/MISSING_HANDOFF_DEPENDENCY/);
 const bad=structuredClone(entries);bad[0].cells['To Reviewer ID']='chief-worf';
 await assert.rejects(()=>code({...args,queueRows:bad}),/INVALID_SPECIALIST_CHIEF_LINK/);
 const cycle=structuredClone(entries);cycle[0].cells['Depends On']='summary';
 await assert.rejects(()=>code({...args,queueRows:cycle}),/CYCLIC_HANDOFF_DEPENDENCIES/);
});
test('wrong final coverage or modified roster is not accepted',async()=>{
 const bad=structuredClone(entries);bad[5].cells['Depends On']='cross-worf, sp-geordi';
 await assert.rejects(()=>code({...args,queueRows:bad}),/INVALID_SCOTTY_SYNTHESIS_DEPENDENCIES/);
 await assert.rejects(()=>code({...args,directory:{...directory,live_roster_verified:true}}),/INVALID_STAGING_QUEUE_SOURCE/);
});
