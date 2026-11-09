import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {buildPhase3SourceCoverage} from "./phase3-coverage-plan.mjs";

const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=load("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const original=load("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const expansion=load("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(roster,lock));
const coverage=buildPhase3SourceCoverage(roster,queue,original,expansion);

test("B3 coverage tracks 185 roles, 555 independent evidence dockets, and 10 reviewed public page candidates",()=>{
 assert.equal(coverage.rolePlans.length,185);
 assert.equal(coverage.departments.length,25);
 assert.equal(coverage.nextChiefs.length,15);
 assert.equal(coverage.summary.publicAssistantInspectionsRecorded,10);
 assert.equal(coverage.summary.chiefs,25);
 assert.equal(coverage.summary.specialists,160);
 assert.equal(coverage.summary.chiefsStillWithoutInspectedPublicSource,15);
 assert.equal(coverage.summary.specialistsStillWithoutInspectedPublicSource,160);
 assert.equal(coverage.summary.docketsWithoutPublicInspections,545);
 assert.equal(coverage.summary.pendingIndependentDocketReviews,555);
 assert.equal(coverage.summary.independentlyVerifiedExternalClaims,0);
 assert.equal(coverage.summary.ownerApprovedRoleKnowledgePacks,0);
 assert.equal(coverage.summary.liveCitableClaims,0);
 assert.equal(coverage.summary.agentActivations,0);
 assert.equal(new Set(coverage.rolePlans.map(p=>p.agentId)).size,185);
 assert.equal(new Set(coverage.nextChiefs.map(p=>p.agentId)).size,15);
});
test("Every chief has 3 pending requirements and exactly 10 chiefs have 1 inspected pilot candidate",()=>{
 const chiefs=coverage.rolePlans.filter(x=>x.role==="Chief");
 assert.equal(chiefs.length,25);
 assert.equal(chiefs.filter(x=>x.assistantInspectedPublicCandidates===1).length,10);
 assert.equal(chiefs.filter(x=>x.assistantInspectedPublicCandidates===0).length,15);
 for(const role of coverage.rolePlans){
  assert.equal(role.evidenceNeeds,3);
  assert.equal(role.pendingRequirements,3);
  assert.equal(role.independentlyVerifiedClaims,0);
  assert.equal(role.ownerApprovedClaims,0);
  assert.equal(role.approvedCitationCount,0);
  assert.equal(role.liveKnowledgeSourceCount,0);
  assert.ok(role.nextUninspectedRequirementId?.startsWith(role.agentId+"-"));
 }
});
test("Department reviews cannot falsely cover specialists or change chief links",()=>{
 assert.ok(coverage.departments.every(d=>d.agentCount>=2));
 assert.equal(coverage.departments.reduce((sum,d)=>sum+d.agentCount,0),185);
 assert.equal(coverage.departments.reduce((sum,d)=>sum+d.inspectedCandidateCount,0),10);
 assert.ok(coverage.departments.every(d=>d.independentApprovalCount===0));
 assert.ok(coverage.nextChiefs.every(x=>x.status==="NEEDS_OFFICIAL_PUBLIC_REFERENCE_INSPECTION"));
 assert.ok(coverage.nextChiefs.every(x=>x.externalSourceVerified===false&&x.ownerApproved===false));
});
test("Forged independent approval or missing source dockets cause coverage to fail closed",()=>{
 const doctored=structuredClone(expansion);
 doctored.items[0].ownerApproved=true;
 assert.throws(()=>buildPhase3SourceCoverage(roster,queue,original,doctored),
  /B3_EXPANSION_FORGED_VERIFICATION_OR_OWNER_APPROVAL/);
 const missing={...queue,items:queue.items.slice(1)};
 assert.throws(()=>buildPhase3SourceCoverage(roster,missing,original,expansion),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
 const badRoster={...roster,records:roster.records.slice(1)};
 assert.throws(()=>buildPhase3SourceCoverage(badRoster,queue,original,expansion),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
