/**
 * B3 expansion-specialist research pilot: verifies immutable identities and
 * exact publisher URLs in an assistant-authored public-page metadata manifest.
 * It performs NO network fetch, user authentication, independent fact check,
 * real source ingestion, live citation enablement or agent activation.
 */
import {validateNextElevenSpecialistPublicPilot} from "./phase3-next-eleven-specialist-public-pilot.mjs";

const SOURCE_PATHS=Object.freeze({
 "agent-expansion-001":["science.nasa.gov","/exoplanets/whats-a-transit/"],
 "agent-expansion-002":["www.factcheck.org","/our-process/"],
 "agent-expansion-003":["www.sba.gov","/counseling/plan-your-business/"],
 "agent-expansion-004":["ies.ed.gov","/ncee/wwc/PracticeGuide/1"],
 "agent-expansion-005":["www.w3.org","/WAI/fundamentals/accessibility-intro/"],
 "agent-expansion-006":["www.archives.gov","/education/lessons/worksheets"],
 "agent-expansion-007":["itl.nist.gov","/div898/handbook/eda/eda.htm"],
 "agent-expansion-008":["docs.github.com","/en/actions/concepts/workflows-and-actions/workflows"],
 "agent-expansion-009":["www.w3.org","/WAI/curricula/designer-modules/visual-design/"],
 "agent-expansion-010":["www.pmi.org","/about/what-is-project-management"]
});
const TOP=new Set(["schemaVersion","stage","phase","kind","scope","observedOn","evidenceMethod",
 "independentHumanReview","ownerApproval","citationPromotionAllowed","productionDataUsed",
 "externalAccountConnected","modelExecutions","items","summary"]);
const ITEM=new Set(["pilotId","agentId","displayName","specialty","department","chiefId",
 "requirementId","publisher","title","url","sourceSection","documentVersion",
 "publicationDate","paraphrase","application","criticalLimit","observedOn",
 "inspectionState","originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed","nextReviewAction"]);
const SUMMARY=new Set(["assistantInspectedPublicPages","newSpecialistsWithInitialPublicCandidate",
 "allSpecialistsWithInitialPublicCandidate","chiefsWithInitialPublicCandidate",
 "sourceDocketsWithCandidate","sourceDocketsWithoutCandidate","pendingIndependentSourceReviews",
 "ownerApprovedLibraries","liveAgentCitationsAllowed","productionDataAccesses"]);
const FALSE=["originalSourceTextCopied","independentPublisherAuthentication",
 "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
 "citableByLiveAgents","sharedMemoryPromotionAllowed"];
const exact=(value,keys)=>value&&typeof value==="object"&&!Array.isArray(value)&&
 Object.keys(value).length===keys.size&&Object.keys(value).every(x=>keys.has(x));
const prose=x=>typeof x==="string"&&x.trim().length>=5&&x.length<=1000;
const date=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+"T00:00:00Z"))&&
 new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;

