/**
 * B3 next research batch: 160 individual specialist search/review briefs.
 * These are SEARCH TASKS, not 160 externally located, opened or approved
 * sources. The 25 chiefs' references are orientation only, not evidence for
 * a specialist's own expertise.
 */
import {validateCompleteChiefPublicReview} from "./phase3-all-chief-public-review.mjs";

const SOURCE_FAMILIES=Object.freeze({
 "Health & Human Support":["Public-health agency","Professional clinical guidance","Peer-reviewed primary study"],
 "Accessibility & Wellbeing":["W3C or accessibility standard","Official service guidance","User-tested accessibility research"],
 "Research & Intelligence":["Primary research index","Research method publication","Official data dictionary"],
 "Education & Learning":["Education research clearinghouse","Curriculum standards body","Original learning assessment study"],
 "Life Sciences":["Scientific publisher or NIH","Official biological-method standard","Original peer-reviewed research"],
 "History & Culture":["Primary archive or museum","Historical reference authority","Primary source context study"],
 "Design & Media":["W3C accessibility guidance","Official creative-tool documentation","Professional media standard"],
 "Home & Logistics":["Government preparedness guidance","Official travel or consumer guidance","Local service requirements"],
 "Automation & Reliability":["Official software documentation","SRE practice publication","Validated incident study"],
 "Projects & Delivery":["PMI professional guidance","Official delivery methodology","Documented project evaluation"],
 "Data & Analytics":["Official statistical guidance","Measurement standard","Original methods research"],
 "Business & Enterprise":["SBA business guidance","Authoritative market data","Professional operations standard"],
 "Quality & Verification":["Independent testing standard","Official control assessment","Evidence-based verification guidance"],
 "Science & Environment":["EPA field data QA guidance","National scientific data center","Peer-reviewed environmental methodology"],
 "Command & Missions":["Incident coordination standard","Official emergency preparedness guidance","Original team decision study"],
 "Policy & Diplomacy":["Primary law or treaty text","Official government or intergovernmental commentary","Documented conflict-resolution evidence"],
 "Operations & Coordination":["Official service delivery playbook","Professional process standard","Independent operational evaluation"],
 "Strategy & Reasoning":["Risk management guidance","Decision-analysis methodology","Original uncertainty research"],
 "Communications & Languages":["Plain-language accessibility guidance","Official language/translation standard","Multilingual comprehension research"]
});
const nonempty=s=>typeof s==="string"&&s.trim().length>0&&s.length<400;
export function buildSpecialistSourceResearchQueue(frozen,queue,first,second,third){
 const chief=validateCompleteChiefPublicReview(third,frozen,queue,first,second);
 if(chief.summary.assistantInspectedChiefCandidates!==25)
  throw Error("CHIEF_PUBLIC_BASELINE_REQUIRED");
 const byId=new Map(frozen.records.map(x=>[x["Agent ID"],x]));
 const dockets=new Map(queue.items.map(x=>[x.requirementId,x]));
 if(byId.size!==185||dockets.size!==555)throw Error("FROZEN_REVIEW_IDS_REQUIRED");
 const specialists=frozen.records.filter(x=>x.Role==="Specialist");
 if(specialists.length!==160)throw Error("160_SPECIALISTS_REQUIRED");
 const rows=specialists.map(x=>{
  const id=x["Agent ID"],department=x.Department,chiefId=x["Chief ID"];
  const specialty=x.Specialty;
  const sourceTypes=SOURCE_FAMILIES[department]||
    ["Primary institutional documentation","Professional subject standard","Original empirical study"];
  if(!nonempty(id)||!nonempty(specialty)||!byId.has(chiefId)||
     byId.get(chiefId).Role!=="Chief"||
     byId.get(chiefId).Department!==department||
     sourceTypes.length!==3)
   throw Error("SPECIALIST_SOURCE_ROLE_INVALID");
  const needs=[1,2,3].map((number,index)=>{
   const requirementId=id+"-K"+number;
   const docket=dockets.get(requirementId);
   if(!docket||docket.canonicalAgentId!==id||docket.reviewState!=="PENDING_SOURCE_EVIDENCE")
    throw Error("SPECIALIST_MISSING_OPEN_DOCKET");
   return {
    requirementId,
    requirement:docket.requiredClaim,
    suggestedPrimarySourceKind:sourceTypes[index],
    researchQuestion:"Which current, authoritative publicly available "+sourceTypes[index]+
      " supports or qualifies this "+specialty+" requirement, with exact page, version, date and limitations?",
    requiredEvidence:[
      "Publisher and author authority confirmed independently",
      "Exact source location, version, access date and claim relevance",
      "Opposing evidence, known exceptions and material uncertainty",
      "Copyright/license and scope of permissible use reviewed",
      "Independent review and owner approval before agent citation"
    ],
    publicSourceUrl:null,sourceContentInspected:false,
    independentlyVerified:false,ownerApproved:false,
    citationPermitted:false
   };
  });
  return {
   agentId:id,displayName:x.Name,department,chiefId,specialty,
   researchTasks:needs,
   chiefReferenceIsOnlyAStartingLens:true,
   inheritedFactualApprovalFromChief:false,
   realPrivateFilesAllowed:false,productionDataUsed:false,
   status:"THREE_SPECIALIST_PUBLIC_SOURCE_REVIEWS_NEEDED",
   authorizedKnowledgeClaims:0
  };
 });
 const ids=new Set(rows.map(x=>x.agentId));
 if(ids.size!==160)throw Error("DUPLICATE_SPECIALIST_ID");
 return {
  stage:"B",phase:3,schemaVersion:1,
  kind:"160_SPECIALIST_PUBLIC_SOURCE_RESEARCH_BACKLOG_UNAPPROVED",
  sourceChiefReport:"25 assistant-inspected sources; no factual agent knowledge approval",
  rolePlans:rows,
  summary:{
   specialists:160,requiredPublicEvidenceReviews:480,
   publicSourcePagesOpenedForSpecialists:0,
   independentEvidenceReviewsCompleted:0,
   ownerApprovedSpecialistSources:0,liveSpecialistCitations:0,
   productionDataAccesses:0,realModelEvaluations:0,
   activeAgents:0
  }
 };
}
