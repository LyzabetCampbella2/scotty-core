import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {buildEvaluationMatrix,structuralEvaluationReadiness} from "./evaluation-matrix.mjs";
import {makePhase1ReviewPackets} from "./review-packets.mjs";

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),"utf8"));
const roster=load("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const drafts=createPhase1BrainDrafts(roster,lock);
const matrix=buildEvaluationMatrix(drafts);

test("Every frozen agent has three proposed evaluation cases with 4 scored rubric criteria each",()=>{
 assert.equal(matrix.summary.agents,185);
 assert.equal(matrix.summary.testCases,555);
 assert.equal(matrix.summary.rubricCriteria,2220);
 assert.equal(matrix.summary.modelRuns,0);
 assert.equal(matrix.summary.reviewedRuns,0);
 assert.equal(matrix.summary.passingRuns,0);
 assert.equal(matrix.summary.certifiedAgents,0);
 assert.equal(matrix.summary.approxNewProviderSpendUsd,0);
 assert.equal(new Set(matrix.cases.map(c=>c.evaluationId)).size,555);
 const groups=new Map();
 for(const c of matrix.cases){
  const a=groups.get(c.canonicalAgentId)||[];
  a.push(c);
  groups.set(c.canonicalAgentId,a);
  assert.equal(c.rubric.length,4);
  assert.equal(c.rubric.every(r=>r.score===null&&r.reviewerEvidenceRef===null),true);
  assert.equal(c.externalToolUseAllowed,false);
  assert.equal(c.dataSourceAccessAllowed,false);
  assert.equal(c.inputClass,"SYNTHETIC_PUBLIC");
  assert.equal(c.verdict,"NOT_RUN");
  assert.equal(c.outputEvidenceRef,null);
  assert.equal(c.modelUsed,null);
  assert.equal(c.ownerFinalApproval,false);
 }
 assert.equal(groups.size,185);
 for(const cases of groups.values())assert.deepEqual(cases.map(c=>c.type),["shared","specialty","adversarial"]);
});
test("Adversarial rubric explicitly requires rejecting untrusted private-data and publication instructions",()=>{
 const bad=matrix.cases.filter(x=>x.type==="adversarial");
 assert.equal(bad.length,185);
 for(const c of bad){
  const ids=new Set(c.rubric.map(x=>x.key));
  assert.ok(ids.has("rejects_instructions_in_untrusted_content"));
  assert.ok(ids.has("rejects_cross_project_access"));
  assert.ok(ids.has("rejects_unauthorized_external_action"));
  assert.ok(ids.has("escalates_for_owner_approval"));
  assert.equal(c.verdict,"NOT_RUN");
 }
});
test("Review packets include unscored rubrics but remain unapproved",()=>{
 const packets=makePhase1ReviewPackets(drafts);
 assert.equal(packets.summary.modelRubricCriteria,2220);
 assert.equal(packets.summary.modelTestsPassed,0);
 for(const p of packets.packets){
  assert.equal(p.behaviorCases.length,3);
  for(const x of p.behaviorCases){
   assert.equal(x.rubric.length,4);
   assert.equal(x.rubric.every(r=>r.score===null),true);
   assert.equal(x.externalToolUseAllowed,false);
   assert.equal(x.status,"NOT_RUN");
  }
  assert.equal(p.evidenceChecklist.every(e=>e.passed===false),true);
  assert.equal(p.certification,"NOT_CERTIFIED");
 }
});
test("False or incomplete result claims never imply certification",()=>{
 const candidate=matrix.cases[0];
 assert.deepEqual(structuralEvaluationReadiness(candidate),{readyForIndependentReview:false,reason:"test-not-run"});
 const bogus={...candidate,verdict:"PASS"};
 assert.equal(structuralEvaluationReadiness(bogus).readyForIndependentReview,false);
 const bogus2={...bogus,modelUsed:"mock",modelVersion:"1",outputHash:"sha256:synthetic",outputEvidenceRef:"synthetic",
  observedAt:"2026-11-07T12:00:00Z",independentReviewer:"pretend",rubric:candidate.rubric.map(x=>({...x,score:2,reviewerEvidenceRef:"pretend"}))};
 const check=structuralEvaluationReadiness(bogus2);
 assert.equal(check.readyForIndependentReview,true);
 assert.equal(check.runtimeApproved,false);
 assert.equal(check.certified,false);
 assert.match(check.reason,/needs-independent-verification/);
});
test("Evaluation plan never accepts missing, duplicated or truncated agent inventories",()=>{
 assert.throws(()=>buildEvaluationMatrix({...drafts,profiles:drafts.profiles.slice(0,184)}),/B1_DRAFTS_REQUIRED/);
 assert.throws(()=>buildEvaluationMatrix({...drafts,profiles:[...drafts.profiles.slice(0,184),drafts.profiles[0]]}),/INVALID_EVALUATION_MATRIX/);
});
