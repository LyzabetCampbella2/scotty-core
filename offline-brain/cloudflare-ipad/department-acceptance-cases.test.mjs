import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster} from './connected-roster.mjs';
import worker from './worker.mjs';
import {selectTeam,runTeam} from './team-runtime.mjs';
import {departmentAcceptanceCases,ACCEPTANCE_RUBRIC,ACCEPTANCE_VERSION} from './department-acceptance-cases.mjs';

const roster=connectedRoster(),cases=departmentAcceptanceCases(roster);
test('25 unique practical synthetic departments route to their exact specialist and chief',()=>{
 assert.equal(cases.length,25);assert.equal(ACCEPTANCE_RUBRIC.length,5);
 assert.equal(new Set(cases.map(x=>x.department)).size,25);
 assert.equal(new Set(cases.map(x=>x.chiefId)).size,25);
 for(const c of cases){
  assert.equal(c.synthetic,true);
  assert.equal(c.ownerReviewRequired,true);
  assert.equal(c.modelResultVerified,false);
  assert.equal(c.question.length<=500,true);
  const plan=selectTeam(roster,c.question,1);
  assert.equal(plan.assignments.length,1);
  assert.equal(plan.assignments[0].agentId,c.specialistId);
  assert.equal(plan.assignments[0].chiefId,c.chiefId);
  assert.equal(plan.maxCalls,3);
 }
});
test('all 25 synthetic assignments traverse specialist/chief/SCOTTY with no factual claims of verification',async()=>{
 let calls=0;
 for(const c of cases){
  const result=await runTeam({roster,question:c.question,approved:true,AI:{run:async()=>{
   calls++;return {response:'Synthetic case 1: check input and expected result. Case 2: check denial and error. Case 3: check readback and limitation. No external action was performed.'};
  }}});
  assert.equal(result.status,'completed',c.department);
  assert.equal(result.results.length,3,c.department);
  assert.equal(result.results[0].agentId,c.specialistId);
  assert.equal(result.results[1].agentId,c.chiefId);
  assert.equal(result.results[1].reviewedAgentIds[0],c.specialistId);
  assert.equal(result.results[2].agentId,'scotty');
  assert.equal(result.results[2].reviewedAgentIds[0],c.chiefId);
  assert.equal(result.verified,false);
  assert.equal(result.memorySaved,false);
  assert.equal(result.qualityReview.accuracy,'not-independently-verified');
  assert.equal(result.qualityReview.ownerAccepted,false);
 }
 assert.equal(calls,75);
});
test('fixtures cannot represent an owner-approved live department assessment',()=>{
 assert.equal(ACCEPTANCE_VERSION,'department-acceptance-v1');
 assert.ok(cases.every(c=>c.state==='not-run'&&c.modelResultVerified===false));
});

test('owner-authenticated acceptance catalog is read-only, truthful and consumes no AI quota',async()=>{
 const token='owner-test-token-12345678901234567890123456789';
 let calls=0;
 const env={OWNER_BEARER_TOKEN:token,AI_ENABLED:'true',AI:{run:async()=>{calls++;throw Error('Unexpected AI call')}}};
 const make=(authorized)=>new Request('https://fixture.workers.dev/api/quality-cases',{headers:authorized?{authorization:'Bearer '+token}:{}});
 assert.equal((await worker.fetch(make(false),env)).status,401);
 const response=await worker.fetch(make(true),env);
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.cases.length,25);
 assert.equal(body.modelCalls,0);
 assert.equal(body.memoryWrites,0);
 assert.ok(body.cases.every(c=>c.modelResultVerified===false));
 assert.equal(calls,0);
});
