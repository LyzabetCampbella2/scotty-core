/**
 * Stage B Phase 3: fourth 10-specialist public-source review batch.
 * Validates only explicitly unapproved, public metadata for frozen
 * specialist IDs 031-040. Does not browse, ingest, authenticate owner,
 * review legal rights, run agents or authorize a live citation.
 */
import {validateThirdTenExpansionSpecialists} from "./phase3-third-ten-expansion-specialists.mjs";

export const FOURTH_TEN_SOURCE_ROUTES=Object.freeze({
 "agent-expansion-031":["www.w3.org","/WAI/planning/involving-users/"],
 "agent-expansion-032":["www.archives.gov","/preservation/family-archives/handling.html"],
 "agent-expansion-033":["service-manual.ons.gov.uk","/data-visualisation/guidance/principles"],
 "agent-expansion-034":["docs.cloud.google.com","/architecture/framework/reliability/perform-testing-for-recovery-from-data-loss"],
 "agent-expansion-035":["helpx.adobe.com","/premiere/desktop/edit-projects/edit-video-using-text-based-editing/create-a-sequence-with-paper-edit.html"],
 "agent-expansion-036":["www.pmi.org","/learning/library/importance-of-closing-process-group-9949"],
 "agent-expansion-037":["www.epa.gov","/national-aquatic-resource-surveys/what-national-rivers-and-streams-assessment"],
 "agent-expansion-038":["playwright.dev","/docs/actionability"],
 "agent-expansion-039":["www.pmi.org","/learning/library/common-scheduling-mistakes-avoid-7221"],
 "agent-expansion-040":["data.gov","/contact/"]
});
const TOP=new Set(["schemaVersion","stage","phase","kind","scope","observedOn","evidenceMethod",
 "independentHumanReview","ownerApproval","citationPromotionAllowed","productionDataUsed",
 "externalAccountConnected","modelExecutions","items","summary"]);
const ENTRY=new Set(["pilotId","agentId","displayName","specialty","department","chiefId","requirementId",
 "publisher","title","url","sourceSection","documentVersion","publicationDate","paraphrase",
 "application","criticalLimit","observedOn","inspectionState","originalSourceTextCopied",
 "independentPublisherAuthentication","independentlyVerifiedClaim","licensingReviewed",
 "ownerApproved","citableByLiveAgents","sharedMemoryPromotionAllowed","nextReviewAction"]);
const SUMMARY=new Set(["newAssistantInspectedPages","chiefsWithCandidate","specialistsWithCandidate",
 "docketCandidates","docketsWithoutCandidates","specialistsWithoutCandidate",
 "independentDocketReviewsPending","verifiedClaims","ownerApprovedKnowledgeLibraries",
 "liveCitationsAllowed","actualModelEvaluations","agentsActivated"]);
const REQUIRED_FALSE=["originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed"];
const exact=(obj,keys)=>!!obj&&typeof obj==="object"&&!Array.isArray(obj)&&
 Object.keys(obj).length===keys.size&&Object.keys(obj).every(key=>keys.has(key));
