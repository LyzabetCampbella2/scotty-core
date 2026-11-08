/**
 * SCOTTY B3 pilot: first eight specialist-specific public references.
 * Metadata validator only: does NOT fetch source pages, verify claims,
 * approve knowledge, enable live citations or grant healthcare permissions.
 */
import {buildSpecialistSourceResearchQueue} from "./phase3-specialist-research-backlog.mjs";

const REFS=Object.freeze({
 "agent-bones-01":["Health literacy","www.cdc.gov","/health-literacy/php/about/index.html"],
 "agent-bones-02":["Clinical evidence appraisal","www.cochrane.org","/authors/handbooks-and-manuals/handbook/current/chapter-08"],
 "agent-bones-03":["Appointments and questions","www.ahrq.gov","/questions/index.html"],
 "agent-bones-04":["Medication literacy","www.fda.gov","/patients/learn-about-your-medicines"],
 "agent-bones-05":["Care coordination","www.ahrq.gov","/topics/care-coordination.html"],
 "agent-bones-06":["Mental health resources","www.nimh.nih.gov","/health/find-help"],
 "agent-bones-07":["Nutrition literacy","odphp.health.gov","/our-work/nutrition-physical-activity/dietary-guidelines/current-dietary-guidelines"],
 "agent-bones-08":["Accessibility support","www.ada.gov","/topics/effective-communication/"]
});
const TOP_KEYS=new Set(["schemaVersion","stage","phase","kind","scope","observedOn",
 "evidenceMethod","independentHumanReview","ownerApproval","citationPromotionAllowed",
 "productionDataUsed","externalAccountConnected","modelExecutions","items","summary"]);
const ENTRY_KEYS=new Set(["pilotId","agentId","displayName","department","chiefId",
 "specialty","requirementId","publisher","title","url","sourceSection",
 "documentVersion","publicationDate","observedOn","paraphrase","application",
 "criticalLimit","inspectionState","originalSourceTextCopied",
 "independentPublisherAuthentication","independentlyVerifiedClaim",
 "licensingReviewed","ownerApproved","citableByLiveAgents",
 "sharedMemoryPromotionAllowed","nextReviewAction"]);
const SUMMARY_KEYS=new Set(["assistantInspectedPages","specialistsWithInitialPublicCandidate",
 "sourceDocketsAssociated","independentReviewCompletions","approvedKnowledgePacks",
 "liveAgentCitationPermissions","productionDataAccesses"]);
const MUST_BE_FALSE=["originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed"];
const exactKeys=(obj,keys)=>!!obj&&typeof obj==="object"&&!Array.isArray(obj)&&
 Object.keys(obj).length===keys.size&&Object.keys(obj).every(k=>keys.has(k));
const text=s=>typeof s==="string"&&s.trim().length>=4&&s.length<=1000;
const date=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+"T00:00:00Z"))&&
 new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
