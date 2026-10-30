import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster} from './connected-roster.mjs';
import {brainProfile} from './team-expansion.mjs';
import {buildSpecialistGuides} from './specialist-playbooks.mjs';
import {DEPARTMENT_PATTERNS} from './department-methods.mjs';
import {selectTeam,previewTeamKnowledge} from './team-runtime.mjs';
const roster=connectedRoster();
test('all 160 specialists have unique authored playbooks with procedures, examples and honest limits',()=>{
 const guides=buildSpecialistGuides(roster);
 assert.equal(guides.length,160);
 assert.equal(new Set(guides.map(g=>g.id)).size,160);
 for(const g of guides){
  assert.ok(g.procedure.length>=3);
  assert.ok(g.workedExample.length>30);
  assert.ok(g.boundaries.length>=2);
  assert.equal(g.reviewed,false);
  assert.equal(g.evaluation.automatedFactualVerification,false);
  assert.ok(g.candidateReferences.every(x=>x.verified===false));
 }
 const a=roster.find(x=>!x.isChief);
 assert.equal(brainProfile(a).specialistPlaybook.agentId,a.id);
});
test('owner exact specialist ID overrides broad heuristics with truthful reason',()=>{
 const agent=roster.find(x=>!x.isChief);
 const plan=selectTeam(roster,'Use specialist '+agent.id+': Review a fictional checklist',1);
 assert.equal(plan.assignments[0].agentId,agent.id);
 assert.match(plan.assignments[0].selectionReason,/Explicit owner/);
});
test('unknown specialist name causes clarification and no selections',()=>{
 const plan=selectTeam(roster,'Use specialist Not-A-Real-Agent: Review a fictional checklist',1);
 assert.equal(plan.status,'needs-clarification');assert.equal(plan.assignments.length,0);assert.equal(plan.maxCalls,0);
});
test('previews contain the correct specialist playbook and selected team reason with zero AI calls',async()=>{
 const agent=roster.find(x=>!x.isChief);
 const view=await previewTeamKnowledge({roster,question:'Use specialist '+agent.id+': Review a fictional checklist',getEvidence:async()=>[]});
 assert.equal(view.providerCalls,0);assert.equal(view.memoryWrites,0);
 assert.equal(view.readers[0].agentId,agent.id);
 assert.equal(view.readers[0].specialistPlaybook.agentId,agent.id);
 assert.match(view.readers[0].selectionReason,/Explicit owner/);
});

test('all 25 specialist departments have non-generic authored procedures and safe synthetic examples',()=>{
 const guides=buildSpecialistGuides(roster);
 assert.equal(Object.keys(DEPARTMENT_PATTERNS).length,25);
 assert.equal(new Set(guides.map(g=>g.department)).size,25);
 for(const guide of guides){
  assert.ok(DEPARTMENT_PATTERNS[guide.department],guide.department);
  assert.ok(['specialty-specific','department-specific'].includes(guide.methodCoverage));
  assert.ok(guide.procedure[0].length>30);
  assert.ok(guide.workedExample.length>45);
  assert.equal(guide.departmentPatternCount,25);
  assert.equal(guide.reviewed,false);
  assert.ok(!guide.procedure.some(x=>x.includes('Define the actual deliverable and its constraints in ')));
 }
});
