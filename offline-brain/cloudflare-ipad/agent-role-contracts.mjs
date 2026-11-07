/**
 * Phase 1: disambiguate agents with overlapping specialty labels.
 * Every assignment is a DEVELOPMENT work contract, not a permission or
 * authority to execute. Stage lanes deliberately vary the duty, artifact and
 * acceptance evidence without claiming additional professional credentials.
 */
import {connectedRoster} from './connected-roster.mjs';
import {specialistPlaybook} from './specialist-playbooks.mjs';
import {departmentMethod} from './department-methods.mjs';

export const ROLE_CONTRACT_VERSION='scotty-role-contracts-v1';
const STAGES=Object.freeze([
 {key:'requirements',label:'Requirements and constraints',
  question:'What does the task require, and which assumptions are still unverified?',
  artifact:'requirements-and-dependencies brief',
  method:'Extract acceptance conditions, constraints, provenance and unknowns before proposing work',
  evidence:'A reviewable criteria table with explicitly labeled missing evidence',
  boundary:'Do not treat a draft scope as an owner-approved assignment'},
 {key:'design',label:'Method and alternative designs',
  question:'What are two feasible approaches, and what evidence would distinguish them?',
  artifact:'alternatives-and-method design',
  method:'Compare two feasible options with assumptions, costs, trade-offs and reversibility',
  evidence:'A decision comparison with at least one explicit failure mode',
  boundary:'Do not claim a method has been implemented or externally validated'},
 {key:'verification',label:'Independent review and edge cases',
  question:'Where could a plausible result be wrong, unsafe or unverified?',
  artifact:'independent verification matrix',
  method:'Prepare normal, boundary, counterexample and unauthorized-case checks',
  evidence:'Independent expected outcomes, evidence gaps and escalation conditions',
  boundary:'A synthetic check does not certify a live system or external result'},
 {key:'handoff',label:'Delivery clarity and handoff',
  question:'What is ready for chief review, what remains blocked, and what is the next owner decision?',
  artifact:'handoff-and-revision package',
  method:'Package evidence, outstanding questions, owner decisions and a reversible next step',
  evidence:'A deliverable index and concise source-backed handoff record',
  boundary:'Do not say messages or assignments were sent when only drafted'}
]);
const chiefLanes={
 'Strategy & Reasoning':['Strategic trade-offs','decision-scoping matrix','Risk confidence and alternative scenarios'],
 'Security & Defense':['Privacy and trust boundaries','access-denial review','Verified owner approval and audit'],
 'Research & Intelligence':['Source and claim provenance','dated-evidence ledger','Contradictions and confidence'],
 'Commerce & Finance':['Financial viability','unit economics and cash sensitivity','Cost or revenue assumptions'],
 'Command & Missions':['Mission safety and dependencies','approval checkpoint plan','Proposed versus completed statuses'],
 'Communications & Languages':['Audience and meaning','communication clarity rubric','Approval and disclosure boundaries'],
 'Engineering & Systems':['System reliability','reproducible engineering test plan','Rollback and unauthorized states'],
 'Science & Environment':['Experimental validity','hypothesis and controls plan','Sampling and uncertainty'],
 'Policy & Diplomacy':['Stakeholder impact','policy status and jurisdiction table','Draft versus binding rules'],
 'Health & Human Support':['Non-diagnostic health communication','clinician-question preparation','No medical decisions without professional review'],
 'Creative & Knowledge':['Narrative and canon consistency','story continuity ledger','Author-approved story facts'],
 'Operations & Coordination':['Workload ownership','handoff dependency map','Confirmed versus proposed schedule'],
 'Exploration & Discovery':['Observation provenance','discovery evidence protocol','Observation limitations'],
 'Quality & Verification':['Independent acceptance','negative-case test plan','No false test completion claims'],
 'Business & Enterprise':['Customer and delivery fit','offer-validation experiment','Fictional versus actual market results'],
 'Education & Learning':['Learning outcomes','lesson and retrieval-practice plan','Actual learner evidence'],
 'Accessibility & Wellbeing':['Participation and access barriers','alternative navigation plan','No assumed diagnoses'],
 'History & Culture':['Source context and chronology','primary-source comparison','Missing context and interpretation'],
 'Data & Analytics':['Metric definitions','data quality and denominator sheet','Sampling and missingness'],
 'Automation & Reliability':['Reliable idempotency','trigger and failure-state specification','Unverified automation states'],
 'Design & Media':['Visual accessibility','platform-safe design brief','Rights and accessibility verification'],
 'Projects & Delivery':['Deliverable dependencies','critical-path review','Actual milestone confirmation'],
 'Life Sciences':['Ethical sampling','organism and habitat study plan','Evidence limitations'],
 'Software & Applications':['Full-stack integrity','authorization and persistence test plan','No production-ready claim without target tests'],
 'Home & Logistics':['Confirmed logistics','constraints and contingency checklist','No invented bookings or travel time']
};
const norm=x=>String(x||'').trim().toLowerCase().replace(/\s+/g,' ');
const freezeDeep=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const v of Object.values(x))freezeDeep(v);
  Object.freeze(x);
 }return x;
};
export function buildRoleContracts(roster=connectedRoster()){
 if(!Array.isArray(roster)||roster.length!==185)throw Error('EXPECTED_185_ROSTER');
 const ids=new Set(),seen=new Map(),out=[];
 for(const a of roster){
  if(!a?.id||ids.has(a.id)||!a?.department||typeof a.isChief!=='boolean')
    throw Error('INVALID_ROLE_CONTRACT_ROSTER');
  ids.add(a.id);
  const key=a.department+'::'+norm(a.specialty);
  const n=seen.get(key)||0;
  seen.set(key,n+1);
  const stage=STAGES[n%STAGES.length];
  const totalMethod=a.isChief?departmentMethod(a.department,a.specialty||a.department):
    specialistPlaybook(a).procedure;
  const chief=chiefLanes[a.department];
  if(!chief||totalMethod.length<3)throw Error('UNSUPPORTED_ROLE_DEPARTMENT');
  const duplicateOrdinal=n+1;
  const specialty=String(a.specialty||a.department);
  const isChief=a.isChief;
  const artifacts=isChief?{
    label:chief[1],
    method:'Lead '+chief[0].toLowerCase()+'; '+totalMethod[0],
    evidence:'Chief review must address '+chief[2],
    question:'What evidence would change the department recommendation?',
    boundary:'Department leadership does not permit self-authorized delegation'
   }:{
    label:stage.artifact+' for '+specialty,
    method:stage.method+'; domain procedure: '+totalMethod[0],
    evidence:stage.evidence,
    question:stage.question,
    boundary:stage.boundary
   };
  out.push({
   schemaVersion:ROLE_CONTRACT_VERSION,agentId:a.id,
   chiefId:isChief?'scotty':a.chiefId,
   department:a.department,specialty,
   specializationTrack:isChief?chief[0]:stage.label,
   stage:isChief?'department-chief':stage.key,
   sameSpecialtyOrdinal:duplicateOrdinal,
   roleScope:'DESIGN_TIME_ONLY',
   responsibility:'Prepare '+artifacts.label+' for owner-authorized '+specialty+' work',
   method:artifacts.method,artifact:artifacts.label,
   evidenceRequired:artifacts.evidence,reviewQuestion:artifacts.question,
   limits:[artifacts.boundary,'No tools, model grants, private memory or verified assignments are created by this contract'],
   qualifiedExternalTools:[],activePermissions:[],
   certified:false,ownerReviewed:false
  });
 }
 if(out.filter(x=>x.stage==='department-chief').length!==25||
    out.filter(x=>x.stage!=='department-chief').length!==160)throw Error('ROLE_COUNTS_MISMATCH');
 return freezeDeep(out);
}
export const INDIVIDUAL_ROLE_CONTRACTS=buildRoleContracts();
const byId=new Map(INDIVIDUAL_ROLE_CONTRACTS.map(x=>[x.agentId,x]));
export function roleContract(id){
 const contract=byId.get(id);
 if(!contract)throw Error('UNKNOWN_ROLE_CONTRACT_AGENT');
 return structuredClone(contract);
}
export function overlappingSpecialtyReport(){
 const buckets=new Map();
 for(const x of INDIVIDUAL_ROLE_CONTRACTS){
  if(x.stage==='department-chief')continue;
  const key=x.department+'::'+norm(x.specialty);
  const list=buckets.get(key)||[];
  list.push(x);buckets.set(key,list);
 }
 const groups=[...buckets].filter(([,v])=>v.length>1).map(([key,agents])=>({
  key,agentIds:agents.map(a=>a.agentId),
  stages:agents.map(a=>a.stage),
  distinctArtifacts:new Set(agents.map(a=>a.artifact)).size===agents.length,
  reviewRequired:true
 }));
 return {
  groups,overlappingGroups:groups.length,
  overlappingAgents:groups.reduce((x,g)=>x+g.agentIds.length,0),
  automaticAssignmentPermitted:false
 };
}
