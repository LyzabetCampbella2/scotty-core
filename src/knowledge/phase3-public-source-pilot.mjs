/**
 * B3 five-source public-doc pilot: validation and review preparation only.
 * The manifest records pages manually inspected during development, but its
 * metadata is not independent reviewer evidence or proof of currentness.
 * No network, document scraping, credential use or runtime knowledge access.
 */
const SOURCE_REGISTRY=Object.freeze({
 "chief-bones":{department:"Health & Human Support",requirement:"K1",host:"medlineplus.gov",prefix:"/evaluatinghealthinformation.html"},
 "chief-expansion-troi":{department:"Accessibility & Wellbeing",requirement:"K1",host:"www.w3.org",prefix:"/TR/2024/REC-WCAG22-20241212/"},
 "chief-worf":{department:"Security & Defense",requirement:"K1",host:"csrc.nist.gov",prefix:"/pubs/sp/800/207/final"},
 "chief-geordi":{department:"Engineering & Systems",requirement:"K3",host:"docs.github.com",prefix:"/en/actions/reference/workflows-and-actions/workflow-syntax"},
 "chief-expansion-torres":{department:"Software & Applications",requirement:"K2",host:"www.postgresql.org",prefix:"/docs/current/ddl-rowsecurity.html"}
});
const REVIEW_FIELDS=new Set([
 "pilotId","agentId","department","requirementId","publisher","title","url",
 "sourceSection","documentVersion","publicationDate","observedOn",
 "paraphrase","application","criticalLimit","inspectionState",
 "originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed","nextReviewAction"
]);
const asDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const meaningful=s=>typeof s==="string"&&s.trim().length>=12&&s.length<=700;
const denyState=x=>x===false;
export function validatePublicSourcePilot(manifest,queue,frozen){
 if(!manifest||manifest.kind!=="ASSISTANT_INSPECTED_PUBLIC_SOURCE_PILOT"||
    manifest.phase!==3||manifest.stage!=="B"||
    manifest.ownerApproval!=="NOT_GRANTED"||manifest.independentHumanReview!=="NOT_DONE"||
    manifest.citationPromotionAllowed!==false||manifest.productionDataUsed!==false||
    manifest.externalAccountConnected!==false||manifest.modelExecutions!==0||
    manifest.summary?.publicPagesInspected!==5||
    manifest.summary?.approvedKnowledgePacks!==0||
    manifest.summary?.independentReviewCompletions!==0||
    manifest.items?.length!==5||
    queue?.kind!=="OFFLINE_SOURCE_REVIEW_QUEUE"||
    queue.items?.length!==555||
    frozen?.freezeStatus!=="OWNER_APPROVED_VERSIONED_SNAPSHOT"||
    frozen.records?.length!==185)
  throw Error("B3_SOURCE_PILOT_MANIFEST_INVALID");
 const roster=new Map(frozen.records.map(x=>[x["Agent ID"],x]));
 const requirements=new Map(queue.items.map(x=>[x.requirementId,x]));
 if(roster.size!==185||requirements.size!==555)
  throw Error("B3_CANONICAL_SOURCE_INVENTORY_INVALID");
 const seen=new Set(),report=[];
 for(const item of manifest.items){
  if(!item||typeof item!=="object"||Array.isArray(item)||
     Object.keys(item).some(k=>!REVIEW_FIELDS.has(k))||
     seen.has(item.agentId)||
     !Object.hasOwn(SOURCE_REGISTRY,item.agentId))
   throw Error("PILOT_UNKNOWN_OR_DUPLICATE_ID");
  const expected=SOURCE_REGISTRY[item.agentId];
  seen.add(item.agentId);
  const record=roster.get(item.agentId),docket=requirements.get(item.requirementId);
  if(!record||record.Role!=="Chief"||record.Department!==expected.department||
     item.department!==expected.department||
     item.requirementId!==item.agentId+"-"+expected.requirement||
     docket?.canonicalAgentId!==item.agentId||
     docket?.reviewState!=="PENDING_SOURCE_EVIDENCE"||
     item.pilotId!=="b3-public-"+item.agentId.replace(/^chief-(?:expansion-)?/,"")+"-"+expected.requirement.toLowerCase()+"-20261108")
    throw Error("PILOT_SOURCE_IDENTITY_OR_REQUIREMENT_MISMATCH");
  if(!meaningful(item.publisher)||!meaningful(item.title)||
     !meaningful(item.sourceSection)||!meaningful(item.documentVersion)||
     !meaningful(item.paraphrase)||!meaningful(item.application)||
     !meaningful(item.criticalLimit)||!meaningful(item.nextReviewAction)||
     !asDate(item.observedOn)||item.observedOn!=="2026-11-08"||
     !(item.publicationDate===null||asDate(item.publicationDate))||
     item.publicationDate!==null&&item.publicationDate>item.observedOn)
    throw Error("PILOT_SOURCE_METADATA_INVALID");
  let url;try{url=new URL(item.url)}catch{throw Error("PILOT_SOURCE_URL_INVALID")}
  if(url.protocol!=="https:"||url.host!==expected.host||
     url.pathname!==expected.prefix||url.username||url.password||
     url.search||url.hash)
    throw Error("PILOT_SOURCE_URL_INVALID");
  if(item.inspectionState!=="PUBLIC_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     !["originalSourceTextCopied","independentPublisherAuthentication",
       "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
       "citableByLiveAgents","sharedMemoryPromotionAllowed"].every(k=>denyState(item[k])))
    throw Error("PILOT_MUST_REMAIN_UNAPPROVED");
  report.push({
   agentId:item.agentId,requirementId:item.requirementId,
   sourceUrl:item.url,observedOn:item.observedOn,
   status:"MANIFEST_REPORTED_PUBLIC_PAGE_INSPECTION",
   factualCitationAllowed:false,independentVerificationPassed:false,
   ownerApprovalGranted:false,knowledgePromoted:false,
   reviewNeeded:[
    "Independently re-open exact official URL and check version/section",
    "Assess paraphrase against full source and current context",
    "Verify rights/attribution and claim scope",
    "Obtain authenticated owner approval for exact role and claim before live use"
   ]
  });
 }
 if(seen.size!==5)throw Error("PILOT_INCOMPLETE");
 return {
  schemaVersion:1,stage:"B",phase:3,kind:"B3_PUBLIC_PILOT_VALIDATION_REPORT",
  entries:report,
  summary:{matchedToCanonicalAgentAndRequirement:5,
   manifestReportedPublicInspections:5,independentHumanVerification:0,
   productionDataAccesses:0,realModelEvaluations:0,
   approvedKnowledgeClaims:0,liveAgentCitationPermissions:0}
 };
}
export function previewSourcePilotForAgent(report,agentId){
 if(report?.kind!=="B3_PUBLIC_PILOT_VALIDATION_REPORT"||
    report.entries?.length!==5||!Object.hasOwn(SOURCE_REGISTRY,agentId))
  throw Error("PILOT_REPORT_OR_ID_INVALID");
 const item=report.entries.find(x=>x.agentId===agentId);
 if(!item)throw Error("PILOT_AGENT_UNAVAILABLE");
 return {...item,
  searchAuthorization:"OFFLINE_INSPECTION_REPORT_ONLY_NOT_AUTHENTICATED",
  usableAsVerifiedKnowledge:false
 };
}
