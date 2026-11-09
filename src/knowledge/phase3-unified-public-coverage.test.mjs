import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {reconcileB3PublicSourceCoverage} from "./phase3-unified-public-coverage.mjs";
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=read("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(frozen,lock));
const base={
 frozen,queue,
 chief1:read("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json"),
 chief2:read("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json"),
 chief3:read("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json"),
 bonesEight:read("../../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json"),
 dataEleven:read("../../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json"),
 expansionTen:read("../../docs/stage-b/b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json"),
 expansionNextTen:read("../../docs/stage-b/b3-second-ten-expansion-specialist-public-pilot-2026-11-08.json")
};
const result=reconcileB3PublicSourceCoverage(base);
test("Seven source manifests reconcile to 64 uniquely inspected candidate requirements out of 555",()=>{
 assert.equal(result.kind,"RECONCILED_UNAPPROVED_PUBLIC_SOURCE_COVERAGE");
 assert.equal(result.sourceRecords.length,64);
 assert.equal(result.pendingWithoutCandidate.length,491);
 assert.equal(result.nextSpecialists.length,121);
 assert.equal(result.departments.length,25);
 assert.equal(result.summary.canonicalAgents,185);
 assert.equal(result.summary.chiefsWithFirstCandidate,25);
 assert.equal(result.summary.specialistsWithFirstCandidate,39);
 assert.equal(result.summary.specialistsWithoutFirstCandidate,121);
 assert.equal(result.summary.evidenceDocketsTotal,555);
 assert.equal(result.summary.docketsWithCandidate,64);
 assert.equal(result.summary.docketsWithoutCandidate,491);
 assert.equal(result.summary.independentDocketReviewsPending,555);
 assert.equal(result.summary.verifiedExternalClaims,0);
 assert.equal(result.summary.ownerApprovedKnowledgeLibraries,0);
 assert.equal(result.summary.permissionedLiveCitations,0);
 assert.equal(result.summary.activatedAgents,0);
 assert.equal(new Set(result.sourceRecords.map(x=>x.agentId)).size,64);
 assert.equal(new Set(result.sourceRecords.map(x=>x.requirementId)).size,64);
 assert.equal(new Set(result.pendingWithoutCandidate.map(x=>x.requirementId)).size,491);
});
test("Next 121 specialist source requests match frozen IDs, exact chief and specialist identity",()=>{
 const specialistIDs=new Set(frozen.records.filter(x=>x.Role==="Specialist").map(x=>x["Agent ID"]));
 const covered=new Set(result.sourceRecords.filter(x=>x.role==="Specialist").map(x=>x.agentId));
 for(const x of result.nextSpecialists){
  const row=frozen.records.find(r=>r["Agent ID"]===x.agentId);
  assert.ok(row);
  assert.equal(row.Role,"Specialist");
  assert.equal(row.Specialty,x.specialty);
  assert.equal(row.Name,x.displayName);
  assert.equal(row["Chief ID"],x.chiefId);
  assert.equal(x.nextRequirementId,x.agentId+"-K1");
  assert.equal(x.independentApproval,false);
  assert.equal(x.firstSourceInspected,false);
  assert.ok(specialistIDs.has(x.agentId));
  assert.ok(!covered.has(x.agentId));
 }
 assert.equal(result.departments.reduce((n,x)=>n+x.specialists,0),160);
 assert.equal(result.departments.reduce((n,x)=>n+x.specialistsWithFirstPublicCandidate,0),39);
 assert.equal(result.departments.reduce((n,x)=>n+x.specialistsWithoutFirstPublicCandidate,0),121);
});
test("Public inspection reports cannot confer live citation or agent approval",()=>{
 for(const x of result.sourceRecords){
  assert.equal(x.candidateOnly,true);
  assert.equal(x.independentlyReviewed,false);
  assert.equal(x.ownerApproved,false);
  assert.equal(x.liveCitationPermission,false);
 }
 for(const x of result.pendingWithoutCandidate){
  assert.equal(x.independentlyVerified,false);
  assert.equal(x.ownerApproved,false);
 }
});
test("Independent validation rejects forged source approval and replay across batches",()=>{
 const forged=structuredClone(base);
 forged.expansionNextTen.items[0].ownerApproved=true;
 assert.throws(()=>reconcileB3PublicSourceCoverage(forged),
  /B3_SECOND_TEN_CANNOT_PROMOTE_TO_APPROVED/);
 const wrong=structuredClone(base);
 wrong.expansionNextTen.items[0].agentId="agent-expansion-001";
 assert.throws(()=>reconcileB3PublicSourceCoverage(wrong),
  /B3_SECOND_TEN_DUPLICATE_OR_INVALID_ID/);
 const duplicate=structuredClone(base);
 duplicate.expansionNextTen.items[1]=duplicate.expansionNextTen.items[0];
 assert.throws(()=>reconcileB3PublicSourceCoverage(duplicate),
  /B3_SECOND_TEN_DUPLICATE_OR_INVALID_ID/);
 const missing=structuredClone(base);
 missing.queue.items=missing.queue.items.slice(1);
 assert.throws(()=>reconcileB3PublicSourceCoverage(missing),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
