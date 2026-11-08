import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {createSyntheticEvaluationComparisons} from "./synthetic-comparisons.mjs";
import {buildEvaluationMatrix} from "./evaluation-matrix.mjs";
import {verifyOfflineFixture,offlineFixtureReviewStatus} from "./evaluation-records.mjs";

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=read("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const drafts=createPhase1BrainDrafts(roster,lock);
const matrix=buildEvaluationMatrix(drafts);
const result=createSyntheticEvaluationComparisons(drafts);

test("555 illustrative outputs are valid synthetic envelopes, never actual agent evaluations",()=>{
 assert.equal(result.summary.illustrations,555);
 assert.equal(result.summary.shared,185);
 assert.equal(result.summary.specialty,185);
 assert.equal(result.summary.adversarial,185);
 assert.equal(result.summary.realModelRuns,0);
 assert.equal(result.summary.gradedResults,0);
 assert.equal(result.summary.approvedAgents,0);
 const byId=new Map(matrix.cases.map(x=>[x.evaluationId,x]));
 assert.equal(new Set(result.records.map(r=>r.illustrativeFixture.evaluationId)).size,555);
 for(const example of result.records){
  const fixture=example.illustrativeFixture;
  const testCase=byId.get(fixture.evaluationId);
  assert.ok(testCase);
  assert.equal(verifyOfflineFixture(fixture,testCase),true,fixture.evaluationId);
  assert.equal(fixture.modelExecutionStatus,"NOT_RUN");
  assert.equal(fixture.evaluationVerdict,"NOT_GRADED");
  assert.equal(example.realModelRun,false);
  assert.equal(example.modelOutputVerified,false);
  assert.equal(example.certified,false);
  assert.equal(offlineFixtureReviewStatus(fixture,testCase).realModelEvaluationPassed,false);
  assert.match(fixture.outputText,/ILLUSTRATIVE OFFLINE EXAMPLE/);
 }
});
test("All 160 same-prompt chief-specialist comparison pairs are unscored",()=>{
 assert.equal(result.comparisons.length,160);
 const specialists=drafts.profiles.filter(x=>x.role==="Specialist");
 for(const pair of result.comparisons){
  const specialist=specialists.find(x=>x.canonicalAgentId===pair.specialistId);
  assert.ok(specialist);
  assert.equal(pair.chiefId,specialist.chiefId);
  assert.equal(pair.department,specialist.department);
  assert.equal(pair.score,null);
  assert.equal(pair.realOutputsCompared,false);
 }
});
test("Cannot derive comparisons from forged, incomplete or duplicated roster profiles",()=>{
 assert.throws(()=>createSyntheticEvaluationComparisons({...drafts,profiles:drafts.profiles.slice(1)}),/B1_DRAFTS_REQUIRED/);
 assert.throws(()=>createSyntheticEvaluationComparisons({...drafts,profiles:[...drafts.profiles.slice(1),drafts.profiles[1]]}),/DUPLICATE_AGENT_ID/);
});
