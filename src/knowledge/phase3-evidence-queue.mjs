/**
 * Stage B3 offline evidence review queue and source currentness triage.
 *
 * Every real source remains UNKNOWN / unverified. No fetching, embeddings,
 * external citations, production/project data, approval or network use.
 * The caller-supplied metadata and dates are untrusted; matching shapes and
 * "freshness" heuristics are NEVER evidence of factual truth or owner consent.
 */
import {knowledgeDossier} from "../agents/phase1/knowledge-dossiers.mjs";
import {createPhase3DraftCatalog,searchDraftCatalog} from "./phase3-draft-catalog.mjs";

const DOMAIN_FRESHNESS_DAYS=Object.freeze({
 "Health & Human Support":30,
 "Policy & Diplomacy":30,
 "Commerce & Finance":30,
 "Security & Defense":30,
 "Software & Applications":60,
 "Automation & Reliability":60,
 "Engineering & Systems":60,
 "Business & Enterprise":90,
 "Data & Analytics":90,
 "Accessibility & Wellbeing":90
});
const valid=s=>typeof s==="string"&&s.trim().length>0&&s.length<=1000;
const dateStr=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x+"T00:00:00Z"))&&new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
const sourceAllowed=new Set(["OFFICIAL_DOCUMENTATION","PRIMARY_PUBLICATION","PROFESSIONAL_STANDARD","ACADEMIC_STUDY"]);
const approvedMetaFields=new Set([
 "agentId","requirementId","category","title","publisher","publishedOn",
 "checkedOn","sourceUrl","claim","evidenceRef"
]);
function policyFor(department){
 const threshold=DOMAIN_FRESHNESS_DAYS[department]??365;
 return {suggestedReviewIntervalDays:threshold,policyApproved:false,
  enforcement:"REVIEW_ONLY_NOT_AUTOMATED_EXTERNAL_CHECK"};
}
export function createPhase3EvidenceQueue(drafts){
 if(drafts?.stage!=="B"||drafts.phase!==1||drafts.profiles?.length!==185)
  throw Error("B1_FROZEN_DRAFTS_REQUIRED");
 const catalog=createPhase3DraftCatalog(drafts);
 const reviewItems=[];
 for(const role of drafts.profiles){
  const dossier=knowledgeDossier(role);
  const pack=catalog.rolePacks.find(x=>x.canonicalAgentId===role.canonicalAgentId);
  if(!pack)throw Error("KNOWLEDGE_PACK_MISSING");
  for(const requirement of dossier.proposedKnowledgeRequirements){
   reviewItems.push({
    reviewId:"b3-source-"+requirement.requirementId,
    canonicalAgentId:role.canonicalAgentId,
    department:role.department,
    specialty:role.specialty,
    requirementId:requirement.requirementId,
    requiredClaim:requirement.requirement,
    sourceCandidates:pack.externalCandidates.map(x=>({...x})),
    refresh:policyFor(role.department),
    metadataReceived:false,sourceContentsInspected:false,
    sourceRightsConfirmed:false,claimCitationVerified:false,
    independentReviewerEvidence:null,ownerApprovalEvidence:null,
    sourceVersionHash:null,reviewState:"PENDING_SOURCE_EVIDENCE",
    mayCiteExternalClaim:false,mayIndexForAgents:false,
    productionDataUsed:false,automatedFetchPerformed:false
   });
  }
 }
 if(reviewItems.length!==555||new Set(reviewItems.map(x=>x.reviewId)).size!==555)
  throw Error("555_SOURCE_REVIEWS_REQUIRED");
 return {
  schemaVersion:1,stage:"B",phase:3,kind:"OFFLINE_SOURCE_REVIEW_QUEUE",
  rosterBlobSha:catalog.rosterBlobSha,
  items:reviewItems,
  summary:{agents:185,requirements:555,reviewStatesPending:555,
   actualSourcesInspected:0,verifiedCitations:0,knowledgeLibrariesApproved:0,
   externalFetches:0,productionRecordsUsed:0}
 };
}
/**
 * Pure metadata triage. It cannot issue "verified" or "citation-ready",
 * even when a fabricated date and URL appear plausible.
 */
