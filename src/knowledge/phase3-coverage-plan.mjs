/**
 * Phase B3 coverage planner for 185 frozen roles and 555 independent
 * source-evidence dockets. All real-world claim approvals stay PENDING.
 * "Inspected" here means an assistant-authored public-page review manifest,
 * NOT validated source contents, owner approval or live agent knowledge.
 */
import {validatePublicSourceExpansion} from "./phase3-public-source-expansion.mjs";

export function buildPhase3SourceCoverage(frozen,queue,original,expansion){
 const approved=validatePublicSourceExpansion(expansion,original,queue,frozen);
 const byId=new Map(frozen.records.map(r=>[r["Agent ID"],r]));
 if(byId.size!==185||queue.items.length!==555)throw Error("SOURCE_COVERAGE_FROZEN_ROSTER_REQUIRED");
 const touched=new Set(approved.entries.map(r=>r.requirementId));
 if(touched.size!==10)throw Error("TEN_REVIEW_CANDIDATES_REQUIRED");
 const chiefs=frozen.records.filter(r=>r.Role==="Chief");
 const specialists=frozen.records.filter(r=>r.Role==="Specialist");
 if(chiefs.length!==25||specialists.length!==160)
  throw Error("SOURCE_COVERAGE_COUNTS_INVALID");
 const rolePlans=frozen.records.map(row=>{
  const id=row["Agent ID"];
  const its=queue.items.filter(x=>x.canonicalAgentId===id);
  if(its.length!==3||its.some(x=>x.reviewState!=="PENDING_SOURCE_EVIDENCE"))
   throw Error("SOURCE_COVERAGE_REVIEW_STATUS_INVALID");
  const selected=its.filter(x=>touched.has(x.requirementId));
  return {
   agentId:id,displayName:row.Name,role:row.Role,
   department:row.Department,chiefId:row["Chief ID"],
   evidenceNeeds:its.length,
   assistantInspectedPublicCandidates:selected.length,
   pendingRequirements:its.length,
   independentlyVerifiedClaims:0,ownerApprovedClaims:0,
   approvedCitationCount:0,liveKnowledgeSourceCount:0,
   nextUninspectedRequirementId:its.find(x=>!touched.has(x.requirementId))?.requirementId??null,
   reviewState:selected.length?"PUBLIC_MANIFEST_CANDIDATE_UNAPPROVED":"NO_INSPECTED_PUBLIC_SOURCE_YET"
  };
 });
 const chiefCoverage=rolePlans.filter(x=>x.role==="Chief");
 const nextChiefs=chiefCoverage.filter(x=>x.assistantInspectedPublicCandidates===0)
  .map(x=>({
   agentId:x.agentId,displayName:x.displayName,department:x.department,
   requirementId:x.nextUninspectedRequirementId,
   status:"NEEDS_OFFICIAL_PUBLIC_REFERENCE_INSPECTION",
   externalSourceVerified:false,ownerApproved:false
  }));
 const departments=chiefCoverage.map(chief=>{
  const members=rolePlans.filter(x=>x.department===chief.department);
  if(members.filter(x=>x.role==="Chief").length!==1||
     members.some(x=>x.role==="Specialist"&&x.chiefId!==chief.agentId))
   throw Error("SOURCE_COVERAGE_INVALID_DEPARTMENT");
  return {
   department:chief.department,chiefId:chief.agentId,
   agentCount:members.length,inspectedCandidateCount:
     members.reduce((sum,x)=>sum+x.assistantInspectedPublicCandidates,0),
   independentApprovalCount:0
  };
 });
 const count=rolePlans.reduce((sum,p)=>sum+p.assistantInspectedPublicCandidates,0);
 if(count!==10||nextChiefs.length!==15||departments.length!==25)
  throw Error("SOURCE_COVERAGE_INTEGRITY_FAILED");
 return {
  schemaVersion:1,stage:"B",phase:3,kind:"UNAPPROVED_PUBLIC_SOURCE_COVERAGE_PLAN",
  rolePlans,departments,nextChiefs,
  summary:{canonicalAgents:185,chiefs:25,specialists:160,
   reviewDockets:555,publicAssistantInspectionsRecorded:10,
   publiclyInspectedChiefs:10,chiefsStillWithoutInspectedPublicSource:15,
   specialistsStillWithoutInspectedPublicSource:160,
   docketsWithoutPublicInspections:545,pendingIndependentDocketReviews:555,
   independentlyVerifiedExternalClaims:0,
   ownerApprovedRoleKnowledgePacks:0,
   liveCitableClaims:0,agentActivations:0}
 };
}
