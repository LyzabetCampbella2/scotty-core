import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster,creativeMediaDevelopmentRoster} from './connected-roster.mjs';
import {INDIVIDUAL_BRAINS,BRAIN_SPEC_VERSION,agentBrain,buildIndividualBrains,roleResponsePreview} from './individual-agent-brains.mjs';

const common='Create a reviewable plan for a new application feature with evidence, risks, timeline and acceptance criteria.';
test('all canonical 185 roster identities receive stable distinct phase 1 specifications',()=>{
 const roster=connectedRoster();
 assert.equal(roster.length,185);
 assert.equal(INDIVIDUAL_BRAINS.length,185);
 assert.deepEqual(INDIVIDUAL_BRAINS.map(x=>x.id),roster.map(x=>x.id));
 assert.equal(INDIVIDUAL_BRAINS.filter(x=>x.role==='chief').length,25);
 assert.equal(INDIVIDUAL_BRAINS.filter(x=>x.role==='specialist').length,160);
 assert.equal(new Set(INDIVIDUAL_BRAINS.map(x=>x.id)).size,185);
 assert.equal(new Set(INDIVIDUAL_BRAINS.map(x=>x.prompt)).size,185);
 assert.equal(new Set(INDIVIDUAL_BRAINS.map(x=>x.persona.identityContext)).size,185);
 assert.ok(INDIVIDUAL_BRAINS.every(b=>b.schemaVersion===BRAIN_SPEC_VERSION));
 for(const b of INDIVIDUAL_BRAINS){
  assert.ok(b.persona.voice);
  assert.ok(b.reasoningInstructions.length>40);
  assert.ok(b.workingMethod.length>=4);
  assert.ok(b.specialties.length>=1);
  assert.ok(b.limitations.length>=5);
  assert.ok(b.completionStandards.length>=3);
  assert.equal(b.communication.mandatoryReview,true);
  assert.deepEqual(b.grantedToolIds,[]);
  assert.ok(b.suggestedTools.every(x=>x.granted===false));
  assert.equal(b.developmentStatus,'SPEC_ONLY_NOT_EXECUTING');
  assert.match(b.prompt,/Do not claim execution/);
  assert.match(b.questionnaireProvenance,/separately merged/);
 }
});
test('all agents return differentiated, scoped deterministic dry-run plans on same task',()=>{
 const previews=INDIVIDUAL_BRAINS.map(b=>roleResponsePreview(b.id,common));
 assert.equal(previews.length,185);
 assert.equal(new Set(previews.map(x=>x.answer)).size,185);
 assert.equal(new Set(previews.map(x=>x.agentId+'|'+x.deliverable)).size,185);
 assert.ok(previews.every(x=>x.mode==='DETERMINISTIC_DRY_RUN'&&x.toolCalls===0&&x.memoryWrites===0&&!x.executed));
 assert.ok(previews.every(x=>x.reviewerId));
});
test('RIKER, GEORDI and TROI use materially different reasoning, style, review and outputs',()=>{
 const ids=['chief-riker','chief-geordi','chief-expansion-troi'];
 const brains=ids.map(agentBrain);
 assert.equal(new Set(brains.map(b=>b.persona.voice)).size,3);
 assert.equal(new Set(brains.map(b=>b.reasoningInstructions)).size,3);
 assert.ok(brains[0].reasoningInstructions.includes('schedules'));
 assert.ok(brains[1].reasoningInstructions.includes('reproducible tests'));
 assert.match(brains[2].reasoningInstructions,/accessibility|supportive communication|inclusive design/i);
 assert.equal(brains[0].chiefId,'scotty');
 assert.equal(brains[1].chiefId,'scotty');
 assert.equal(brains[2].chiefId,'scotty');
 assert.ok(brains.every(x=>x.role==='chief'));
});
test('specialists remain separate from chiefs and carry exact job-specific methods',()=>{
 const front=agentBrain('agent-geordi-02');
 const backend=agentBrain('agent-geordi-01');
 const qa=agentBrain('agent-expansion-038');
 assert.equal(front.role,'specialist');
 assert.equal(front.chiefId,'chief-geordi');
 assert.match(front.focus,/Frontend/i);
 assert.match(backend.focus,/Backend/i);
 assert.notEqual(front.reasoningInstructions,backend.reasoningInstructions);
 assert.notDeepEqual(front.completionStandards,qa.completionStandards);
 assert.ok(front.workingMethod.some(s=>/semantic markup|responsive/i.test(s)));
 assert.ok(backend.workingMethod.some(s=>/validation|authorization/i.test(s)));
 assert.equal(qa.chiefId,'chief-expansion-torres');
});
test('repeated compilation is deterministic; caller edits cannot mutate stored agent brain',()=>{
 const first=buildIndividualBrains();
 const second=buildIndividualBrains();
 assert.deepEqual(first,second);
 const copy=agentBrain('chief-riker');
 copy.name='FORGED';
 copy.grantedToolIds.push('production-deploy');
 assert.equal(agentBrain('chief-riker').name,'RIKER');
 assert.deepEqual(agentBrain('chief-riker').grantedToolIds,[]);
});
test('identity changes, orphans and missing agents are rejected',()=>{
 const base=connectedRoster();
 assert.throws(()=>buildIndividualBrains(base.slice(1)),/EXPECTED_185_ROSTER/);
 assert.throws(()=>buildIndividualBrains([...base.slice(0,184),{...base[0]}]),/DUPLICATE_AGENT_ID/);
 const orphan=structuredClone(base);
 orphan.find(a=>!a.isChief).chiefId='chief-does-not-exist';
 assert.throws(()=>buildIndividualBrains(orphan),/ORPHAN_SPECIALIST/);
 assert.throws(()=>agentBrain('chief-does-not-exist'),/UNKNOWN_AGENT_ID/);
 assert.throws(()=>roleResponsePreview('chief-riker',''),/INVALID_COMMON_TASK/);
});
test('optional LUMEN extension is separate from Phase 1 canonical roster and not silently merged',()=>{
 const optional=creativeMediaDevelopmentRoster();
 assert.equal(optional.roster.length,189);
 assert.equal(optional.counts.proposedTotal,189);
 assert.equal(optional.mergedIntoProduction,false);
 assert.equal(INDIVIDUAL_BRAINS.length,185);
 assert.throws(()=>buildIndividualBrains(optional.roster),/EXPECTED_185_ROSTER/);
});
test('no phase 1 brain claims actual private memory, live tools, factual certification or executed work',()=>{
 for(const b of INDIVIDUAL_BRAINS){
  assert.equal(b.authoredKnowledgeStatus,'methodology-only-not-fact-certified');
  assert.ok(b.limitations.some(x=>/private memory/.test(x)));
  assert.ok(b.limitations.some(x=>/publishing/.test(x)));
  assert.ok(b.limitations.some(x=>/not professional accreditation/.test(x)));
  assert.ok(!b.grantedToolIds.length);
  const response=roleResponsePreview(b.id,common);
  assert.equal(response.executed,false);
 }
});