export function validateTenExpansionSpecialists(pilot,previous,firstEight,frozen,queue,chief1,chief2,chief3){
 const earlier=validateNextElevenSpecialistPublicPilot(previous,firstEight,frozen,queue,chief1,chief2,chief3);
 if(earlier.summary.specialistsWithInspectedPublicCandidate!==19||
    earlier.summary.assistantInspectedDocketCandidates!==44)
  throw Error("B3_PRIOR_SOURCE_COVERAGE_INVALID");
 if(!exact(pilot,TOP)||pilot.schemaVersion!==1||pilot.stage!=="B"||pilot.phase!==3||
    pilot.kind!=="ASSISTANT_INSPECTED_TEN_EXPANSION_SPECIALISTS_PUBLIC_PILOT"||
    pilot.scope!=="FIRST_TEN_EXPANSION_SPECIALIST_K1_PUBLIC_SOURCE_CANDIDATES"||
    pilot.observedOn!=="2026-11-08"||!prose(pilot.evidenceMethod)||
    pilot.independentHumanReview!=="NOT_DONE"||pilot.ownerApproval!=="NOT_GRANTED"||
    pilot.citationPromotionAllowed!==false||pilot.productionDataUsed!==false||
    pilot.externalAccountConnected!==false||pilot.modelExecutions!==0||
    !Array.isArray(pilot.items)||pilot.items.length!==10||
    !exact(pilot.summary,SUMMARY)||
    pilot.summary.assistantInspectedPublicPages!==10||
    pilot.summary.newSpecialistsWithInitialPublicCandidate!==10||
    pilot.summary.allSpecialistsWithInitialPublicCandidate!==29||
    pilot.summary.chiefsWithInitialPublicCandidate!==25||
    pilot.summary.sourceDocketsWithCandidate!==54||
    pilot.summary.sourceDocketsWithoutCandidate!==501||
    pilot.summary.pendingIndependentSourceReviews!==555||
    pilot.summary.ownerApprovedLibraries!==0||
    pilot.summary.liveAgentCitationsAllowed!==0||
    pilot.summary.productionDataAccesses!==0)
  throw Error("B3_EXPANSION_SPECIALIST_UNAPPROVED_MANIFEST_REQUIRED");
 const roster=new Map(frozen.records.map(r=>[r["Agent ID"],r]));
 const dockets=new Map(queue.items.map(x=>[x.requirementId,x]));
 if(roster.size!==185||dockets.size!==555)
  throw Error("B3_EXPANSION_SPECIALIST_FROZEN_SOURCE_INVENTORY_INVALID");
 const seen=new Set();
 const reports=[];
 const priorIds=new Set([...firstEight.items,...previous.items].map(x=>x.agentId));
 if(priorIds.size!==19)throw Error("B3_EXPANSION_SPECIALIST_PREVIOUS_PILOT_REPLAY");
 for(const item of pilot.items){
  if(!exact(item,ITEM)||!Object.hasOwn(SOURCE_PATHS,item.agentId)||
     seen.has(item.agentId)||priorIds.has(item.agentId))
   throw Error("B3_EXPANSION_SPECIALIST_DUPLICATE_OR_UNRECOGNIZED_ID");
  seen.add(item.agentId);
  const row=roster.get(item.agentId);
  const docket=dockets.get(item.requirementId);
  if(!row||row.Role!=="Specialist"||row.Name!==item.displayName||
     row.Specialty!==item.specialty||row.Department!==item.department||
     row["Chief ID"]!==item.chiefId||
     item.requirementId!==item.agentId+"-K1"||
     item.pilotId!=="b3-expansion-specialist-"+item.agentId+"-k1-20261108"||
     docket?.canonicalAgentId!==item.agentId||
     docket.reviewState!=="PENDING_SOURCE_EVIDENCE"||
     docket.mayCiteExternalClaim!==false)
   throw Error("B3_EXPANSION_SPECIALIST_WRONG_ROLE_OR_DOCKET");
  const [host,path]=SOURCE_PATHS[item.agentId];
  let url;
  try{url=new URL(item.url)}catch{throw Error("B3_EXPANSION_SPECIALIST_SOURCE_URL_INVALID")}
  if(url.protocol!=="https:"||url.hostname!==host||url.pathname!==path||
     url.search||url.hash||url.port||url.username||url.password)
   throw Error("B3_EXPANSION_SPECIALIST_SOURCE_URL_INVALID");
  if(!["publisher","title","sourceSection","documentVersion",
      "paraphrase","application","criticalLimit","nextReviewAction"]
      .every(k=>prose(item[k]))||item.observedOn!=="2026-11-08"||
     !(item.publicationDate===null||date(item.publicationDate))||
     item.publicationDate!==null&&item.publicationDate>item.observedOn)
   throw Error("B3_EXPANSION_SPECIALIST_BAD_SOURCE_METADATA");
  if(item.inspectionState!=="PUBLIC_PAGE_INSPECTED_BY_ASSISTANT_PENDING_INDEPENDENT_REVIEW"||
     FALSE.some(k=>item[k]!==false))
   throw Error("B3_EXPANSION_SPECIALIST_FAKE_APPROVAL_OR_LICENSE");
  reports.push({agentId:item.agentId,displayName:item.displayName,
   chiefId:item.chiefId,department:item.department,specialty:item.specialty,
   requirementId:item.requirementId,sourceUrl:item.url,observedOn:item.observedOn,
   assistantInspectedPublicPage:true,independentlyReviewed:false,
   verifiedKnowledgeClaim:false,ownerApproved:false,liveCitationAllowed:false,
   sourceImportedToAgent:false,permissionsGranted:false});
 }
 if(seen.size!==10||Object.keys(SOURCE_PATHS).some(id=>!seen.has(id)))
  throw Error("B3_EXPANSION_SPECIALIST_NOT_ALL_TEN");
 return {
  stage:"B",phase:3,kind:"B3_TEN_EXPANSION_SPECIALIST_REVIEW_CANDIDATES",
  added:reports,
  summary:{totalFrozenAgents:185,chiefsWithCandidate:25,specialistsWithCandidate:29,
   remainingSpecialistsWithoutCandidate:131,totalDockets:555,
   sourceDocketsWithInspectedCandidate:54,sourceDocketsWithoutInspectedCandidate:501,
   pendingIndependentDecisions:555,
   actualSourcesIndependentlyVerified:0,
   ownerApprovedKnowledgeLibraries:0,liveCitationsAuthorized:0,
   realModelEvaluations:0,activeAgents:0}
 };
}
