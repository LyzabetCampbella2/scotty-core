import test from 'node:test';
import assert from 'node:assert/strict';
import {code} from './steps/release-readiness.mjs';
const row=(i,status,area)=>({cells:{
 'Gate ID':'G'+String(i).padStart(2,'0'),'Gate':'Gate '+i,
 'Area':area,'Status':status,'Evidence':'Synthetic evidence for example '+i,
 'Required Next Proof':'Complete protected review '+i
}});
const rows=Array.from({length:11},(_,i)=>row(i+1,i<4?'Verified staging preview':'Blocked — implementation required',i<4?'Development tests':'Security'));
test('staging readiness displays 4 previews and 7 real blockers',async()=>{
 const x=await code({rows});
 assert.deepEqual(x.counts,{total:11,previewVerified:4,blocked:7});
 assert.equal(x.status,'DEVELOPMENT_PREVIEW_ONLY');
 for(const k of ['aiExecutionReady','permissionedMemoryReady','ownerMissionApprovalReady','productionReleaseReady','canExecute','canPublish','canDeploy'])assert.equal(x[k],false);
 assert.equal(x.modelCalls,0);assert.equal(x.memoryWrites,0);assert.equal(x.externalActions,0);
});
test('faking full readiness, duplicates or missing gates fails closed',async()=>{
 const forged=structuredClone(rows);forged[9].cells.Status='Verified staging preview';
 await assert.rejects(()=>code({rows:forged}),/PROTECTED_GATE_CANNOT_BE_VERIFIED/);
 await assert.rejects(()=>code({rows:rows.slice(1)}),/INCOMPLETE_STAGING_GATE_SET/);
 const duplicate=structuredClone(rows);duplicate[1].cells['Gate ID']='G01';
 await assert.rejects(()=>code({rows:duplicate}),/INVALID_OR_DUPLICATE_LAUNCH_GATE/);
});
