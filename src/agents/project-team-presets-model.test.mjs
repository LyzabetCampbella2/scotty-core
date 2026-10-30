import test from 'node:test';
import assert from 'node:assert/strict';
import {teamPresetInput,teamPresetState} from './project-team-presets-model.mjs';
const roster=[
 {id:'chief-story',isChief:true,state:'active'},
 {id:'agent-scene',isChief:false,chiefId:'chief-story',state:'active'},
 {id:'chief-design',isChief:true,state:'active'},
 {id:'agent-art',isChief:false,chiefId:'chief-design',state:'active'}
];
const original={name:'Bloodpool Writing Team',agentIds:['chief-story','agent-scene'],leadChiefId:'chief-story',
 expectedRevision:0,reviewed:true,approved:true};
test('owner-approved team is project bound and never grants permissions or runs AI',()=>{
 const result=teamPresetInput(original,'project-bloodpool',roster);
 assert.deepEqual(result.agentIds,['chief-story','agent-scene']);
 assert.equal(result.grantsPermissions,false);
 assert.equal(result.automaticallyStarted,false);
 assert.equal(result.expectedRevision,0);
});
test('team model enforces review and prevents unrelated agents or missing chiefs',()=>{
 for(const changed of [
  {...original,approved:false},
  {...original,reviewed:false},
  {...original,agentIds:['chief-story','agent-art']},
  {...original,agentIds:['agent-scene']},
  {...original,agentIds:['chief-story','agent-scene','agent-scene']},
  {...original,leadChiefId:'agent-scene'},
  {...original,expectedRevision:-1}
 ])assert.throws(()=>teamPresetInput(changed,'project-bloodpool',roster));
 assert.throws(()=>teamPresetInput(original,'../another-project',roster));
 assert.throws(()=>teamPresetInput(original,'project-bloodpool',roster.filter(a=>a.id!=='agent-scene')));
});
test('cross-department team requires an authorized chief for every specialist',()=>{
 const expanded={...original,agentIds:['chief-story','agent-scene','chief-design','agent-art']};
 const value=teamPresetInput(expanded,'project-bloodpool',roster);
 assert.equal(value.agentIds.length,4);
});
test('saved team becomes stale when membership is removed or paused',()=>{
 const saved={name:original.name,projectId:'project-bloodpool',agentIds:original.agentIds,leadChiefId:'chief-story',revision:2};
 const ok=teamPresetState(saved,roster);assert.equal(ok.active,true);
 const removed=teamPresetState(saved,roster.filter(x=>x.id!=='agent-scene'));
 assert.equal(removed.active,false);assert.deepEqual(removed.missingMemberIds,['agent-scene']);
 assert.equal(removed.autoShare,false);assert.equal(removed.autoRun,false);
 const paused=teamPresetState(saved,roster.map(x=>x.id==='agent-scene'?{...x,paused:true}:x));
 assert.equal(paused.requiresNewApproval,true);
});
