/**
 * Stage B3: third 10-specialist public page inspection metadata pilot.
 * Does not fetch pages, execute agents, or issue authenticated owner,
 * professional, private-data, citation, or source-ingestion permissions.
 *
 * Exact source-metadata matching is NOT independent claim verification.
 */
import {validateSecondTenExpansionSpecialists} from "./phase3-second-ten-expansion-specialists.mjs";

const SOURCES=Object.freeze({
 "agent-expansion-021":["sre.google","/sre-book/service-level-objectives/"],
 "agent-expansion-022":["www.nikonusa.com","/learn-and-explore/c/tips-and-techniques/a-basic-look-at-the-basics-of-exposure"],
 "agent-expansion-023":["www.pmi.org","/learning/library/four-ways-project-schedules-limited-7265"],
 "agent-expansion-024":["naturalhistory.si.edu","/research/botany/news/plant-press/guide-collecting-plant-specimens-us-national-herbarium"],
 "agent-expansion-025":["api-security.owasp.org","/editions/2023/en/0xa1-broken-object-level-authorization/"],
 "agent-expansion-026":["travel.state.gov","/en/international-travel/planning.html"],
 "agent-expansion-027":["www.nps.gov","/subjects/healthandsafety/trip-planning-guide.htm"],
 "agent-expansion-028":["www.nist.gov","/publications/assessing-security-and-privacy-controls-information-systems-and-organizations"],
 "agent-expansion-029":["www.gov.uk","/service-manual/user-research/plan-user-research-for-your-service"],
 "agent-expansion-030":["ies.ed.gov","/ncee/WWC/PracticeGuide/12/Published"]
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
const MUST_FALSE=["originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed"];
const exact=(value,keys)=>!!value&&typeof value==="object"&&!Array.isArray(value)&&
 Object.keys(value).length===keys.size&&Object.keys(value).every(k=>keys.has(k));
const text=s=>typeof s==="string"&&s.trim().length>=5&&s.length<=1200;
const validDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+"T00:00:00Z"))&&
 new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const expectedSummary=Object.freeze({
 newAssistantInspectedPages:10,chiefsWithCandidate:25,specialistsWithCandidate:49,
 docketCandidates:74,docketsWithoutCandidates:481,specialistsWithoutCandidate:111,
 independentDocketReviewsPending:555,verifiedClaims:0,ownerApprovedKnowledgeLibraries:0,
 liveCitationsAllowed:0,actualModelEvaluations:0,agentsActivated:0
});
export function validateThirdTenExpansionSpecialists(
 pilot,secondTen,firstTen,priorEleven,priorEight,frozen,queue,chief1,chief2,chief3
){
 const earlier=validateSecondTenExpansionSpecialists(
  secondTen,firstTen,priorEleven,priorEight,frozen,queue,chief1,chief2,chief3
 );
 if(earlier.summary.specialistsWithFirstPublicSourceCandidate!==39||
    earlier.summary.docketsWithSourceCandidate!==64)
  throw Error("B3_THIRD_TEN_PRIOR_COVERAGE_NOT_VALIDATED");
 if(!exact(pilot,TOP)||pilot.schemaVersion!==1||pilot.stage!=="B"||pilot.phase!==3||
    pilot.kind!=="ASSISTANT_INSPECTED_THIRD_TEN_EXPANSION_SPECIALISTS_PUBLIC_PILOT"||
    pilot.scope!=="EXPANSION_SPECIALISTS_021_TO_030_K1_PUBLIC_REVIEW_CANDIDATES"||
    pilot.observedOn!=="2026-11-08"||!text(pilot.evidenceMethod)||
    pilot.independentHumanReview!=="NOT_DONE"||
    pilot.ownerApproval!=="NOT_GRANTED"||
    pilot.citationPromotionAllowed!==false||pilot.productionDataUsed!==false||
    pilot.externalAccountConnected!==false||pilot.modelExecutions!==0||
    !Array.isArray(pilot.items)||pilot.items.length!==10||
    !exact(pilot.summary,SUMMARY)||
    Object.entries(expectedSummary).some(([k,v])=>pilot.summary[k]!==v))
  throw Error("B3_THIRD_TEN_UNAPPROVED_MANIFEST_REQUIRED");
 const roster=new Map(frozen.records.map(x=>[x["Agent ID"],x]));
 const dockets=new Map(queue.items.map(x=>[x.requirementId,x]));
 const earlierIds=new Set([...priorEight.items,...priorEleven.items,
   ...firstTen.items,...secondTen.items].map(x=>x.agentId));
 if(roster.size!==185||dockets.size!==555||earlierIds.size!==39)
  throw Error("B3_THIRD_TEN_FROZEN_REVIEW_INVENTORY_REQUIRED");
 const seen=new Set(),review=[];
 for(const item of pilot.items){
  if(!exact(item,ENTRY)||!Object.hasOwn(SOURCES,item.agentId)||
     seen.has(item.agentId)||earlierIds.has(item.agentId))
   throw Error("B3_THIRD_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID");
  seen.add(item.agentId);
  const row=roster.get(item.agentId),docket=dockets.get(item.requirementId);
  if(!row||row.Role!=="Specialist"||row.Name!==item.displayName||
     row.Specialty!==item.specialty||
     row.Department!==item.department||row["Chief ID"]!==item.chiefId||
     item.requirementId!==item.agentId+"-K1"||
     item.pilotId!=="b3-expansion-specialist-"+item.agentId+"-k1-20261108"||
     docket?.canonicalAgentId!==item.agentId||
     docket.reviewState!=="PENDING_SOURCE_EVIDENCE"||
     docket.mayCiteExternalClaim!==false)
   throw Error("B3_THIRD_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH");
  let url;
  try{url=new URL(item.url)}catch{throw Error("B3_THIRD_TEN_SOURCE_URL_INVALID")}
  const [host,path]=SOURCES[item.agentId];
  if(url.protocol!=="https:"||url.hostname!==host||url.pathname!==path||
     url.port||url.username||url.password||url.search||url.hash)
   throw Error("B3_THIRD_TEN_SOURCE_URL_INVALID");
  if(!["publisher","title","sourceSection","documentVersion","paraphrase",
      "application","criticalLimit","nextReviewAction"].every(k=>text(item[k]))||
     item.observedOn!=="2026-11-08"||
     !(item.publicationDate===null||validDate(item.publicationDate))||
     item.publicationDate!==null&&item.publicationDate>item.observedOn)
   throw Error("B3_THIRD_TEN_INVALID_SOURCE_METADATA");
  if(item.inspectionState!=="PUBLIC_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     MUST_FALSE.some(k=>item[k]!==false))
   throw Error("B3_THIRD_TEN_FALSE_SOURCE_APPROVAL_OR_GRANT");
  review.push({
   agentId:item.agentId,displayName:item.displayName,
   specialty:item.specialty,chiefId:item.chiefId,department:item.department,
   requirementId:item.requirementId,officialUrl:item.url,
   assistantReportedInspectionDate:item.observedOn,
   kind:"UNAPPROVED_PUBLIC_SOURCE_REVIEW_CANDIDATE",
   independentClaimVerified:false,rightsApproved:false,
   ownerApproved:false,liveCitationAllowed:false,
   productionDataProcessed:false,modelTestPerformed:false,
   next:"Independently verify current publisher page, claim relevance and rights, then request authenticated owner decision"
  });
 }
 if(seen.size!==10||Object.keys(SOURCES).some(x=>!seen.has(x)))
  throw Error("B3_THIRD_TEN_MISSING_AGENT_RECORDS");
 return {
  stage:"B",phase:3,schemaVersion:1,
  kind:"B3_THIRD_TEN_SPECIALIST_PUBLIC_SOURCE_CANDIDATES_PENDING",
  added:review,
  summary:{
   frozenAgents:185,chiefsWithFirstSourceCandidate:25,
   specialistsWithFirstSourceCandidate:49,specialistsMissingFirstSource:111,
   sourceDockets:555,publicDocketsWithCandidate:74,
   publicDocketsMissingCandidate:481,pendingIndependentDocketReviews:555,
   independentlyVerifiedClaims:0,ownerApprovedKnowledgeLibraries:0,
   activeLiveCitations:0,realModelEvaluations:0,activeAgents:0
  }
 };
}
