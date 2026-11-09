/**
 * Shared B3 OFFLINE public-source review batch validation.
 *
 * Trust boundary: source routes supplied by committed reviewer code, never by
 * the candidate manifest.  These tests check metadata integrity and frozen
 * roster mapping, not whether any source is factually correct or owned/approved.
 * NO fetch, database, credentials, production files, human approval or agent run.
 */
const TOP=new Set(["schemaVersion","stage","phase","kind","scope","observedOn","evidenceMethod",
 "independentHumanReview","ownerApproval","citationPromotionAllowed","productionDataUsed",
 "externalAccountConnected","modelExecutions","items","summary"]);
const ENTRY=new Set(["pilotId","agentId","displayName","department","chiefId","specialty",
 "requirementId","publisher","title","url","sourceSection","documentVersion",
 "publicationDate","paraphrase","application","criticalLimit","observedOn",
 "inspectionState","originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed","nextReviewAction"]);
const SUMMARY=new Set(["newAssistantInspectedPages","chiefsWithCandidate","specialistsWithCandidate",
 "docketCandidates","docketsWithoutCandidates","specialistsWithoutCandidate",
 "independentDocketReviewsPending","verifiedClaims","ownerApprovedKnowledgeLibraries",
 "liveCitationsAllowed","actualModelEvaluations","agentsActivated"]);
const FALSE_FIELDS=["originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed"];
const exact=(obj,keys)=>obj!==null&&typeof obj==="object"&&!Array.isArray(obj)&&
 Object.keys(obj).length===keys.size&&Object.keys(obj).every(k=>keys.has(k));
const text=s=>typeof s==="string"&&s.trim().length>=5&&s.length<=1300;
const date=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+"T00:00:00Z"))&&
 new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;

