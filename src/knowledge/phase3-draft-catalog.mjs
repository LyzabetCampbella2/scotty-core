/**
 * Stage B3 offline, source-attributed internal knowledge CANDIDATES.
 * 185 role packs + 25 department guides from already-authored development
 * methods. These are neither externally verified facts nor owner-approved
 * knowledge libraries. Absolutely NO browsing, private files, DB or tools.
 */
import {knowledgeDossier} from "../agents/phase1/knowledge-dossiers.mjs";

const METHOD_SOURCE=Object.freeze({
  chiefs:{file:"src/agents/phase1/department-methods.mjs",originalGitBlobSha:"1df7063babd4db8a4e07af1d5259185299979f5f"},
  specialists:{file:"src/agents/phase1/specialist-playbooks.mjs",originalGitBlobSha:"9d26a5f4d086ee3103d9ee29b98eb2d35f265f4c"}
});
const valid=x=>typeof x==="string"&&x.trim().length>0&&x.length<=2048;
function section(id,kind,content,source){
 if(!valid(content))throw Error("KNOWLEDGE_CANDIDATE_TEXT_REQUIRED");
 return {
  sectionId:id+"-"+kind,
  kind,content,
  sourceRef:{...source,classification:"INTERNAL_DEVELOPMENT_DRAFT"},
  originalSourceReadForThisExport:false,
  externallyVerified:false,
  ownerApproved:false,
  mayCiteAsProfessionalFact:false
 };
}
function rolePack(profile){
 const id=profile.canonicalAgentId;
 const reasoning=profile.distinctiveReasoning;
 if(!valid(id)||!valid(profile.department)||!valid(profile.specialty)||
    !Array.isArray(reasoning?.initialSequence)||reasoning.initialSequence.length<4||
    !Array.isArray(reasoning.failureModes)||reasoning.failureModes.length<1||
    !valid(reasoning.workedSyntheticExample))throw Error("INCOMPLETE_ROLE_METHOD");
 const source=METHOD_SOURCE[profile.role==="Chief"?"chiefs":"specialists"];
 const dossier=knowledgeDossier(profile);
 const sections=[
  section(id,"method",reasoning.initialSequence.join(" | "),source),
  section(id,"synthetic-example",reasoning.workedSyntheticExample,source),
  section(id,"limitations",reasoning.failureModes.join(" | "),source),
  section(id,"evidence-needs",dossier.proposedKnowledgeRequirements.map(k=>k.requirement).join(" | "),source)
 ];
 return {
  packId:"b3-role-"+id,canonicalAgentId:id,
  role:profile.role,chiefId:profile.chiefId,
  department:profile.department,specialty:profile.specialty,
  scope:"INDIVIDUAL_DRAFT",rosterBlobSha:profile.rosterBlobSha,
  sections,
  externalCandidates:dossier.candidateReading.map(s=>({
   ...s,verified:false,checkedAt:null,usedAsEvidence:false,
   contentRetrieved:false,citationReady:false
  })),
  refreshPolicy:{refreshNeeded:true,lastValidated:null,dueAt:null,
   revisionEvidenceRef:null,currentness:"UNVERIFIED"},
  status:"INTERNAL_METHODOLOGY_CANDIDATE_NOT_GROUNDED",
  realSourceRetrievals:0,knowledgeClaimsApproved:0,
  ownerApprovalRequired:true,realPrivateSourcesAvailable:false
 };
}
export function createPhase3DraftCatalog(drafts){
 if(drafts?.stage!=="B"||drafts.phase!==1||drafts.profiles?.length!==185)
  throw Error("PHASE_B1_FROZEN_DRAFTS_REQUIRED");
 const byId=new Map(drafts.profiles.map(p=>[p.canonicalAgentId,p]));
 if(byId.size!==185||drafts.profiles.filter(p=>p.role==="Chief").length!==25||
    drafts.profiles.filter(p=>p.role==="Specialist").length!==160)
  throw Error("UNEXPECTED_FROZEN_PROFILE_COUNTS");
 const packs=drafts.profiles.map(rolePack);
 const chief=drafts.profiles.filter(x=>x.role==="Chief");
 const departments=chief.map(c=>{
  const source=METHOD_SOURCE.chiefs;
  const members=drafts.profiles.filter(p=>p.department===c.department);
  if(members.length<2||members.some(p=>p.role==="Specialist"&&p.chiefId!==c.canonicalAgentId))
   throw Error("INVALID_DEPARTMENT_ROSTER");
  return {
   guideId:"b3-dept-"+c.canonicalAgentId,
   chiefId:c.canonicalAgentId,department:c.department,
   memberIds:members.map(x=>x.canonicalAgentId),
   scope:"DEPARTMENT_DRAFT",
   sections:[
    section(c.canonicalAgentId,"department-workflow",
      c.distinctiveReasoning.initialSequence.join(" | "),source),
    section(c.canonicalAgentId,"review-boundaries",
      c.distinctiveReasoning.failureModes.join(" | "),source)
   ],
   status:"REVIEW_CANDIDATE_ONLY_NOT_GROUNDED",
   approvedForSharedMemory:false
  };
 });
 return {
  stage:"B",phase:3,schemaVersion:1,
  rosterBlobSha:drafts.profiles[0].rosterBlobSha,
  source:"Prior authored internal department and specialist methods; NOT verified outside evidence",
  mode:"OFFLINE_REVIEW_CANDIDATES_ONLY",
  rolePacks:packs,departmentGuides:departments,
  summary:{rolePacks:185,departmentGuides:25,sections:185*4+25*2,
   independentRealWorldSourceChecks:0,ownerApprovedKnowledgeLibraries:0,
   productionSearchQueries:0,enabledAgents:0}
 };
}
/** Local search is structural discovery, never an evidence-backed answer. */
export function searchDraftCatalog(catalog,{actorId,query,limit=10}={}){
 if(catalog?.mode!=="OFFLINE_REVIEW_CANDIDATES_ONLY"||
    catalog.rolePacks?.length!==185||catalog.departmentGuides?.length!==25)
  throw Error("B3_CATALOG_REQUIRED");
 if(!valid(actorId)||!valid(query)||query.length>120||
    !Number.isInteger(limit)||limit<1||limit>30)
  throw Error("INVALID_OFFLINE_SEARCH");
 const current=catalog.rolePacks.find(p=>p.canonicalAgentId===actorId);
 if(!current)throw Error("UNKNOWN_CANONICAL_AGENT");
 const accessible=[
  ...current.sections.map(s=>({scope:"INDIVIDUAL_DRAFT",agentId:actorId,
   department:current.department,...s})),
  ...catalog.departmentGuides.filter(g=>g.department===current.department)
   .flatMap(g=>g.sections.map(s=>({scope:"DEPARTMENT_DRAFT",
    agentId:g.chiefId,department:g.department,...s})))
 ];
 const needle=query.toLocaleLowerCase("en").trim();
 const hits=accessible.filter(s=>s.content.toLocaleLowerCase("en").includes(needle))
  .slice(0,limit).map(({content,...metadata})=>({
   ...metadata,excerpt:content.slice(0,320),isProfessionalCitation:false,
   trustworthyExternalEvidence:false,realAgentAuthorized:false
  }));
 return {
  query,actorId,hits,
  mode:"OFFLINE_INTERNAL_DRAFT_LOOKUP_NOT_LIVE_RETRIEVAL",
  externalCitationAvailable:false,
  sourceValidationRequired:true,
  realDataAccessed:false
 };
}
export function proposeSyntheticProjectKnowledge({actorId,projectId,content,sourceConsentRef},catalog){
 if(catalog?.mode!=="OFFLINE_REVIEW_CANDIDATES_ONLY"||
    !catalog.rolePacks.some(x=>x.canonicalAgentId===actorId)||
    typeof projectId!=="string"||!/^synthetic-[a-z0-9-]{2,60}$/.test(projectId)||
    typeof content!=="string"||!content.startsWith("SYNTHETIC:")||
    content.length>1000||typeof sourceConsentRef!=="string"||
    !/^synthetic-consent-[a-z0-9-]{2,60}$/.test(sourceConsentRef))
  throw Error("SYNTHETIC_PROJECT_PLAN_REQUIRED");
 return {
  kind:"PROJECT_KNOWLEDGE_PROPOSAL_ONLY",actorId,projectId,
  proposedSource:content,sourceConsentRef,
  sourceContentVerified:false,grantedProjectMembership:false,
  dataWritten:false,importedIntoLibrary:false,
  ownerApproved:false,sharedWithOtherAgents:false,
  requiresAuthenticatedOwnerAndProjectGrant:true
 };
}
