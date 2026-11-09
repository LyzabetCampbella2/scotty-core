/**
 * SCOTTY Stage B3: second 10-agent expansion source review pilot.
 * Validates a human-readable public-reference manifest against immutable
 * roster and still-open evidence dockets. Absolutely NO source fetching,
 * owner authentication, source licensing, persistent memory or agent runtime.
 *
 * A source URL/metadata shape match is NOT independent factual verification.
 */
import {validateTenExpansionSpecialists} from "./phase3-ten-expansion-specialists.mjs";
const SOURCES=Object.freeze({
 "agent-expansion-011":["www.grants.nih.gov","/policy-and-compliance/policy-topics/reproducibility"],
 "agent-expansion-012":["www.w3.org","/WAI/tutorials/menus/"],
 "agent-expansion-013":["www.consumerfinance.gov","/consumer-tools/disasters-and-emergencies/get-prepared-before-disaster-emergency-strikes/"],
 "agent-expansion-014":["www.usgs.gov","/geospatial-data"],
 "agent-expansion-015":["www.nist.gov","/programs-projects/combinatorial-testing"],
 "agent-expansion-016":["www.gov.uk","/service-manual/service-standard/point-1-understand-user-needs"],
 "agent-expansion-017":["ies.ed.gov","/ncee/wwc/PracticeGuide/29"],
 "agent-expansion-018":["www.nimh.nih.gov","/health/publications/depression"],
 "agent-expansion-019":["naturalhistory.si.edu","/research/anthropology/programs/recovering-voices/recovering-voices-research"],
 "agent-expansion-020":["www.gov.uk","/government/publications/the-government-data-quality-framework/the-government-data-quality-framework-guidance"]
});
const TOP=new Set(["schemaVersion","stage","phase","kind","scope","observedOn",
 "evidenceMethod","independentHumanReview","ownerApproval","citationPromotionAllowed",
 "productionDataUsed","externalAccountConnected","modelExecutions","items","summary"]);
const ENTRY=new Set(["pilotId","agentId","displayName","specialty","department","chiefId",
 "requirementId","publisher","title","url","sourceSection","documentVersion",
 "publicationDate","paraphrase","application","criticalLimit","observedOn",
 "inspectionState","originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed","nextReviewAction"]);
const COUNTS=new Set(["newAssistantInspectedPages","chiefsWithCandidate",
 "specialistsWithCandidate","docketCandidates","docketsWithoutCandidates",
 "specialistsWithoutCandidate","independentDocketReviewsPending","verifiedClaims",
 "ownerApprovedKnowledgeLibraries","liveCitationsAllowed",
 "actualModelEvaluations","agentsActivated"]);
const DEFAULT_DENY=["originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed"];
const exact=(obj,keys)=>!!obj&&typeof obj==="object"&&!Array.isArray(obj)&&
 Object.keys(obj).length===keys.size&&Object.keys(obj).every(k=>keys.has(k));
const prose=s=>typeof s==="string"&&s.trim().length>=5&&s.length<=1200;
const date=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;