test('same-task work contracts differ substantively by owner-recorded chief procedure',()=>{
 const task='Prepare a reliable, accessible plan for launching a fictional client service.';
 const [r,g,t]=['chief-riker','chief-geordi','chief-expansion-troi']
   .map(id=>roleResponsePreview(id,task));
 const signatures=[r,g,t].map(x=>JSON.stringify([
   x.workContract.method,x.workContract.deliverable,x.workContract.acceptanceCheck
 ]));
 assert.equal(new Set(signatures).size,3);
 assert.match(r.workContract.method,/before every new task or project/i);
 assert.match(g.workContract.method,/reliability and security/i);
 assert.match(t.workContract.method,/balanced emotional understanding/i);
 assert.equal(r.workContract.approvalState,'NOT_AUTHORIZED_TO_EXECUTE');
 assert.ok([r,g,t].every(x=>x.workContract.handoffTo==='scotty'));
 assert.ok([r,g,t].every(x=>x.toolCalls===0&&x.memoryWrites===0&&!x.executed));
});
test('compiled brain registry cannot be modified through exported references',()=>{
 const r=INDIVIDUAL_BRAINS.find(x=>x.id==='chief-riker');
 assert.ok(Object.isFrozen(r));
 assert.ok(Object.isFrozen(r.workingMethod));
 assert.ok(Object.isFrozen(r.ownerDesign.recordedSelections));
 assert.throws(()=>{r.workingMethod.push('Unapproved instruction');},TypeError);
 assert.throws(()=>{r.grantedToolIds.push('production-deploy');},TypeError);
 assert.throws(()=>{r.ownerDesign.recordedSelections.beforeNewTask=false;},TypeError);
 assert.equal(agentBrain('chief-riker').ownerDesign.recordedSelections.beforeNewTask,true);
});
