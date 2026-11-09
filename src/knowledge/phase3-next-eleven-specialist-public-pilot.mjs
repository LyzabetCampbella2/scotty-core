/**
 * Stage B3: eleven additional assistant-inspected public-source candidates.
 * Metadata-only validation. No URLs fetched here, no clinical authorization,
 * source import, owner signoff, independent fact verification, or citations.
 */
import {validateEightSpecialistSourcePilot} from "./phase3-eight-specialist-public-pilot.mjs";
import {buildSpecialistSourceResearchQueue} from "./phase3-specialist-research-backlog.mjs";

const EXPECTED=Object.freeze({
 "agent-bones-09":{department:"Health & Human Support",chief:"chief-bones",
  specialty:"Emergency planning",host:"www.cdc.gov",path:"/prepare-your-health/plan-ahead/stay-connected.html"},
 "agent-data-01":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Source evaluation",host:"guides.library.cornell.edu",path:"/GrandChallengesProgram/EvaluatingResources"},
 "agent-data-02":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Fact verification",host:"www.factcheck.org",path:"/our-process/"},
 "agent-data-03":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Research synthesis",host:"www.cochrane.org",path:"/handbook"},
 "agent-data-04":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Literature review",host:"pubmed.ncbi.nlm.nih.gov",path:"/help/"},
 "agent-data-05":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Document analysis",host:"www.archives.gov",path:"/education/lessons/worksheets/analyze-a-written-document-intermediate"},
 "agent-data-06":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Data collection",host:"www.cdc.gov",path:"/brfss/data_documentation/"},
 "agent-data-07":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Citation quality",host:"www.crossref.org",path:"/documentation/retrieve-metadata"},
 "agent-data-08":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Uncertainty tracking",host:"www.nist.gov",path:"/glossary-term/39291"},
 "agent-data-09":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Information retrieval",host:"trec.nist.gov",path:"/howto.html"},
 "agent-data-10":{department:"Research & Intelligence",chief:"chief-data",
  specialty:"Evidence comparison",host:"www.usgs.gov",path:"/survey-manual/5023-fundamental-science-practices-peer-review"}
});
const ENTRY_KEYS=new Set(["pilotId","agentId","displayName","department","chiefId",
 "specialty","requirementId","publisher","title","url","sourceSection",
 "documentVersion","publicationDate","observedOn","paraphrase","application",
 "criticalLimit","inspectionState","originalSourceTextCopied",
 "independentPublisherAuthentication","independentlyVerifiedClaim",
 "licensingReviewed","ownerApproved","citableByLiveAgents",
 "sharedMemoryPromotionAllowed","nextReviewAction"]);
const TOP_KEYS=new Set(["schemaVersion","stage","phase","kind","scope","observedOn",
 "evidenceMethod","independentHumanReview","ownerApproval","citationPromotionAllowed",
 "productionDataUsed","externalAccountConnected","modelExecutions","items","summary"]);
const SUMMARY_KEYS=new Set(["assistantInspectedPages","specialistsWithInitialPublicCandidate",
 "sourceDocketsAssociated","independentReviewCompletions","approvedKnowledgePacks",
 "liveAgentCitationPermissions","productionDataAccesses"]);
const FALSE_FLAGS=["originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved","citableByLiveAgents",
 "sharedMemoryPromotionAllowed"];
const exactKeys=(obj,allowed)=>!!obj&&typeof obj==="object"&&!Array.isArray(obj)&&
 Object.keys(obj).length===allowed.size&&Object.keys(obj).every(x=>allowed.has(x));
const meaningful=x=>typeof x==="string"&&x.trim().length>=5&&x.length<=1000;
const date=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+"T00:00:00Z"))&&
 new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;

