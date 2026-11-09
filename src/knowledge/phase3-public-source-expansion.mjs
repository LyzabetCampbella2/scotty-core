/**
 * B3 second public-source pilot. No network, no owner authentication,
 * no semantic fact checking; verifies a fixed roster-to-reference mapping
 * and prepares a 10-chief unapproved combined review report.
 */
import {validatePublicSourcePilot} from "./phase3-public-source-pilot.mjs";

const EXPANSION_REGISTRY=Object.freeze({
 "chief-data":{department:"Research & Intelligence",requirement:"K1",host:"pubmed.ncbi.nlm.nih.gov",path:"/help/"},
 "chief-expansion-janeway":{department:"Exploration & Discovery",requirement:"K1",host:"science.nasa.gov",path:"/exoplanets/whats-a-transit/"},
 "chief-expansion-seven":{department:"Data & Analytics",requirement:"K1",host:"www.nist.gov",path:"/pml/nist-technical-note-1297"},
 "chief-quark":{department:"Commerce & Finance",requirement:"K1",host:"www.sba.gov",path:"/counseling/plan-your-business/"},
 "chief-zora":{department:"Creative & Knowledge",requirement:"K1",host:"copyright.gov",path:"/help/faq/faq-protect.html"}
});
const ITEM_KEYS=new Set([
 "pilotId","agentId","department","requirementId","publisher","title","url",
 "sourceSection","documentVersion","publicationDate","observedOn",
 "paraphrase","application","criticalLimit","inspectionState",
 "originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed","nextReviewAction"
]);
const MANIFEST_KEYS=new Set([
 "schemaVersion","stage","phase","kind","scope","observedOn","evidenceMethod",
 "independentHumanReview","ownerApproval","citationPromotionAllowed",
 "productionDataUsed","externalAccountConnected","modelExecutions","items","summary"
]);
const SUMMARY_KEYS=new Set([
 "publicPagesInspected","agentIDsCovered","sourceDocketsAssociated",
 "independentReviewCompletions","approvedKnowledgePacks","productionDataAccesses"
]);
const requiredFalse=[
 "originalSourceTextCopied","independentPublisherAuthentication","independentlyVerifiedClaim",
 "licensingReviewed","ownerApproved","citableByLiveAgents","sharedMemoryPromotionAllowed"
];
const validText=x=>typeof x==="string"&&x.trim().length>=5&&x.length<=950;
const strictKeys=(x,keys)=>x&&typeof x==="object"&&!Array.isArray(x)&&
 Object.keys(x).every(k=>keys.has(k));
