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

const newSourceBatch=read("../../docs/stage-b/b3-third-ten-expansion-specialist-public-pilot-2026-11-08.json");
const extendedBase={...base,expansionThirdTen:newSourceBatch};

test("Eight source manifests reconcile to 74 candidate-only records, 111 uninspected specialists and 481 missing dockets",()=>{
 const expanded=reconcileB3PublicSourceCoverage(extendedBase);
 assert.equal(expanded.summary.canonicalAgents,185);
 assert.equal(expanded.summary.chiefsWithFirstCandidate,25);
 assert.equal(expanded.summary.specialistsWithFirstCandidate,49);
 assert.equal(expanded.summary.specialistsWithoutFirstCandidate,111);
 assert.equal(expanded.summary.docketsWithCandidate,74);
 assert.equal(expanded.summary.docketsWithoutCandidate,481);
 assert.equal(expanded.summary.independentDocketReviewsPending,555);
 assert.equal(expanded.summary.verifiedExternalClaims,0);
 assert.equal(expanded.summary.ownerApprovedKnowledgeLibraries,0);
 assert.equal(expanded.summary.permissionedLiveCitations,0);
 assert.equal(expanded.summary.realModelEvaluations,0);
 assert.equal(expanded.summary.activatedAgents,0);
 assert.equal(expanded.sourceRecords.length,74);
 assert.equal(expanded.pendingWithoutCandidate.length,481);
 assert.equal(expanded.nextSpecialists.length,111);
 assert.equal(expanded.departments.reduce((n,x)=>n+x.specialistsWithFirstPublicCandidate,0),49);
 assert.equal(new Set(expanded.sourceRecords.map(x=>x.requirementId)).size,74);
 assert.equal(new Set(expanded.sourceRecords.map(x=>x.agentId)).size,74);
 for(const source of expanded.sourceRecords){
  assert.equal(source.candidateOnly,true);
  assert.equal(source.ownerApproved,false);
  assert.equal(source.liveCitationPermission,false);
  assert.equal(source.independentlyReviewed,false);
 }
 assert.equal(expanded.nextSpecialists[0].agentId,"agent-expansion-031");
});
test("Unified eight-batch validation refuses forged approvals and replayed agent source identities",()=>{
 const forged=structuredClone(extendedBase);
 forged.expansionThirdTen.items[0].ownerApproved=true;
 assert.throws(()=>reconcileB3PublicSourceCoverage(forged),
  /B3_THIRD_TEN_FALSE_SOURCE_APPROVAL_OR_GRANT/);
 const cross=structuredClone(extendedBase);
 cross.expansionThirdTen.items[0].agentId="agent-expansion-011";
 assert.throws(()=>reconcileB3PublicSourceCoverage(cross),
  /B3_THIRD_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 const dropped=structuredClone(extendedBase);
 dropped.expansionThirdTen.items.pop();
 assert.throws(()=>reconcileB3PublicSourceCoverage(dropped),
  /B3_THIRD_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
});

const fourthBatch=read("../../docs/stage-b/b3-fourth-ten-expansion-specialist-public-pilot-2026-11-09.json");
const fourthBase={...extendedBase,expansionFourthTen:fourthBatch};

test("Nine immutable source manifests reconcile exactly 84 inspected candidates, 59 specialists, and 471 missing dockets",()=>{
 const expanded=reconcileB3PublicSourceCoverage(fourthBase);
 assert.equal(expanded.summary.canonicalAgents,185);
 assert.equal(expanded.summary.chiefsWithFirstCandidate,25);
 assert.equal(expanded.summary.specialistsWithFirstCandidate,59);
 assert.equal(expanded.summary.specialistsWithoutFirstCandidate,101);
 assert.equal(expanded.summary.evidenceDocketsTotal,555);
 assert.equal(expanded.summary.docketsWithCandidate,84);
 assert.equal(expanded.summary.docketsWithoutCandidate,471);
 assert.equal(expanded.summary.independentDocketReviewsPending,555);
 assert.equal(expanded.summary.verifiedExternalClaims,0);
 assert.equal(expanded.summary.ownerApprovedKnowledgeLibraries,0);
 assert.equal(expanded.summary.permissionedLiveCitations,0);
 assert.equal(expanded.summary.realModelEvaluations,0);
 assert.equal(expanded.summary.activatedAgents,0);
 assert.equal(expanded.sourceRecords.length,84);
 assert.equal(expanded.pendingWithoutCandidate.length,471);
 assert.equal(expanded.nextSpecialists.length,101);
 assert.equal(expanded.departments.reduce((n,x)=>n+x.specialistsWithFirstPublicCandidate,0),59);
 assert.equal(new Set(expanded.sourceRecords.map(x=>x.agentId)).size,84);
 assert.equal(new Set(expanded.sourceRecords.map(x=>x.requirementId)).size,84);
 assert.equal(expanded.nextSpecialists[0].agentId,"agent-expansion-041");
 assert.ok(expanded.sourceRecords.some(x=>x.agentId==="agent-expansion-040"&&x.inspectionDate==="2026-11-09"));
 for(const x of expanded.sourceRecords){
  assert.equal(x.candidateOnly,true);
  assert.equal(x.independentlyReviewed,false);
  assert.equal(x.ownerApproved,false);
  assert.equal(x.liveCitationPermission,false);
 }
});
test("All-nine-manifest reconciliation denies forged review claims, duplicate source IDs, and incomplete dependency",()=>{
 const forged=structuredClone(fourthBase);
 forged.expansionFourthTen.items[0].ownerApproved=true;
 assert.throws(()=>reconcileB3PublicSourceCoverage(forged),
  /B3_FOURTH_TEN_FALSE_VERIFICATION_OR_OWNER_APPROVAL/);
 const replay=structuredClone(fourthBase);
 replay.expansionFourthTen.items[0].agentId="agent-expansion-031";
 replay.expansionFourthTen.items[1].agentId="agent-expansion-031";
 assert.throws(()=>reconcileB3PublicSourceCoverage(replay),
  /B3_FOURTH_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID|B3_FOURTH_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 const omitted=structuredClone(fourthBase);omitted.expansionThirdTen=null;
 assert.throws(()=>reconcileB3PublicSourceCoverage(omitted),
  /B3_FOURTH_REQUIRES_THIRD_BATCH/);
 const missing=structuredClone(fourthBase);missing.expansionFourthTen.items.pop();
 assert.throws(()=>reconcileB3PublicSourceCoverage(missing),
  /B3_FOURTH_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
});

const fifthBatch=read("../../docs/stage-b/b3-fifth-ten-specialist-public-pilot-2026-11-09.json");
const fifthBase={...fourthBase,expansionFifthTen:fifthBatch};
test("Ten source manifests reconcile to 94 unapproved public candidates, 69 specialists and 461 missing dockets",()=>{
 const actual=reconcileB3PublicSourceCoverage(fifthBase);
 assert.equal(actual.summary.canonicalAgents,185);
 assert.equal(actual.summary.chiefsWithFirstCandidate,25);
 assert.equal(actual.summary.specialistsWithFirstCandidate,69);
 assert.equal(actual.summary.specialistsWithoutFirstCandidate,91);
 assert.equal(actual.summary.evidenceDocketsTotal,555);
 assert.equal(actual.summary.docketsWithCandidate,94);
 assert.equal(actual.summary.docketsWithoutCandidate,461);
 assert.equal(actual.summary.independentDocketReviewsPending,555);
 assert.equal(actual.summary.verifiedExternalClaims,0);
 assert.equal(actual.summary.ownerApprovedKnowledgeLibraries,0);
 assert.equal(actual.summary.permissionedLiveCitations,0);
 assert.equal(actual.summary.realModelEvaluations,0);
 assert.equal(actual.summary.activatedAgents,0);
 assert.equal(actual.sourceRecords.length,94);
 assert.equal(actual.pendingWithoutCandidate.length,461);
 assert.equal(actual.nextSpecialists.length,91);
 assert.equal(actual.departments.reduce((n,x)=>n+x.specialistsWithFirstPublicCandidate,0),69);
 assert.equal(new Set(actual.sourceRecords.map(x=>x.agentId)).size,94);
 assert.equal(new Set(actual.sourceRecords.map(x=>x.requirementId)).size,94);
 assert.equal(actual.nextSpecialists[0].agentId,"agent-geordi-07");
 assert.equal(actual.sourceRecords.find(x=>x.agentId==="agent-geordi-06")?.inspectionDate,"2026-11-09");
});
test("Ten-manifest rollup rejects missing prior batch, forged review and duplicates",()=>{
 const missing=structuredClone(fifthBase);missing.expansionFourthTen=null;
 assert.throws(()=>reconcileB3PublicSourceCoverage(missing),/B3_FIFTH_REQUIRES_PREVIOUS_BATCHES/);
 const forged=structuredClone(fifthBase);forged.expansionFifthTen.items[0].ownerApproved=true;
 assert.throws(()=>reconcileB3PublicSourceCoverage(forged),/B3_GENERIC_BATCH_FALSE_REVIEW_APPROVAL/);
 const replay=structuredClone(fifthBase);
 replay.expansionFifthTen.items[0].agentId="agent-expansion-011";
 assert.throws(()=>reconcileB3PublicSourceCoverage(replay),/B3_GENERIC_BATCH_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 const bad=structuredClone(fifthBase);bad.expansionFifthTen.items.pop();
 assert.throws(()=>reconcileB3PublicSourceCoverage(bad),/B3_GENERIC_BATCH_MANIFEST_MUST_REMAIN_UNAPPROVED/);
});
