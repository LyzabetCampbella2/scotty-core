/**
 * Offline SCOTTY B3 all-batch coverage reconciliation.
 *
 * A *source candidate* means a developer-authored record of inspecting a
 * public page. It is not verified, owner-approved, indexed, professional
 * advice, or permission to cite. All source dockets remain pending.
 *
 * Run source-specific validators first, then reconcile raw records across
 * all batches to catch accidental cross-batch duplicates and wrong totals.
 */
import {validateSecondTenExpansionSpecialists} from "./phase3-second-ten-expansion-specialists.mjs";
import {validateThirdTenExpansionSpecialists} from "./phase3-third-ten-expansion-specialists.mjs";
import {validateFourthTenExpansionSpecialists} from "./phase3-fourth-ten-expansion-specialists.mjs";
import {validateFifthTenSpecialistSources} from "./phase3-fifth-ten-specialists.mjs";

export function reconcileB3PublicSourceCoverage({
 frozen,queue,chief1,chief2,chief3,bonesEight,dataEleven,
 expansionTen,expansionNextTen,expansionThirdTen=null,expansionFourthTen=null,expansionFifthTen=null
}={}){
 const latest=validateSecondTenExpansionSpecialists(
  expansionNextTen,expansionTen,dataEleven,bonesEight,
  frozen,queue,chief1,chief2,chief3
 );
 if(latest.summary.specialistsWithFirstPublicSourceCandidate!==39)
  throw Error("B3_UNEXPECTED_LATEST_BATCH");
 if(expansionThirdTen!==null){
  const third=validateThirdTenExpansionSpecialists(
   expansionThirdTen,expansionNextTen,expansionTen,dataEleven,bonesEight,
   frozen,queue,chief1,chief2,chief3
  );
  if(third.summary.specialistsWithFirstSourceCandidate!==49||
     third.summary.publicDocketsWithCandidate!==74)
   throw Error("B3_INVALID_THIRD_TEN_COVERAGE");
 }
 if(expansionFourthTen!==null){
  if(expansionThirdTen===null)throw Error("B3_FOURTH_REQUIRES_THIRD_BATCH");
  const fourth=validateFourthTenExpansionSpecialists(
   expansionFourthTen,expansionThirdTen,expansionNextTen,expansionTen,
   dataEleven,bonesEight,frozen,queue,chief1,chief2,chief3);
  if(fourth.summary.specialistsWithFirstSourceCandidate!==59||
     fourth.summary.publicDocketsWithCandidate!==84)
   throw Error("B3_INVALID_FOURTH_TEN_COVERAGE");
 }
 if(expansionFifthTen!==null){
  if(expansionFourthTen===null||expansionThirdTen===null)
   throw Error("B3_FIFTH_REQUIRES_PREVIOUS_BATCHES");
  const fifth=validateFifthTenSpecialistSources(
   expansionFifthTen,expansionFourthTen,expansionThirdTen,expansionNextTen,
   expansionTen,dataEleven,bonesEight,frozen,queue,chief1,chief2,chief3);
  if(fifth.summary.specialistsWithFirstCandidate!==69||
     fifth.summary.docketsWithCandidate!==94)
   throw Error("B3_INVALID_FIFTH_TEN_COVERAGE");
 }
 const expectedSources=expansionFifthTen!==null?94:expansionFourthTen!==null?84:expansionThirdTen===null?64:74;
 const expectedSpecialists=expansionFifthTen!==null?69:expansionFourthTen!==null?59:expansionThirdTen===null?39:49;
 const expectedRemaining=expansionFifthTen!==null?91:expansionFourthTen!==null?101:expansionThirdTen===null?121:111;
 const expectedOpen=555-expectedSources;
 const manifests=[chief1,chief2,chief3,bonesEight,dataEleven,expansionTen,
  expansionNextTen,...(expansionThirdTen===null?[]:[expansionThirdTen]),
  ...(expansionFourthTen===null?[]:[expansionFourthTen]),
  ...(expansionFifthTen===null?[]:[expansionFifthTen])];
 const roster=new Map(frozen.records.map(r=>[r["Agent ID"],r]));
 const evidence=new Map(queue.items.map(r=>[r.requirementId,r]));
 if(roster.size!==185||evidence.size!==555)
  throw Error("B3_COVERAGE_FROZEN_INVENTORY_REQUIRED");
 const seenAgents=new Set(),seenRequirements=new Set(),sourceRecords=[];
 for(const manifest of manifests){
  if(!Array.isArray(manifest?.items))throw Error("B3_MISSING_SOURCE_MANIFEST");
  for(const item of manifest.items){
   const agent=roster.get(item.agentId),requirement=evidence.get(item.requirementId);
   if(!agent||!requirement||
      requirement.canonicalAgentId!==item.agentId||
      requirement.reviewState!=="PENDING_SOURCE_EVIDENCE"||
      requirement.mayCiteExternalClaim!==false||
      seenAgents.has(item.agentId)||seenRequirements.has(item.requirementId)||
      item.ownerApproved!==false||item.independentlyVerifiedClaim!==false||
      item.citableByLiveAgents!==false||
      item.sharedMemoryPromotionAllowed!==false)
    throw Error("B3_PUBLIC_SOURCE_COVERAGE_REPLAY_OR_APPROVAL");
   seenAgents.add(item.agentId);seenRequirements.add(item.requirementId);
   sourceRecords.push({
    agentId:item.agentId,role:agent.Role,department:agent.Department,
    requirementId:item.requirementId,
    sourceUrl:item.url,inspectionDate:item.observedOn,
    candidateOnly:true,independentlyReviewed:false,
    ownerApproved:false,liveCitationPermission:false
   });
  }
 }
 const chiefIds=frozen.records.filter(r=>r.Role==="Chief").map(r=>r["Agent ID"]);
 const specialistRows=frozen.records.filter(r=>r.Role==="Specialist");
 if(chiefIds.length!==25||specialistRows.length!==160||
    seenAgents.size!==expectedSources||seenRequirements.size!==expectedSources||
    chiefIds.some(id=>!seenAgents.has(id))||
    specialistRows.filter(r=>seenAgents.has(r["Agent ID"])).length!==expectedSpecialists)
  throw Error("B3_UNEXPECTED_SOURCE_COVERAGE_COUNT");
 const pendingWithoutCandidate=queue.items
  .filter(x=>!seenRequirements.has(x.requirementId))
  .map(x=>({agentId:x.canonicalAgentId,requirementId:x.requirementId,
    department:x.department,status:"PUBLIC_SOURCE_CANDIDATE_NOT_YET_INSPECTED",
    independentlyVerified:false,ownerApproved:false}));
 const nextSpecialists=specialistRows
  .filter(x=>!seenAgents.has(x["Agent ID"]))
  .map(x=>({agentId:x["Agent ID"],displayName:x.Name,
    specialty:x.Specialty,department:x.Department,chiefId:x["Chief ID"],
    nextRequirementId:x["Agent ID"]+"-K1",
    independentApproval:false,firstSourceInspected:false}));
 const departments=chiefIds.map(id=>{
  const chief=roster.get(id);
  const members=specialistRows.filter(x=>x["Chief ID"]===id);
  return {
   department:chief.Department,chiefId:id,
   specialists:members.length,
   specialistsWithFirstPublicCandidate:members.filter(x=>seenAgents.has(x["Agent ID"])).length,
   specialistsWithoutFirstPublicCandidate:members.filter(x=>!seenAgents.has(x["Agent ID"])).length,
   independentlyApprovedSources:0
  };
 });
 if(pendingWithoutCandidate.length!==expectedOpen||nextSpecialists.length!==expectedRemaining||
    departments.length!==25)
  throw Error("B3_RECONCILED_PENDING_COVERAGE_INCORRECT");
 return {
  stage:"B",phase:3,kind:"RECONCILED_UNAPPROVED_PUBLIC_SOURCE_COVERAGE",
  mode:"OFFLINE_SOURCE_INSPECTION_REPORTS_ONLY",
  summary:{
   canonicalAgents:185,chiefs:25,specialists:160,
   candidateSources:expectedSources,
   chiefsWithFirstCandidate:25,
   specialistsWithFirstCandidate:expectedSpecialists,
   specialistsWithoutFirstCandidate:expectedRemaining,
   evidenceDocketsTotal:555,
   docketsWithCandidate:expectedSources,
   docketsWithoutCandidate:expectedOpen,
   independentDocketReviewsPending:555,
   verifiedExternalClaims:0,ownerApprovedKnowledgeLibraries:0,
   permissionedLiveCitations:0,realModelEvaluations:0,
   activatedAgents:0
  },
  sourceRecords,pendingWithoutCandidate,nextSpecialists,departments
 };
}
