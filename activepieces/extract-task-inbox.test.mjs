import test from 'node:test';
import assert from 'node:assert/strict';
import {code} from './steps/extract-task-inbox.mjs';
const row=(fields,id='test-row')=>({id,cells:Object.fromEntries(Object.entries(fields).map(([k,v],i)=>[String(i),{fieldName:k,value:v}]))});
test('only public or synthetic New tasks are selected; no action taken',async()=>{
 const r=await code({rows:[
  row({'Task ID':'task-1','Project':'Example','Task Description':'frontend engineering and testing','Review Status':'New','Data Class':'Public or synthetic'}),
  row({'Task ID':'task-2','Project':'Private','Task Description':'private medical history','Review Status':'New','Data Class':'Private — blocked'})
 ]});
 assert.equal(r.status,'PREVIEW_INPUT_READY');assert.equal(r.selectedTask.taskId,'task-1');
 assert.equal(r.eligiblePublicTasks,1);assert.equal(r.privateDataRead,false);
 assert.equal(r.liveMissionCreated,false);assert.equal(r.externalWrites,0);
});
test('returns empty when all tasks blocked or already reviewed',async()=>{
 const r=await code({rows:[row({'Task ID':'private','Task Description':'secret','Review Status':'New','Data Class':'Private — blocked'})]});
 assert.equal(r.status,'NO_ELIGIBLE_PUBLIC_TASKS');assert.equal(r.selectedTask,null);
});
test('rejects public task with malformed metadata',async()=>{
 await assert.rejects(()=>code({rows:[row({'Task ID':'abc','Task Description':'x'.repeat(501),'Review Status':'New','Data Class':'Public or synthetic'})]}));
});