export function validateEightSpecialistSourcePilot(manifest,frozen,queue,first,second,third){
 const backlog=buildSpecialistSourceResearchQueue(frozen,queue,first,second,third);
 if(!exactKeys(manifest,TOP_KEYS)||manifest.schemaVersion!==1||
    manifest.stage!=="B"||manifest.phase!==3||
    manifest.kind!=="ASSISTANT_INSPECTED_EIGHT_SPECIALIST_PUBLIC_PILOT"||
    manifest.scope!=="EIGHT_HEALTH_HUMAN_SUPPORT_SPECIALIST_K1_SOURCE_REVIEW_CANDIDATES"||
    manifest.observedOn!=="2026-11-08"||!text(manifest.evidenceMethod)||
    manifest.independentHumanReview!=="NOT_DONE"||
    manifest.ownerApproval!=="NOT_GRANTED"||
    manifest.citationPromotionAllowed!==false||
    manifest.productionDataUsed!==false||
    manifest.externalAccountConnected!==false||
    manifest.modelExecutions!==0||
    manifest.items?.length!==8||
    !exactKeys(manifest.summary,SUMMARY_KEYS)||
    manifest.summary.assistantInspectedPages!==8||
    manifest.summary.specialistsWithInitialPublicCandidate!==8||
    manifest.summary.sourceDocketsAssociated!==8||
    manifest.summary.independentReviewCompletions!==0||
    manifest.summary.approvedKnowledgePacks!==0||
    manifest.summary.liveAgentCitationPermissions!==0||
    manifest.summary.productionDataAccesses!==0)
  throw Error("B3_SPECIALIST_PILOT_UNAPPROVED_MANIFEST_REQUIRED");
 const roster=new Map(frozen.records.map(x=>[x["Agent ID"],x]));
 const dockets=new Map(queue.items.map(x=>[x.requirementId,x]));
 const byId=new Map(backlog.rolePlans.map(x=>[x.agentId,x]));
 const seen=new Set(),items=[];
 for(const item of manifest.items){
  if(!exactKeys(item,ENTRY_KEYS)||!Object.hasOwn(REFS,item.agentId)||
     seen.has(item.agentId))throw Error("B3_SPECIALIST_PILOT_UNKNOWN_OR_DUPLICATE");
  seen.add(item.agentId);
  const [specialty,host,path]=REFS[item.agentId];
  const row=roster.get(item.agentId),docket=dockets.get(item.requirementId);
  const plan=byId.get(item.agentId);
  if(!row||row.Role!=="Specialist"||row.Name!==item.displayName||
     row.Specialty!==item.specialty||row.Specialty!==specialty||
     row.Department!=="Health & Human Support"||
     item.department!==row.Department||
     row["Chief ID"]!=="chief-bones"||item.chiefId!==row["Chief ID"]||
     item.requirementId!==item.agentId+"-K1"||
     item.pilotId!=="b3-specialist-"+item.agentId+"-k1-20261108"||
     docket?.canonicalAgentId!==item.agentId||
     docket?.reviewState!=="PENDING_SOURCE_EVIDENCE"||
     !plan?.researchTasks.some(x=>x.requirementId===item.requirementId&&
        x.sourceContentInspected===false&&x.ownerApproved===false))
   throw Error("B3_SPECIALIST_PILOT_FROZEN_ROLE_OR_DOCKET_MISMATCH");
  if(!["publisher","title","sourceSection","documentVersion","paraphrase",
       "application","criticalLimit","nextReviewAction"].every(k=>text(item[k]))||
     item.observedOn!=="2026-11-08"||
     !(item.publicationDate===null||date(item.publicationDate))||
     item.publicationDate!==null&&item.publicationDate>item.observedOn)
   throw Error("B3_SPECIALIST_PILOT_BAD_METADATA");
  let url;try{url=new URL(item.url)}catch{throw Error("B3_SPECIALIST_PILOT_WRONG_PUBLIC_URL")}
  if(url.protocol!=="https:"||url.hostname!==host||url.port||
     url.pathname!==path||url.search||url.hash||url.username||url.password)
   throw Error("B3_SPECIALIST_PILOT_WRONG_PUBLIC_URL");
  if(item.inspectionState!=="PUBLIC_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     MUST_BE_FALSE.some(k=>item[k]!==false))
   throw Error("B3_SPECIALIST_PILOT_CANNOT_SELF_APPROVE");
  items.push({
   agentId:item.agentId,specialty,chiefId:item.chiefId,
   requirementId:item.requirementId,officialReference:item.url,
   status:"ASSISTANT_REPORTED_PUBLIC_SOURCE_INSPECTION_UNAPPROVED",
   independentSourceReviewComplete:false,
   ownerApprovalGranted:false,liveCitationAllowed:false,
   restrictedHealthRecordAccess:false,
   nextAction:"Independent claim, date and rights review before authenticated owner approval"
  });
 }
 if(seen.size!==8)throw Error("B3_SPECIALIST_PILOT_INCOMPLETE");
 return {
  schemaVersion:1,stage:"B",phase:3,kind:"B3_EIGHT_SPECIALISTS_UNAPPROVED_REVIEW_REPORT",
  items,
  summary:{frozenChiefsWithOnePublicCandidate:25,
    specialistsWithInspectedPublicCandidate:8,
    specialistsWithoutInspectedPublicCandidate:152,
    totalFrozenAgents:185,totalReviewDockets:555,
    assistantInspectedDocketCandidates:33,
    docketsWithoutInspectedCandidate:522,
    docketsAwaitingIndependentAcceptance:555,
    approvedKnowledgeLibraries:0,liveAgentCitations:0,
    actualModelEvaluations:0,realProductionDataAccesses:0,
    activatedAgents:0}
 };
}