export function validateSecondTenExpansionSpecialists(pilot,firstTen,previousEleven,
 previousEight,frozen,queue,chief1,chief2,chief3){
 const prior=validateTenExpansionSpecialists(firstTen,previousEleven,
  previousEight,frozen,queue,chief1,chief2,chief3);
 if(prior.summary.specialistsWithCandidate!==29||
    prior.summary.sourceDocketsWithInspectedCandidate!==54)
  throw Error("B3_SECOND_TEN_PRIOR_PILOT_INVALID");
 if(!exact(pilot,TOP)||pilot.schemaVersion!==1||pilot.stage!=="B"||pilot.phase!==3||
    pilot.kind!=="ASSISTANT_INSPECTED_SECOND_TEN_EXPANSION_SPECIALISTS_PUBLIC_PILOT"||
    pilot.scope!=="EXPANSION_SPECIALISTS_011_TO_020_K1_PUBLIC_REVIEW_CANDIDATES"||
    pilot.observedOn!=="2026-11-08"||
    !prose(pilot.evidenceMethod)||pilot.independentHumanReview!=="NOT_DONE"||
    pilot.ownerApproval!=="NOT_GRANTED"||pilot.citationPromotionAllowed!==false||
    pilot.productionDataUsed!==false||pilot.externalAccountConnected!==false||
    pilot.modelExecutions!==0||!Array.isArray(pilot.items)||pilot.items.length!==10||
    !exact(pilot.summary,COUNTS)||
    pilot.summary.newAssistantInspectedPages!==10||
    pilot.summary.chiefsWithCandidate!==25||
    pilot.summary.specialistsWithCandidate!==39||
    pilot.summary.docketCandidates!==64||
    pilot.summary.docketsWithoutCandidates!==491||
    pilot.summary.specialistsWithoutCandidate!==121||
    pilot.summary.independentDocketReviewsPending!==555||
    pilot.summary.verifiedClaims!==0||
    pilot.summary.ownerApprovedKnowledgeLibraries!==0||
    pilot.summary.liveCitationsAllowed!==0||
    pilot.summary.actualModelEvaluations!==0||
    pilot.summary.agentsActivated!==0)
  throw Error("B3_SECOND_TEN_UNAPPROVED_MANIFEST_REQUIRED");
 const byId=new Map(frozen.records.map(r=>[r["Agent ID"],r]));
 const dockets=new Map(queue.items.map(d=>[d.requirementId,d]));
 const earlier=new Set([
   ...previousEight.items,...previousEleven.items,...firstTen.items
  ].map(r=>r.agentId));
 if(byId.size!==185||dockets.size!==555||earlier.size!==29)
  throw Error("B3_SECOND_TEN_CANONICAL_INVENTORY_INVALID");
 const seen=new Set(),review=[];
 for(const item of pilot.items){
  if(!exact(item,ENTRY)||!Object.hasOwn(SOURCES,item.agentId)||
     earlier.has(item.agentId)||seen.has(item.agentId))
   throw Error("B3_SECOND_TEN_DUPLICATE_OR_INVALID_ID");
  seen.add(item.agentId);
  const canonical=byId.get(item.agentId);
  const docket=dockets.get(item.requirementId);
  if(!canonical||canonical.Role!=="Specialist"||
     item.displayName!==canonical.Name||
     item.specialty!==canonical.Specialty||
     item.department!==canonical.Department||
     item.chiefId!==canonical["Chief ID"]||
     item.pilotId!=="b3-expansion-specialist-"+item.agentId+"-k1-20261108"||
     item.requirementId!==item.agentId+"-K1"||
     docket?.canonicalAgentId!==item.agentId||
     docket.reviewState!=="PENDING_SOURCE_EVIDENCE"||
     docket.mayCiteExternalClaim!==false)
   throw Error("B3_SECOND_TEN_CANONICAL_ID_OR_REQUIREMENT_MISMATCH");
  const [host,path]=SOURCES[item.agentId];
  let u;
  try{u=new URL(item.url)}catch{throw Error("B3_SECOND_TEN_SOURCE_URL_INVALID")}
  if(u.protocol!=="https:"||u.hostname!==host||u.pathname!==path||
    u.username||u.password||u.port||u.search||u.hash)
   throw Error("B3_SECOND_TEN_SOURCE_URL_INVALID");
  if(!["publisher","title","sourceSection","documentVersion",
        "paraphrase","application","criticalLimit","nextReviewAction"]
       .every(k=>prose(item[k]))||
     item.observedOn!=="2026-11-08"||
     !(item.publicationDate===null||date(item.publicationDate))||
     (item.publicationDate!==null&&item.publicationDate>item.observedOn))
   throw Error("B3_SECOND_TEN_SOURCE_METADATA_INVALID");
  if(item.inspectionState!=="PUBLIC_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     DEFAULT_DENY.some(k=>item[k]!==false))
   throw Error("B3_SECOND_TEN_CANNOT_PROMOTE_TO_APPROVED");
  review.push({
   agentId:item.agentId,displayName:item.displayName,department:item.department,
   specialty:item.specialty,chiefId:item.chiefId,requirementId:item.requirementId,
   officialSourceUrl:item.url,assistantReportedInspectionDate:item.observedOn,
   inspectionState:"ASSISTANT_AUTHORED_PUBLIC_REFERENCE_REVIEW",
   externalClaimIndependentlyReviewed:false,sourceRightsReviewed:false,
   ownerApproved:false,liveAgentCitationAllowed:false,
   eligibleForKnowledgeImport:false,productionRecordsUsed:false,
   pendingAction:"Independent current-page, claim, rights and owner review"
  });
 }
 if(seen.size!==10||Object.keys(SOURCES).some(id=>!seen.has(id)))
  throw Error("B3_SECOND_TEN_MISSING_CANONICAL_ID");
 return {
  stage:"B",phase:3,schemaVersion:1,kind:"B3_SECOND_TEN_SPECIALISTS_PENDING_REVIEW",
  additional:10,previousSpecialists:29,review,
  summary:{
   canonicalAgents:185,
   chiefsWithFirstPublicSourceCandidate:25,
   specialistsWithFirstPublicSourceCandidate:39,
   specialistsStillWithoutCandidate:121,
   evidenceDocketsTotal:555,
   docketsWithSourceCandidate:64,
   docketsWithoutSourceCandidate:491,
   independentDocketDecisionsStillPending:555,
   humanIndependentClaimApprovals:0,
   ownerApprovedKnowledgeLibraries:0,
   permissionedLiveCitations:0,
   realModelRetrievalRuns:0,
   activeAgents:0
  }
 };
}
