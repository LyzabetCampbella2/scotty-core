/**
 * Source-quality intake planner, offline and zero-cost.
 * Metadata is not proof of a verified source. No URL fetching or production
 * data access is implemented; the reviewer must check independently.
 */
const CATEGORIES=new Set(["PRIMARY_PUBLICATION","PROFESSIONAL_STANDARD","OFFICIAL_DOCUMENTATION","ACADEMIC_STUDY","AUTHORIZED_OWNER_RECORD"]);
const PUBLIC_CATEGORIES=new Set(["PRIMARY_PUBLICATION","PROFESSIONAL_STANDARD","OFFICIAL_DOCUMENTATION","ACADEMIC_STUDY"]);
const canonical=x=>typeof x==="string"&&x.trim().length>0&&x.length<=1200;
function safePublicUrl(uri){
 try{
  const url=new URL(uri);
  if(url.protocol!=="https:"||!url.hostname||url.username||url.password||url.port)return false;
  const h=url.hostname.toLowerCase();
  if(h==="localhost"||h==="127.0.0.1"||h==="::1"||h==="0.0.0.0"||
    h.endsWith(".local")||h.endsWith(".internal")||h.endsWith(".localhost")||
    /^10\./.test(h)||/^192\.168\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h)||
    /^169\.254\./.test(h)||/^127\./.test(h)||h.startsWith("["))return false;
  return true;
 }catch{return false;}
}
const REVIEW_FIELDS=new Set(["agentId","requirementId","sourceCategory","title","publisher","publishedOn","sourceUrl","claimToVerify","ownerConsentRef"]);
export function prepareSourceReview(dossier,entry){
 if(!dossier||dossier.status!=="KNOWLEDGE_REQUIREMENTS_DRAFT_NOT_VERIFIED"||
    dossier.sourceAccess!=="NONE"||dossier.factualKnowledgeCertified!==false||
    !Array.isArray(dossier.proposedKnowledgeRequirements)||dossier.proposedKnowledgeRequirements.length!==3||
    !entry||typeof entry!=="object"||Object.keys(entry).some(x=>!REVIEW_FIELDS.has(x))||
    entry.agentId!==dossier.canonicalAgentId||
    !dossier.proposedKnowledgeRequirements.some(x=>x.requirementId===entry.requirementId)||
    !CATEGORIES.has(entry.sourceCategory)||
    !canonical(entry.title)||!canonical(entry.publisher)||!canonical(entry.claimToVerify)||
    !/^\d{4}-\d{2}-\d{2}$/.test(entry.publishedOn)||Number.isNaN(Date.parse(entry.publishedOn+"T00:00:00Z")))
    throw Error("INVALID_SOURCE_REVIEW_METADATA");
 const ownerRecord=entry.sourceCategory==="AUTHORIZED_OWNER_RECORD";
 if(ownerRecord&&(!canonical(entry.ownerConsentRef)||entry.sourceUrl))
   throw Error("OWNER_RECORD_CONSENT_REQUIRED_NO_URL_ACCESS");
 if(!ownerRecord&&(entry.ownerConsentRef||!safePublicUrl(entry.sourceUrl)))
   throw Error("PUBLIC_SOURCE_METADATA_MUST_USE_SAFE_HTTPS");
 return {
  agentId:entry.agentId,requirementId:entry.requirementId,
  submittedMetadata:{...entry,sourceUrl:ownerRecord?null:entry.sourceUrl},
  stage:"PENDING_INDEPENDENT_SOURCE_CHECK",
  externalFetchPerformed:false,
  productionDataAccessed:false,
  credentialAccessed:false,
  citationValidated:false,
  sourceContentRead:false,
  factCheckComplete:false,
  licenseChecked:false,
  publicationDateConfirmed:false,
  reviewerIdentityVerified:false,
  claimSupported:null,
  evidenceRef:null,
  approvedForKnowledgeBase:false,
  allowedToPromoteToSharedMemory:false
 };
}
export function sourceReviewReadiness(record){
 if(!record||record.stage!=="PENDING_INDEPENDENT_SOURCE_CHECK"||
    record.externalFetchPerformed!==false||
    record.citationValidated!==false||
    record.factCheckComplete!==false||
    record.approvedForKnowledgeBase!==false||
    record.allowedToPromoteToSharedMemory!==false)return {ready:false,reason:"invalid-or-untrusted-metadata"};
 return {
   ready:false,reason:"source-metadata-collected-not-verified",
   needs:["Source content and date independently verified","Claim supported with an exact quote or citation",
     "Publisher authority and currentness checked","License/consent reviewed",
     "Separate authenticated owner authorization for restricted records"]
 };
}