export function previewSourceMetadata(reviewItem,input,asOf){
 const deny=(reason)=>({
  acceptedAsReviewCandidate:false,reason,realSourceVerified:false,
  citationAllowed:false,knowledgeApproved:false,noExternalFetch:true
 });
 if(!reviewItem||reviewItem.reviewState!=="PENDING_SOURCE_EVIDENCE"||
    reviewItem.claimCitationVerified!==false||reviewItem.mayCiteExternalClaim!==false)
  return deny("INVALID_SOURCE_REVIEW_ITEM");
 if(!input||typeof input!=="object"||Array.isArray(input)||
    Object.keys(input).some(x=>!approvedMetaFields.has(x))||
    input.agentId!==reviewItem.canonicalAgentId||
    input.requirementId!==reviewItem.requirementId||
    !sourceAllowed.has(input.category)||
    !valid(input.title)||!valid(input.publisher)||!valid(input.claim)||
    !dateStr(input.publishedOn)||!dateStr(input.checkedOn)||!dateStr(asOf))
  return deny("INVALID_OR_UNTRUSTED_METADATA");
 if(input.evidenceRef!==null&&input.evidenceRef!==undefined)
  return deny("UNVERIFIED_EVIDENCE_REF_FORBIDDEN");
 if(typeof input.sourceUrl!=="string"||input.sourceUrl.length>2000)
  return deny("INVALID_PUBLIC_SOURCE_URL");
 let u;
 try{u=new URL(input.sourceUrl);}catch{return deny("INVALID_PUBLIC_SOURCE_URL")}
 const host=u.hostname.toLowerCase();
 if(u.protocol!=="https:"||u.username||u.password||u.port||
    !host||host==="localhost"||host.endsWith(".local")||
    host.endsWith(".internal")||host.endsWith(".localhost")||
    /^(?:10|127|0|192\.168)\./.test(host)||
    /^172\.(?:1[6-9]|2\d|3[01])\./.test(host)||
    /^169\.254\./.test(host)||/^\d+\.\d+\.\d+\.\d+$/.test(host)||
    host.includes(":")||host.startsWith("["))
  return deny("UNSUITABLE_OR_INTERNAL_SOURCE_URL");
 const checked=Date.parse(input.checkedOn+"T00:00:00Z");
 const published=Date.parse(input.publishedOn+"T00:00:00Z");
 const now=Date.parse(asOf+"T00:00:00Z");
 if(published>checked||checked>now)
  return deny("IMPOSSIBLE_PUBLICATION_OR_REVIEW_CHRONOLOGY");
 const ageDays=Math.floor((now-checked)/86400000);
 const suggestedDays=reviewItem.refresh.suggestedReviewIntervalDays;
 return {
  acceptedAsReviewCandidate:true,reason:"METADATA_ONLY_UNVERIFIED",
  freshnessSuggestion:ageDays>suggestedDays?"NEEDS_FRESHNESS_REVIEW":"RECENT_METADATA_UNCONFIRMED",
  metadataAgeDays:ageDays,proposedReviewIntervalDays:suggestedDays,
  sourceContentChecked:false,publicationDateConfirmed:false,
  claimSupportIndependentlyReviewed:false,licenseOrRightsConfirmed:false,
  realSourceVerified:false,citationAllowed:false,
  knowledgeApproved:false,noExternalFetch:true
 };
}
/**
 * All 185 exact role IDs get an offline retrieval/grounding smoke test.
 * Local methodology text is NEVER converted to an external citation.
 */
export function runPhase3OfflineRetrievalChecks(drafts){
 const catalog=createPhase3DraftCatalog(drafts);
 const checks=catalog.rolePacks.map(pack=>{
  const result=searchDraftCatalog(catalog,{
   actorId:pack.canonicalAgentId,query:"Clarify",limit:12
  });
  const allowed=new Set([pack.canonicalAgentId,pack.chiefId].filter(Boolean));
  const scoped=result.hits.every(hit=>
   hit.department===pack.department&&allowed.has(hit.agentId)&&
   hit.isProfessionalCitation===false&&
   hit.trustworthyExternalEvidence===false);
  return {
   agentId:pack.canonicalAgentId,role:pack.role,department:pack.department,
   smokeQuery:"Clarify",retrievedDraftHits:result.hits.length,
   scopedToOwnRoleAndDepartmentGuide:scoped,
   citationsClaimed:0,verifiedRealSourcesUsed:0,
   actualModelRun:false,realRuntimePermissionChecked:false,
   assessment:"OFFLINE_DRAFT_LOOKUP_ONLY"
  };
 });
 if(checks.length!==185||checks.some(x=>!x.scopedToOwnRoleAndDepartmentGuide))
  throw Error("B3_OFFLINE_RETRIEVAL_BOUNDARY_FAILURE");
 return {
  mode:"B3_OFFLINE_RETRIEVAL_SMOKE_TEST_NOT_REAL_MODEL_QA",
  checks,
  summary:{agents:185,checks:185,verifiedSourceCitations:0,
   actualModelTests:0,operationallyCertifiedAgents:0}
 };
}