const validText=s=>typeof s==="string"&&s.trim().length>=5&&s.length<=1300;
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 !Number.isNaN(Date.parse(s+"T00:00:00Z"))&&
 new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const expectedSummary=Object.freeze({
 newAssistantInspectedPages:10,chiefsWithCandidate:25,specialistsWithCandidate:59,
 docketCandidates:84,docketsWithoutCandidates:471,specialistsWithoutCandidate:101,
 independentDocketReviewsPending:555,verifiedClaims:0,ownerApprovedKnowledgeLibraries:0,
 liveCitationsAllowed:0,actualModelEvaluations:0,agentsActivated:0
});
export function validateFourthTenExpansionSpecialists(
 pilot,thirdTen,secondTen,firstTen,priorEleven,priorEight,frozen,queue,
 chief1,chief2,chief3
){
 const prev=validateThirdTenExpansionSpecialists(
  thirdTen,secondTen,firstTen,priorEleven,priorEight,
  frozen,queue,chief1,chief2,chief3);
 if(prev.summary.specialistsWithFirstSourceCandidate!==49||
    prev.summary.publicDocketsWithCandidate!==74)
  throw Error("B3_FOURTH_TEN_PREVIOUS_COVERAGE_UNVERIFIED");
 if(!exact(pilot,TOP)||pilot.schemaVersion!==1||pilot.stage!=="B"||pilot.phase!==3||
    pilot.kind!=="ASSISTANT_INSPECTED_FOURTH_TEN_EXPANSION_SPECIALISTS_PUBLIC_PILOT"||
    pilot.scope!=="EXPANSION_SPECIALISTS_031_TO_040_K1_PUBLIC_REVIEW_CANDIDATES"||
    pilot.observedOn!=="2026-11-09"||!validText(pilot.evidenceMethod)||
    pilot.independentHumanReview!=="NOT_DONE"||pilot.ownerApproval!=="NOT_GRANTED"||
    pilot.citationPromotionAllowed!==false||pilot.productionDataUsed!==false||
    pilot.externalAccountConnected!==false||pilot.modelExecutions!==0||
    !Array.isArray(pilot.items)||pilot.items.length!==10||
    !exact(pilot.summary,SUMMARY)||
    Object.entries(expectedSummary).some(([key,val])=>pilot.summary[key]!==val))
  throw Error("B3_FOURTH_TEN_UNAPPROVED_MANIFEST_REQUIRED");
 const roster=new Map(frozen.records.map(x=>[x["Agent ID"],x]));
 const dockets=new Map(queue.items.map(x=>[x.requirementId,x]));
 const priorIds=new Set([...priorEight.items,...priorEleven.items,...firstTen.items,
   ...secondTen.items,...thirdTen.items].map(x=>x.agentId));
 if(roster.size!==185||dockets.size!==555||priorIds.size!==49)
  throw Error("B3_FOURTH_TEN_FROZEN_INVENTORY_REQUIRED");
 const seen=new Set(),review=[];
 for(const item of pilot.items){
  if(!exact(item,ENTRY)||!Object.hasOwn(FOURTH_TEN_SOURCE_ROUTES,item.agentId)||
     seen.has(item.agentId)||priorIds.has(item.agentId))
   throw Error("B3_FOURTH_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID");
  seen.add(item.agentId);
  const row=roster.get(item.agentId),docket=dockets.get(item.requirementId);
  if(!row||row.Role!=="Specialist"||row.Name!==item.displayName||
     row.Specialty!==item.specialty||row.Department!==item.department||
     row["Chief ID"]!==item.chiefId||
     item.requirementId!==item.agentId+"-K1"||
     item.pilotId!=="b3-fourth-specialist-"+item.agentId+"-k1-20261109"||
     docket?.canonicalAgentId!==item.agentId||
     docket.reviewState!=="PENDING_SOURCE_EVIDENCE"||
     docket.mayCiteExternalClaim!==false)
   throw Error("B3_FOURTH_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH");
  let parsed;
  try{parsed=new URL(item.url)}catch{throw Error("B3_FOURTH_TEN_SOURCE_URL_INVALID")}
  const [host,path]=FOURTH_TEN_SOURCE_ROUTES[item.agentId];
  if(parsed.protocol!=="https:"||parsed.hostname!==host||parsed.pathname!==path||
     parsed.port||parsed.username||parsed.password||parsed.search||parsed.hash)
   throw Error("B3_FOURTH_TEN_SOURCE_URL_INVALID");
  if(!["publisher","title","sourceSection","documentVersion","paraphrase",
       "application","criticalLimit","nextReviewAction"].every(k=>validText(item[k]))||
     item.observedOn!=="2026-11-09"||
     !(item.publicationDate===null||validDate(item.publicationDate))||
     item.publicationDate!==null&&item.publicationDate>item.observedOn)
   throw Error("B3_FOURTH_TEN_INVALID_SOURCE_METADATA");
  if(item.inspectionState!=="PUBLIC_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     REQUIRED_FALSE.some(k=>item[k]!==false))
   throw Error("B3_FOURTH_TEN_FALSE_VERIFICATION_OR_OWNER_APPROVAL");
  review.push({
   agentId:item.agentId,displayName:item.displayName,chiefId:item.chiefId,
   specialty:item.specialty,department:item.department,requirementId:item.requirementId,
   officialUrl:item.url,assistantReportedInspectionDate:item.observedOn,
   kind:"UNAPPROVED_OFFICIAL_PUBLIC_SOURCE_REVIEW_CANDIDATE",
   publisherIndependentlyVerified:false,claimIndependentlyReviewed:false,
   rightsApproved:false,ownerApproved:false,liveCitationAllowed:false,
   privateDataAccess:false,realModelEvaluation:false,
   next:"Independent exact source, version, claim scope and license review, then authenticated owner decision"
  });
 }
 if(seen.size!==10||Object.keys(FOURTH_TEN_SOURCE_ROUTES).some(x=>!seen.has(x)))
  throw Error("B3_FOURTH_TEN_INCOMPLETE_AGENT_BATCH");
 return {stage:"B",phase:3,schemaVersion:1,
  kind:"B3_FOURTH_TEN_SPECIALIST_PUBLIC_SOURCE_REVIEW_ONLY",
  added:review,
  summary:{
   frozenAgents:185,chiefsWithFirstSourceCandidate:25,
   specialistsWithFirstSourceCandidate:59,specialistsMissingFirstSource:101,
   sourceDockets:555,publicDocketsWithCandidate:84,
   publicDocketsMissingCandidate:471,pendingIndependentDocketReviews:555,
   independentlyVerifiedClaims:0,ownerApprovedKnowledgeLibraries:0,
   activeLiveCitations:0,realModelEvaluations:0,activeAgents:0
  }
 };
}
