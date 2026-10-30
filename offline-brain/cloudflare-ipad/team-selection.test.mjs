import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster} from './connected-roster.mjs';
import {selectTeam,previewTeamKnowledge,runTeam} from './team-runtime.mjs';
const roster=connectedRoster();
test('every specialist can be explicitly selected with its own chief',async()=>{
 for(const a of roster.filter(a=>!a.isChief)){
  const question='Use specialist '+a.name+': give three fictional examples.';
  const plan=selectTeam(roster,question);
  assert.equal(plan.assignments[0].agentId,a.id);assert.equal(plan.chiefIds[0],a.chiefId);
  const preview=await previewTeamKnowledge({roster,question,getEvidence:async()=>[]});
  assert.match(preview.readers[0].selectionReason,/owner/);
  const result=await runTeam({roster,question,approved:true,AI:{run:async()=>({response:'Synthetic example'})}});
  assert.equal(result.results[0].agentId,a.id);assert.equal(result.results[1].agentId,a.chiefId);
 }
});
test('unknown or chief selection asks for clarification and makes no calls',async()=>{
 for(const name of ['Unknown Person',roster.find(a=>a.isChief).name]){
  let calls=0;const r=await runTeam({roster,question:'Use specialist '+name+': testing',approved:true,AI:{run:async()=>{calls++;}}});
  assert.equal(r.status,'needs-clarification');assert.equal(calls,0);
 }
});
test('automatic selections explain matching terms; two departments never duplicate chiefs',()=>{
 const p=selectTeam(roster,'engineering marketing software strategy',2);
 assert.equal(new Set(p.chiefIds).size,p.chiefIds.length);
 for(const a of p.assignments)assert.match(a.selectionReason,/Matched assignment terms:/);
});
