/**
 * Stage B3 official-public-page chief pilot completion (15 additional chiefs).
 * Validates ONLY a locked set of assistant-authored source-inspection notes.
 * It does not fetch pages, verify facts independently, accept owner consent,
 * promote knowledge or check live agent authorization.
 */
import {buildPhase3SourceCoverage} from "./phase3-coverage-plan.mjs";

const REGISTRY=Object.freeze({
 "chief-expansion-archer":["Education & Learning","ies.ed.gov","/ncee/wwc/PracticeGuide/1"],
 "chief-expansion-crusher":["Life Sciences","www.grants.nih.gov","/policy-and-compliance/policy-topics/reproducibility"],
 "chief-expansion-dax":["History & Culture","www.archives.gov","/education/lessons/worksheets"],
 "chief-expansion-hologram":["Design & Media","www.w3.org","/WAI/tutorials/images/"],
 "chief-expansion-neelix":["Home & Logistics","www.cdc.gov","/disability-emergency-preparedness/people-with-disabilities/make-a-plan.html"],
 "chief-expansion-obrien":["Automation & Reliability","sre.google","/sre-book/monitoring-distributed-systems/"],
 "chief-expansion-pike":["Projects & Delivery","www.pmi.org","/about/what-is-project-management"],
 "chief-expansion-sisko":["Business & Enterprise","www.sba.gov","/counseling/manage-your-business/"],
 "chief-expansion-tuvok":["Quality & Verification","www.nist.gov","/publications/assessing-security-and-privacy-controls-information-systems-and-organizations"],
 "chief-keiko":["Science & Environment","www.epa.gov","/quality/epa-quality-management-tools-projects"],
 "chief-kirk":["Command & Missions","www.usfa.fema.gov","/a-z/nims/command-and-coordination.html"],
 "chief-picard":["Policy & Diplomacy","legal.un.org","/repertory/art2.shtml/art2_7.shtml"],
 "chief-riker":["Operations & Coordination","playbook.usds.gov","/"],
 "chief-spock":["Strategy & Reasoning","airc.nist.gov","/airmf-resources/playbook/manage/"],
 "chief-uhura":["Communications & Languages","digital.gov","/guides/plain-language/principles"]
});
const TOP_KEYS=new Set([
 "schemaVersion","stage","phase","kind","scope","observedOn","evidenceMethod",
 "independentHumanReview","ownerApproval","citationPromotionAllowed",
 "productionDataUsed","externalAccountConnected","modelExecutions","items","summary"
]);
const ITEM_KEYS=new Set([
 "pilotId","agentId","department","requirementId","publisher","title","url",
 "sourceSection","documentVersion","publicationDate","observedOn",
 "paraphrase","application","criticalLimit","inspectionState",
 "originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed","nextReviewAction"
]);
const SUMMARY_KEYS=new Set([
 "additionalAssistantInspectedPublicPages","additionalChiefIdsCovered",
 "docketCandidatesAdded","independentHumanVerification","approvedClaims",
 "liveAgentCitations","productionDataReads"
]);
const STATUS_FALSE=[
 "originalSourceTextCopied","independentPublisherAuthentication","independentlyVerifiedClaim",
 "licensingReviewed","ownerApproved","citableByLiveAgents","sharedMemoryPromotionAllowed"
];
const keys=(x,allowed)=>!!x&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).every(k=>allowed.has(k));
const validText=(x,min=5)=>typeof x==="string"&&x.trim().length>=min&&x.length<=1000;
const isoDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+"T00:00:00Z"))&&
 new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
