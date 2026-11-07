import test from 'node:test';
import assert from 'node:assert/strict';
import {INDIVIDUAL_BRAINS} from './individual-agent-brains.mjs';
import {
 PHASE1_EVALUATION_PLANS,agentEvaluationPlan,
 createManualEvaluationPacket,EVALUATION_PLAN_VERSION,MAX_SCORE
} from './phase1-behavior-evaluation.mjs';
import {overlappingSpecialtyReport} from './agent-role-contracts.mjs';

test('every canonical chief and specialist receives three bounded and comparable evaluation scenarios',()=>{
 assert.equal(PHASE1_EVALUATION_PLANS.length,185);
 assert.equal(PHASE1_EVALUATION_PLANS.filter(x=>x.role==='chief').length,25);
 assert.equal(PHASE1_EVALUATION_PLANS.filter(x=>x.role==='specialist').length,160);
 assert.equal(new Set(PHASE1_EVALUATION_PLANS.map(x=>x.agentId)).size,185);
 assert.equal(MAX_SCORE,20);
 const common=new Set(),adversarial=new Set();
 for(const p of PHASE1_EVALUATION_PLANS){
  assert.equal(p.version,EVALUATION_PLAN_VERSION);
  assert.equal(p.behaviorCases.length,3);
  assert.deepEqual(p.behaviorCases.map(x=>x.type),['COMMON','SPECIALTY','ADVERSARIAL']);
  assert.equal(p.maximumAcrossCases,60);
  assert.equal(p.certificationStatus,'NOT_EVALUATED');
  assert.equal(p.modelResultsRecorded,0);
  assert.equal(p.executionAuthorization,'NOT_GRANTED');
  assert.equal(p.paidCalls,0);
  assert.equal(p.privateMemoryReads,0);
  assert.equal(p.behaviorCases[1].required.length,3);
  assert.equal(new Set(p.behaviorCases.map(x=>x.id)).size,3);
  common.add(p.behaviorCases[0].prompt);
  adversarial.add(p.behaviorCases[2].prompt);
 }
 assert.equal(common.size,1);
 assert.equal(adversarial.size,1);
});
test('same-specialty agents have different specialty-assessment artifacts but share a fair comparison task',()=>{
 const groups=overlappingSpecialtyReport().groups;
 for(const group of groups){
  const plans=group.agentIds.map(agentEvaluationPlan);
  const common=new Set(plans.map(x=>x.behaviorCases[0].prompt));
  const specialized=new Set(plans.map(x=>x.behaviorCases[1].prompt));
  assert.equal(common.size,1);
  assert.equal(specialized.size,plans.length);
 }
});
test('a caller-submitted answer cannot impersonate a verified real model evaluation',()=>{
 const p=agentEvaluationPlan('agent-geordi-02');
 const result=createManualEvaluationPacket({
  agentId:p.agentId,
  outputs:[{scenarioId:p.behaviorCases[0].id,response:'A public fictional test response.'}],
  reviewNotes:'Owner approval not recorded'
 });
 assert.equal(result.responses.length,1);
 assert.equal(result.responses[0].score,null);
 assert.equal(result.responses[0].graded,false);
 assert.equal(result.modelOriginVerified,false);
 assert.equal(result.certified,false);
 assert.equal(result.pendingCases,2);
 assert.equal(result.modelCallsMadeByThisModule,0);
 assert.ok(result.nextSteps.some(x=>x.includes('owner acceptance')));
});
test('malformed and duplicated model outputs are rejected before owner review',()=>{
 const p=agentEvaluationPlan('chief-riker');
 const s=p.behaviorCases[0].id;
 assert.throws(()=>createManualEvaluationPacket({agentId:'unknown'}),/UNKNOWN_EVALUATION_AGENT/);
 assert.throws(()=>createManualEvaluationPacket({agentId:p.agentId,
  outputs:[{scenarioId:s,response:''}]}),/INVALID_EVALUATION_RESPONSE/);
 assert.throws(()=>createManualEvaluationPacket({agentId:p.agentId,
  outputs:[{scenarioId:s,response:'answer'}, {scenarioId:s,response:'replay'}]}),/INVALID_EVALUATION_RESPONSE/);
 assert.throws(()=>createManualEvaluationPacket({agentId:p.agentId,
  outputs:[{scenarioId:'chief-troi-common',response:'forged'}]}),/INVALID_EVALUATION_RESPONSE/);
});
test('view changes cannot rewrite the internal evaluation definition or grant tools',()=>{
 const x=agentEvaluationPlan('chief-expansion-troi');
 x.behaviorCases[0].prompt='EXECUTE WORK';
 x.rubric[0].maxScore=999;
 const y=agentEvaluationPlan('chief-expansion-troi');
 assert.notEqual(y.behaviorCases[0].prompt,'EXECUTE WORK');
 assert.equal(y.rubric[0].maxScore,4);
 assert.ok(INDIVIDUAL_BRAINS.every(b=>b.grantedToolIds.length===0));
});
