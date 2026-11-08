import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {buildSpecialistSourceResearchQueue} from "./phase3-specialist-research-backlog.mjs";

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=read("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const first=read("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const second=read("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const third=read("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(roster,lock));
const plans=buildSpecialistSourceResearchQueue(roster,queue,first,second,third);
test("160 specialist source research briefs include 480 pending exact requirements, not fake inspections",()=>{
 assert.equal(plans.rolePlans.length,160);
 assert.equal(plans.summary.specialists,160);
 assert.equal(plans.summary.requiredPublicEvidenceReviews,480);
 assert.equal(plans.summary.publicSourcePagesOpenedForSpecialists,0);
 assert.equal(plans.summary.independentEvidenceReviewsCompleted,0);
 assert.equal(plans.summary.ownerApprovedSpecialistSources,0);
 assert.equal(plans.summary.liveSpecialistCitations,0);
 assert.equal(plans.summary.productionDataAccesses,0);
 assert.equal(plans.summary.realModelEvaluations,0);
 assert.equal(plans.summary.activeAgents,0);
 assert.equal(new Set(plans.rolePlans.map(x=>x.agentId)).size,160);
 assert.deepEqual(new Set(plans.rolePlans.map(x=>x.agentId)),
  new Set(roster.records.filter(x=>x.Role==="Specialist").map(x=>x["Agent ID"])));
});
test("Each research brief retains specialty, chief/department and three unique unapproved review needs",()=>{
 const all=new Set();
 for(const p of plans.rolePlans){
  const record=roster.records.find(x=>x["Agent ID"]===p.agentId);
  assert.ok(record);
  assert.equal(record.Specialty,p.specialty);
  assert.equal(record["Chief ID"],p.chiefId);
  assert.equal(record.Department,p.department);
  assert.equal(p.researchTasks.length,3);
  assert.equal(p.chiefReferenceIsOnlyAStartingLens,true);
  assert.equal(p.inheritedFactualApprovalFromChief,false);
  assert.equal(p.authorizedKnowledgeClaims,0);
  assert.equal(p.realPrivateFilesAllowed,false);
  assert.equal(p.productionDataUsed,false);
  for(let k=0;k<3;k++){
   const need=p.researchTasks[k];
   assert.equal(need.requirementId,p.agentId+"-K"+(k+1));
   assert.equal(need.publicSourceUrl,null);
   assert.equal(need.sourceContentInspected,false);
   assert.equal(need.independentlyVerified,false);
   assert.equal(need.ownerApproved,false);
   assert.equal(need.citationPermitted,false);
   assert.equal(need.requiredEvidence.length,5);
   assert.ok(need.researchQuestion.includes(p.specialty));
   assert.ok(need.researchQuestion.includes(need.suggestedPrimarySourceKind));
   assert.ok(!all.has(need.requirementId));
   all.add(need.requirementId);
  }
 }
 assert.equal(all.size,480);
});
test("Missing specialist docket or frozen ID fails closed, even if chief sources exist",()=>{
 const without={...queue,items:queue.items.filter(x=>x.requirementId!=="agent-bones-01-K1")};
 assert.throws(()=>buildSpecialistSourceResearchQueue(roster,without,first,second,third),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
 const altered={...roster,records:roster.records.slice(1)};
 assert.throws(()=>buildSpecialistSourceResearchQueue(altered,queue,first,second,third),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
 const bogus=structuredClone(third);bogus.items[0].citableByLiveAgents=true;
 assert.throws(()=>buildSpecialistSourceResearchQueue(roster,queue,first,second,bogus),
  /CHIEF25_UNAPPROVED_STATE_VIOLATION/);
});
