import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code} from './steps/demo-approval-ledger.mjs';
const directory=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
const row=(cells)=>({cells:Object.fromEntries(Object.entries(cells).map(([k,v],i)=>[String(i),{fieldName:k,value:v}]))});
const project=row({'Project ID':'eirden-atelier'});
const input={
 directory,
 projects:[project],
 decisions:['Demo approve','Demo reject','Pending'].map((decision,i)=>row({
  'Request ID':'demo-check-'+(i+1),'Project ID':'eirden-atelier',
  'Agent ID':'agent-geordi-02','Request Type':'assignment','Revision':'r1',
  Decision:decision,'Approval Authority':'Unverified — not authorized',
  'Execution Allowed':'No','Data Class':'Synthetic demonstration only'
 }))
};
test('all three decisions are recognized but never authorize real work',async()=>{
 const out=await code(input);
 assert.deepEqual(out.counts,{demoApproved:1,demoRejected:1,pending:1});
 assert.equal(out.actualOwnerApprovalsVerified,0);
 assert.equal(out.backendAuthorized,false);
 assert.equal(out.canExecute,false);
 assert.equal(out.missionStarts,0);
 assert.equal(out.privateMemoryReads,0);
 assert.equal(out.privateMemoryWrites,0);
 assert.ok(out.decisions.every(x=>x.canExecute===false&&x.backendAuthorization===false));
});
test('replay-like duplicate request ID and forged authority rejected',async()=>{
 const duplicate={...input,decisions:[input.decisions[0],input.decisions[0]]};
 await assert.rejects(()=>code(duplicate),/INVALID_OR_UNSAFE_DEMO_DECISION/);
 const clone=structuredClone(input);
 Object.values(clone.decisions[0].cells).find(c=>c.fieldName==='Approval Authority').value='verified';
 await assert.rejects(()=>code(clone),/INVALID_OR_UNSAFE_DEMO_DECISION/);
});
test('unknown project, bad revision and execution-enabled rows rejected',async()=>{
 for(const [field,v] of [['Project ID','unknown'],['Revision','r0'],['Execution Allowed','Yes'],['Agent ID','unknown-agent']]){
  const clone=structuredClone(input);
  Object.values(clone.decisions[0].cells).find(c=>c.fieldName===field).value=v;
  await assert.rejects(()=>code(clone));
 }
 await assert.rejects(()=>code({...input,directory:{...directory,live_roster_verified:true}}));
});