export function validateNextElevenSpecialistPublicPilot(pilot,previous,frozen,queue,first,second,third){
 const prev=validateEightSpecialistSourcePilot(previous,frozen,queue,first,second,third);
 const backlog=buildSpecialistSourceResearchQueue(frozen,queue,first,second,third);
 if(!exactKeys(pilot,TOP_KEYS)||pilot.schemaVersion!==1||pilot.stage!=="B"||
    pilot.phase!==3||pilot.kind!=="ASSISTANT_INSPECTED_NEXT_ELEVEN_SPECIALIST_PUBLIC_PILOT"||
    pilot.scope!=="ONE_BONES_AND_TEN_DATA_SPECIALIST_K1_PUBLIC_SOURCE_CANDIDATES"||
    pilot.observedOn!=="2026-11-08"||
    !meaningful(pilot.evidenceMethod)||
    pilot.independentHumanReview!=="NOT_DONE"||
    pilot.ownerApproval!=="NOT_GRANTED"||pilot.citationPromotionAllowed!==false||
    pilot.productionDataUsed!==false||pilot.externalAccountConnected!==false||
    pilot.modelExecutions!==0||!Array.isArray(pilot.items)||pilot.items.length!==11||
    !exactKeys(pilot.summary,SUMMARY_KEYS)||
    pilot.summary.assistantInspectedPages!==11||
    pilot.summary.specialistsWithInitialPublicCandidate!==11||
    pilot.summary.sourceDocketsAssociated!==11||
    pilot.summary.independentReviewCompletions!==0||
    pilot.summary.approvedKnowledgePacks!==0||
    pilot.summary.liveAgentCitationPermissions!==0||
    pilot.summary.productionDataAccesses!==0)
   throw Error("B3_NEXT_ELEVEN_UNAPPROVED_MANIFEST_REQUIRED");
 const roster=new Map(frozen.records.map(r=>[r["Agent ID"],r]));
 const dockets=new Map(queue.items.map(d=>[d.requirementId,d]));
 const plans=new Map(backlog.rolePlans.map(x=>[x.agentId,x]));
 const existing=new Set(prev.items.map(x=>x.agentId));
 if(roster.size!==185||dockets.size!==555||plans.size!==160||existing.size!==8)
  throw Error("B3_NEXT_ELEVEN_CANONICAL_INVENTORY_INVALID");
 const seen=new Set(),entries=[];
 for(const item of pilot.items){
  if(!exactKeys(item,ENTRY_KEYS)||!Object.hasOwn(EXPECTED,item.agentId)||
     existing.has(item.agentId)||seen.has(item.agentId))
   throw Error("B3_NEXT_ELEVEN_UNKNOWN_DUPLICATE_OR_REPLAY");
  seen.add(item.agentId);
  const spec=EXPECTED[item.agentId],r=roster.get(item.agentId);
  const docket=dockets.get(item.requirementId),plan=plans.get(item.agentId);
  if(!r||r.Role!=="Specialist"||r.Name!==item.displayName||
     r.Department!==spec.department||item.department!==spec.department||
     r["Chief ID"]!==spec.chief||item.chiefId!==spec.chief||
     r.Specialty!==spec.specialty||item.specialty!==spec.specialty||
     item.requirementId!==item.agentId+"-K1"||
     item.pilotId!=="b3-specialist-"+item.agentId+"-k1-20261108"||
     docket?.canonicalAgentId!==item.agentId||
     docket.reviewState!=="PENDING_SOURCE_EVIDENCE"||
     !plan?.researchTasks.some(t=>t.requirementId===item.requirementId&&
       t.publicSourceUrl===null&&t.ownerApproved===false))
   throw Error("B3_NEXT_ELEVEN_FROZEN_ROLE_OR_DOCKET_MISMATCH");
  if(!["publisher","title","sourceSection","documentVersion","paraphrase",
      "application","criticalLimit","nextReviewAction"].every(k=>meaningful(item[k]))||
     item.observedOn!=="2026-11-08"||
     !(item.publicationDate===null||date(item.publicationDate))||
     (item.publicationDate!==null&&item.publicationDate>item.observedOn))
   throw Error("B3_NEXT_ELEVEN_INVALID_SOURCE_METADATA");
  let u;
  try{u=new URL(item.url)}catch{throw Error("B3_NEXT_ELEVEN_SOURCE_URL_MISMATCH")}
  if(u.protocol!=="https:"||u.hostname!==spec.host||u.pathname!==spec.path||
    u.port||u.search||u.hash||u.username||u.password)
   throw Error("B3_NEXT_ELEVEN_SOURCE_URL_MISMATCH");
  if(item.inspectionState!=="PUBLIC_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     FALSE_FLAGS.some(k=>item[k]!==false))
   throw Error("B3_NEXT_ELEVEN_FORGED_REVIEW_OR_AUTHORIZATION");
  entries.push({
   agentId:item.agentId,department:item.department,chiefId:item.chiefId,
   specialty:item.specialty,requirementId:item.requirementId,
   sourceUrl:item.url,observedOn:item.observedOn,
   status:"PUBLIC_PAGE_INSPECTION_RECORDED_PENDING_INDEPENDENT_REVIEW",
   independentSourceReviewComplete:false,ownerApproved:false,
   citationPermission:false,realDataAccess:false,
   nextAction:"Independent source, claim, version and rights review; exact owner permission"
  });
 }
 if(seen.size!==11||Object.keys(EXPECTED).some(k=>!seen.has(k)))
  throw Error("B3_NEXT_ELEVEN_INCOMPLETE_SET");
 return {
  stage:"B",phase:3,schemaVersion:1,
  kind:"B3_NINETEEN_SPECIALIST_SOURCE_CANDIDATES_PENDING_REVIEW",
  priorEight:8,newEleven:11,entries,
  summary:{frozenChiefsWithInspectedPublicCandidate:25,
   specialistsWithInspectedPublicCandidate:19,
   specialistsStillWithoutInspectedCandidate:141,
   sourceDockets:555,assistantInspectedDocketCandidates:44,
   docketsStillWithoutInspectedCandidate:511,
   allDocketsStillPendingIndependentApproval:555,
   independentlyVerifiedClaims:0,ownerApprovedLibraries:0,
   allowedLiveCitations:0,realModelEvaluations:0,
   productionDataReads:0,agentActivations:0}
 };
}