function officialUrl(input,expectedHost,expectedPath){
 let u;
 try{u=new URL(input);}catch{throw Error("CHIEF25_SOURCE_URL_MISMATCH")}
 if(u.protocol!=="https:"||u.hostname!==expectedHost||u.port||
    u.pathname!==expectedPath||u.search||u.hash||u.username||u.password)
  throw Error("CHIEF25_SOURCE_URL_MISMATCH");
}
export function validateCompleteChiefPublicReview(finalBatch,frozen,queue,original,expansion){
 const ten=buildPhase3SourceCoverage(frozen,queue,original,expansion);
 if(!keys(finalBatch,TOP_KEYS)||finalBatch.schemaVersion!==1||
    finalBatch.stage!=="B"||finalBatch.phase!==3||
    finalBatch.kind!=="ASSISTANT_INSPECTED_FINAL_FIFTEEN_CHIEFS_PUBLIC_SOURCES"||
    finalBatch.observedOn!=="2026-11-08"||
    !validText(finalBatch.evidenceMethod,24)||
    finalBatch.independentHumanReview!=="NOT_DONE"||
    finalBatch.ownerApproval!=="NOT_GRANTED"||
    finalBatch.citationPromotionAllowed!==false||
    finalBatch.productionDataUsed!==false||
    finalBatch.externalAccountConnected!==false||
    finalBatch.modelExecutions!==0||
    !Array.isArray(finalBatch.items)||finalBatch.items.length!==15||
    !keys(finalBatch.summary,SUMMARY_KEYS)||
    finalBatch.summary.additionalAssistantInspectedPublicPages!==15||
    finalBatch.summary.additionalChiefIdsCovered!==15||
    finalBatch.summary.docketCandidatesAdded!==15||
    finalBatch.summary.independentHumanVerification!==0||
    finalBatch.summary.approvedClaims!==0||
    finalBatch.summary.liveAgentCitations!==0||
    finalBatch.summary.productionDataReads!==0)
  throw Error("CHIEF25_MANIFEST_MUST_BE_UNAPPROVED_AND_COMPLETE");
 const byId=new Map(frozen.records.map(row=>[row["Agent ID"],row]));
 const dockets=new Map(queue.items.map(x=>[x.requirementId,x]));
 const oldIds=new Set(ten.rolePlans.filter(x=>x.assistantInspectedPublicCandidates===1).map(x=>x.agentId));
 if(oldIds.size!==10||byId.size!==185||dockets.size!==555)
  throw Error("CHIEF25_FROZEN_INVENTORY_REQUIRED");
 const seen=new Set(),entries=[];
 for(const item of finalBatch.items){
  if(!keys(item,ITEM_KEYS)||!Object.hasOwn(REGISTRY,item.agentId)||
     seen.has(item.agentId)||oldIds.has(item.agentId))
   throw Error("CHIEF25_DUPLICATE_UNKNOWN_OR_PREVIOUS_CHIEF");
  seen.add(item.agentId);
  const [department,host,path]=REGISTRY[item.agentId];
  const canonical=byId.get(item.agentId);
  const docket=dockets.get(item.requirementId);
  if(!canonical||canonical.Role!=="Chief"||canonical.Department!==department||
     item.department!==department||
     item.requirementId!==item.agentId+"-K1"||
     item.pilotId!=="b3-final-chief-"+item.agentId+"-k1-20261108"||
     docket?.canonicalAgentId!==item.agentId||
     docket?.reviewState!=="PENDING_SOURCE_EVIDENCE")
   throw Error("CHIEF25_FROZEN_ID_OR_DOCKET_MISMATCH");
  if(!["publisher","title","sourceSection","documentVersion","paraphrase",
        "application","criticalLimit","nextReviewAction"].every(x=>validText(item[x]))||
     item.observedOn!=="2026-11-08"||
     !(item.publicationDate===null||isoDate(item.publicationDate))||
     (item.publicationDate!==null&&item.publicationDate>item.observedOn))
   throw Error("CHIEF25_INVALID_SOURCE_METADATA");
  officialUrl(item.url,host,path);
  if(item.inspectionState!=="PUBLIC_OFFICIAL_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     STATUS_FALSE.some(k=>item[k]!==false))
   throw Error("CHIEF25_UNAPPROVED_STATE_VIOLATION");
  entries.push({
   agentId:item.agentId,department,requirementId:item.requirementId,
   sourceUrl:item.url,observedOn:item.observedOn,
   inspectionReportType:"ASSISTANT_PUBLIC_WEB_INSPECTION_NOT_INDEPENDENT_HUMAN_AUDIT",
   reviewerNeeds:["Confirm official page remains current","Check exact claim and full context",
    "Check source rights and domain relevance","Authenticate owner approval before any live use"],
   independentlyVerified:false,ownerApproved:false,liveCitationAllowed:false,
   realSourceContentImported:false
  });
 }
 if(seen.size!==15||ten.nextChiefs.length!==15||
    ten.nextChiefs.some(x=>!seen.has(x.agentId)))
  throw Error("CHIEF25_INCOMPLETE_FIFTEEN_SET");
 const allIds=new Set([...oldIds,...seen]);
 if(allIds.size!==25)throw Error("CHIEF25_DUPLICATE_COVERAGE");
 const rolePlans=ten.rolePlans.map(p=>{
  const candidateCount=p.assistantInspectedPublicCandidates+(seen.has(p.agentId)?1:0);
  if(candidateCount>1)throw Error("CHIEF25_DUPLICATE_INSPECTION");
  return {...p,assistantInspectedPublicCandidates:candidateCount,
   reviewState:candidateCount?"PUBLIC_MANIFEST_CANDIDATE_UNAPPROVED":"NO_INSPECTED_PUBLIC_SOURCE_YET"};
 });
 const chiefs=rolePlans.filter(x=>x.role==="Chief");
 const specialists=rolePlans.filter(x=>x.role==="Specialist");
 if(chiefs.length!==25||specialists.length!==160||
    chiefs.some(x=>x.assistantInspectedPublicCandidates!==1)||
    specialists.some(x=>x.assistantInspectedPublicCandidates!==0))
  throw Error("CHIEF25_SOURCE_DISTRIBUTION_INVALID");
 return {
  schemaVersion:1,stage:"B",phase:3,kind:"UNAPPROVED_ALL_25_CHIEF_PUBLIC_SOURCE_REVIEW",
  priorChiefs:10,newChiefs:15,newEntries:entries,
  rolePlans,
  summary:{
   canonicalAgents:185,chiefs:25,specialists:160,
   sourceDockets:555,assistantInspectedChiefCandidates:25,
   chiefsWithoutAssistantInspectedCandidate:0,
   specialistsWithoutAssistantInspectedCandidate:160,
   uninspectedSourceDockets:530,independentReviewsStillPending:555,
   independentlyVerifiedClaims:0,ownerApprovedSourceClaims:0,
   citableLiveKnowledgeClaims:0,liveAgentActivations:0
  }
 };
}