const date=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
function ensureURL(url,known){
 let u;
 try{u=new URL(url);}catch{throw Error("B3_EXPANSION_URL_NOT_OFFICIAL")}
 if(u.protocol!=="https:"||u.host!==known.host||u.pathname!==known.path||
    u.hash||u.search||u.username||u.password)
  throw Error("B3_EXPANSION_URL_NOT_OFFICIAL");
}
export function validatePublicSourceExpansion(expansion,original,queue,frozen){
 const first=validatePublicSourcePilot(original,queue,frozen);
 if(!strictKeys(expansion,MANIFEST_KEYS)||
    expansion.kind!=="ASSISTANT_INSPECTED_PUBLIC_SOURCE_EXPANSION"||
    expansion.schemaVersion!==1||expansion.stage!=="B"||expansion.phase!==3||
    expansion.ownerApproval!=="NOT_GRANTED"||
    expansion.independentHumanReview!=="NOT_DONE"||
    expansion.citationPromotionAllowed!==false||
    expansion.productionDataUsed!==false||
    expansion.externalAccountConnected!==false||
    expansion.modelExecutions!==0||
    expansion.observedOn!=="2026-11-08"||
    !validText(expansion.evidenceMethod)||
    expansion.items?.length!==5||
    !strictKeys(expansion.summary,SUMMARY_KEYS)||
    expansion.summary.publicPagesInspected!==5||
    expansion.summary.agentIDsCovered!==5||
    expansion.summary.sourceDocketsAssociated!==5||
    expansion.summary.independentReviewCompletions!==0||
    expansion.summary.approvedKnowledgePacks!==0||
    expansion.summary.productionDataAccesses!==0)
  throw Error("B3_EXPANSION_PENDING_MANIFEST_REQUIRED");
 const byId=new Map(frozen.records.map(r=>[r["Agent ID"],r]));
 const dockets=new Map(queue.items.map(d=>[d.requirementId,d]));
 if(byId.size!==185||dockets.size!==555)throw Error("B3_FROZEN_IDENTITY_AND_REVIEW_QUEUE_REQUIRED");
 const oldIds=new Set(first.entries.map(x=>x.agentId));
 const seen=new Set(),entries=[];
 for(const item of expansion.items){
  if(!strictKeys(item,ITEM_KEYS)||!Object.hasOwn(EXPANSION_REGISTRY,item.agentId)||
    seen.has(item.agentId)||oldIds.has(item.agentId))
   throw Error("B3_EXPANSION_DUPLICATE_OR_UNKNOWN_ID");
  seen.add(item.agentId);
  const ref=EXPANSION_REGISTRY[item.agentId];
  const canonical=byId.get(item.agentId);
  const docket=dockets.get(item.requirementId);
  if(!canonical||canonical.Role!=="Chief"||
     canonical.Department!==ref.department||
     item.department!==ref.department||
     item.requirementId!==item.agentId+"-"+ref.requirement||
     docket?.canonicalAgentId!==item.agentId||
     docket?.reviewState!=="PENDING_SOURCE_EVIDENCE"||
     item.pilotId!=="b3-public-"+item.agentId.replace(/^chief-(?:expansion-)?/,"")+"-"+ref.requirement.toLowerCase()+"-20261108")
   throw Error("B3_EXPANSION_WRONG_CHIEF_OR_REQUIREMENT");
  if(!validText(item.publisher)||!validText(item.title)||
     !validText(item.sourceSection)||!validText(item.documentVersion)||
     !validText(item.paraphrase)||!validText(item.application)||
     !validText(item.criticalLimit)||!validText(item.nextReviewAction)||
     item.observedOn!=="2026-11-08"||
     !(item.publicationDate===null||date(item.publicationDate))||
     item.publicationDate!==null&&item.publicationDate>item.observedOn)
   throw Error("B3_EXPANSION_BAD_SOURCE_METADATA");
  ensureURL(item.url,ref);
  if(item.inspectionState!=="PUBLIC_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     requiredFalse.some(k=>item[k]!==false))
   throw Error("B3_EXPANSION_FORGED_VERIFICATION_OR_OWNER_APPROVAL");
  entries.push({
   agentId:item.agentId,requirementId:item.requirementId,department:item.department,
   sourceUrl:item.url,sourceSection:item.sourceSection,
   claimedInspectionDate:item.observedOn,
   inspectionEvidence:"ASSISTANT_REPORT_NOT_INDEPENDENT_PROOF",
   independentlyVerified:false,approvedForCitation:false,
   ownerApproved:false,knowledgeImported:false,
   pendingAction:"Independent current-source review and authenticated owner approval"
  });
 }
 if(seen.size!==5)throw Error("B3_EXPANSION_FIVE_IDS_REQUIRED");
 const combined=[...first.entries.map(x=>({
   agentId:x.agentId,requirementId:x.requirementId,sourceUrl:x.sourceUrl,
   approvedForCitation:false,ownerApproved:false,independentlyVerified:false
 })),...entries];
 if(combined.length!==10||new Set(combined.map(x=>x.agentId)).size!==10||
    new Set(combined.map(x=>x.requirementId)).size!==10)
  throw Error("B3_TEN_CHIEF_PILOT_INCOMPLETE");
 return {
  stage:"B",phase:3,kind:"B3_TEN_CHIEF_PUBLIC_REFERENCE_REVIEW",
  originals:5,additional:5,entries:combined,
  summary:{assistantReportedOfficialPagesInspected:10,
   frozenChiefsLinked:10,pendingDocketsAssociated:10,
   independentHumanVerified:0,ownerApproved:0,
   factualCitationsAuthorized:0,productionDataReads:0,
   modelEvaluations:0,activatedAgents:0}
 };
}