export function validatePublicSpecialistBatch({
 manifest,routeRegistry,frozen,queue,priorAgentIds,
 batchKind,batchScope,observedOn,expectedTotalSpecialists,pilotPrefix
}={}){
 if(!routeRegistry||!exact(manifest,TOP)||
    !Array.isArray(priorAgentIds)||new Set(priorAgentIds).size!==priorAgentIds.length||
    !Number.isInteger(expectedTotalSpecialists)||expectedTotalSpecialists<1||
    expectedTotalSpecialists>160||!text(pilotPrefix)||
    !date(observedOn)||!text(batchKind)||!text(batchScope))
  throw Error("B3_GENERIC_BATCH_PRECONDITIONS_REQUIRED");
 const number=Object.keys(routeRegistry).length;
 const sourceTotal=25+expectedTotalSpecialists;
 const summaryExpected={
  newAssistantInspectedPages:number,chiefsWithCandidate:25,
  specialistsWithCandidate:expectedTotalSpecialists,
  docketCandidates:sourceTotal,docketsWithoutCandidates:555-sourceTotal,
  specialistsWithoutCandidate:160-expectedTotalSpecialists,
  independentDocketReviewsPending:555,verifiedClaims:0,
  ownerApprovedKnowledgeLibraries:0,liveCitationsAllowed:0,
  actualModelEvaluations:0,agentsActivated:0
 };
 if(number<1||number>25||
    manifest.schemaVersion!==1||manifest.stage!=="B"||manifest.phase!==3||
    manifest.kind!==batchKind||manifest.scope!==batchScope||
    manifest.observedOn!==observedOn||!text(manifest.evidenceMethod)||
    manifest.independentHumanReview!=="NOT_DONE"||
    manifest.ownerApproval!=="NOT_GRANTED"||
    manifest.citationPromotionAllowed!==false||manifest.productionDataUsed!==false||
    manifest.externalAccountConnected!==false||manifest.modelExecutions!==0||
    !Array.isArray(manifest.items)||manifest.items.length!==number||
    !exact(manifest.summary,SUMMARY)||
    Object.entries(summaryExpected).some(([key,val])=>manifest.summary[key]!==val))
  throw Error("B3_GENERIC_BATCH_MANIFEST_MUST_REMAIN_UNAPPROVED");
 const roster=new Map(frozen?.records?.map(r=>[r["Agent ID"],r]));
 const dockets=new Map(queue?.items?.map(d=>[d.requirementId,d]));
 if(roster.size!==185||dockets.size!==555||
    frozen.freezeStatus!=="OWNER_APPROVED_VERSIONED_SNAPSHOT")
  throw Error("B3_GENERIC_BATCH_FROZEN_ROSTER_OR_DOCKETS_REQUIRED");
 const prior=new Set(priorAgentIds);
 if(prior.size!==sourceTotal-number||
    frozen.records.filter(r=>r.Role==="Chief").some(r=>!prior.has(r["Agent ID"])))
  throw Error("B3_GENERIC_BATCH_BASELINE_INVALID");
 const seen=new Set(),review=[];
 for(const item of manifest.items){
  if(!exact(item,ENTRY)||!Object.hasOwn(routeRegistry,item.agentId)||
     prior.has(item.agentId)||seen.has(item.agentId))
   throw Error("B3_GENERIC_BATCH_DUPLICATE_UNKNOWN_OR_REPLAY_ID");
  seen.add(item.agentId);
  const row=roster.get(item.agentId),docket=dockets.get(item.requirementId);
  if(!row||row.Role!=="Specialist"||row.Name!==item.displayName||
     row.Specialty!==item.specialty||row.Department!==item.department||
     row["Chief ID"]!==item.chiefId||
     item.requirementId!==item.agentId+"-K1"||
     item.pilotId!==pilotPrefix+item.agentId+"-k1-"+observedOn.replaceAll("-","")||
     docket?.canonicalAgentId!==item.agentId||
     docket.reviewState!=="PENDING_SOURCE_EVIDENCE"||
     docket.mayCiteExternalClaim!==false)
   throw Error("B3_GENERIC_BATCH_FROZEN_AGENT_OR_DOCKET_MISMATCH");
  const [host,path]=routeRegistry[item.agentId];
  let url;try{url=new URL(item.url)}catch{throw Error("B3_GENERIC_BATCH_SOURCE_URL_INVALID")}
  if(url.protocol!=="https:"||url.hostname!==host||url.pathname!==path||
     url.port||url.username||url.password||url.search||url.hash)
   throw Error("B3_GENERIC_BATCH_SOURCE_URL_INVALID");
  if(!["publisher","title","sourceSection","documentVersion","paraphrase",
       "application","criticalLimit","nextReviewAction"].every(key=>text(item[key]))||
     item.observedOn!==observedOn||
     !(item.publicationDate===null||date(item.publicationDate))||
     item.publicationDate!==null&&item.publicationDate>observedOn)
   throw Error("B3_GENERIC_BATCH_INVALID_SOURCE_METADATA");
  if(item.inspectionState!=="PUBLIC_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     FALSE_FIELDS.some(key=>item[key]!==false))
   throw Error("B3_GENERIC_BATCH_FALSE_REVIEW_APPROVAL");
  review.push({
   agentId:item.agentId,requirementId:item.requirementId,
   role:"Specialist",department:item.department,
   officialUrl:item.url,reviewStatus:"ASSISTANT_INSPECTED_CANDIDATE_ONLY",
   independentSourceClaimReview:false,rightsApproved:false,
   ownerApproved:false,liveCitationAllowed:false,
   privateRecordAccess:false,actualModelEvaluation:false
  });
 }
 if(seen.size!==number||Object.keys(routeRegistry).some(id=>!seen.has(id)))
  throw Error("B3_GENERIC_BATCH_INCOMPLETE");
 return {stage:"B",phase:3,kind:"B3_GENERIC_SPECIALIST_REVIEW_REPORT",
  added:review,summary:{
   chiefsWithFirstCandidate:25,specialistsWithFirstCandidate:expectedTotalSpecialists,
   specialistsWithoutFirstCandidate:160-expectedTotalSpecialists,
   docketsWithCandidate:sourceTotal,docketsWithoutCandidate:555-sourceTotal,
   independentReviewsPending:555,verifiedClaims:0,ownerApprovedLibraries:0,
   liveCitationPermissions:0,actualModelEvaluations:0,activatedAgents:0
  }
 };
}
