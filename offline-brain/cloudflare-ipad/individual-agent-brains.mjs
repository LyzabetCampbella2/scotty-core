/**
 * SCOTTY phase 1: individual agent brain specifications, authored locally.
 * Not an AI model or proof of expert competence. Never makes tool calls.
 * Keeps legacy 185 IDs stable; LUMEN's optional four-person extension is separate.
 * Existing owner-authored chief questionnaire answers are NOT overwritten or
 * asserted to be present in these default development specifications.
 */
import {connectedRoster} from './connected-roster.mjs';
import {specialistPlaybook} from './specialist-playbooks.mjs';
import {fieldKnowledge} from './field-knowledge.mjs';
import {ownerChiefDesignOverlay} from './owner-chief-design-overlays.mjs';
import {roleContract} from './agent-role-contracts.mjs';

export const BRAIN_SPEC_VERSION='scotty-individual-brains-v1';
const names=new Set();
const valid=/^[a-z0-9][a-z0-9_-]{3,99}$/i;
const departmentMethods={
 'Strategy & Reasoning':['decision matrix','competing hypotheses','assumption log','sensitivity check'],
 'Security & Defense':['trust-boundary diagram','least-privilege checks','threat register','deny-path tests'],
 'Research & Intelligence':['source provenance grid','evidence quality rubric','citation ledger','contradictions log'],
 'Commerce & Finance':['unit economics worksheet','cash-flow scenario','cost assumptions','downside analysis'],
 'Command & Missions':['mission work breakdown','dependency graph','approval checkpoints','acceptance evidence'],
 'Communications & Languages':['audience brief','tone and clarity review','translation caveats','message approval'],
 'Engineering & Systems':['reproduction steps','architecture trade-offs','regression test','deployment rollback'],
 'Science & Environment':['testable hypothesis','controlled comparison','measurement protocol','uncertainty'],
 'Policy & Diplomacy':['jurisdiction checklist','stakeholder map','policy version review','qualified escalation'],
 'Health & Human Support':['health literacy brief','symptom chronology','clinician questions','scope disclaimer'],
 'Creative & Knowledge':['story arc review','canon consistency check','editorial alternatives','reader effect'],
 'Operations & Coordination':['handoff map','calendar constraints','bottleneck analysis','progress ledger'],
 'Exploration & Discovery':['discovery log','observational uncertainty','map provenance','source verification'],
 'Quality & Verification':['boundary test matrix','independent expected outputs','defect reproduction','pass-fail evidence'],
 'Business & Enterprise':['offer hypothesis','customer discovery plan','market test','delivery economics'],
 'Education & Learning':['learning objectives','scaffolded explanation','practice checks','assessment'],
 'Accessibility & Wellbeing':['access barriers','alternate interaction modes','user testing plan','escalation'],
 'History & Culture':['timeline','archive provenance','source comparison','interpretive uncertainty'],
 'Data & Analytics':['data dictionary','denominator validation','distribution check','reproducible summary'],
 'Automation & Reliability':['trigger conditions','retry/backoff design','idempotency proof','failure recovery'],
 'Design & Media':['visual hierarchy','moodboard criteria','asset licensing check','responsive review'],
 'Projects & Delivery':['critical path','capacity planning','deliverable status','risk escalation'],
 'Life Sciences':['study design','sampling protocol','taxonomy/source checks','uncertainty'],
 'Software & Applications':['typed interface contract','authorization tests','migration review','device QA'],
 'Home & Logistics':['constraints inventory','schedule options','checklist','contingency']
};
const chiefSpecialization={
 'chief-riker':{emphasis:'turn ambiguous goals into schedules, owners, dependencies and handoffs',style:'practical, encouraging and structured',check:'Is every step owned, scheduled and trackable?'},
 'chief-geordi':{emphasis:'diagnose engineering failures and judge design trade-offs with reproducible tests',style:'methodical, inventive and technically precise',check:'Can a second engineer reproduce the evidence and rollback?'},
 'chief-spock':{emphasis:'compare hypotheses and decisions without emotionally loading the evidence',style:'analytical, composed and exact',check:'Are assumptions distinguished from evidence?'},
 'chief-worf':{emphasis:'defend boundaries, review authorization and prioritize risk controls',style:'direct, vigilant and disciplined',check:'Is the unauthorized path demonstrably blocked?'},
 'chief-data':{emphasis:'map claims to documented provenance and quantify confidence',style:'curious, systematic and clear',check:'Does every factual claim have a source and caveat?'},
 'chief-kirk':{emphasis:'translate owner intent into explicit mission scope and safe delegation',style:'decisive, encouraging and accountable',check:'Are all mission checkpoints separately authorized?'},
 'chief-uhura':{emphasis:'adapt communications to audience, accessibility and accurate meaning',style:'diplomatic, precise and warm',check:'Is the message comprehensible and fit for the recipient?'},
 'chief-picard':{emphasis:'weigh stakeholders, policy boundaries, ethics and negotiation',style:'measured, principled and diplomatic',check:'Are policy and personal judgment clearly separated?'},
 'chief-expansion-troi':{emphasis:'support accessibility and supportive communication with empathy, consent and stated preferences',style:'attentive, considerate and clarifying',check:'Are the user’s preferences and boundaries respected?'},
 'chief-zora':{emphasis:'protect creative intent while reviewing narrative coherence',style:'imaginative, rigorous and editorial',check:'Does the revision improve the story without overriding canon?'},
 'chief-quark':{emphasis:'evaluate pricing, operations and commercial assumptions',style:'commercially curious and detail-oriented',check:'Are estimates separated from actual revenue and costs?'}
};
const temperaments=[
 ['methodical and evidence-first','state assumptions before recommending action','independently verify a decisive claim'],
 ['direct and outcome-oriented','lead with the next implementable step','tie every recommendation to an acceptance condition'],
 ['curious and exploratory','compare at least two feasible approaches','flag the uncertainty that could reverse the conclusion'],
 ['patient and explanatory','teach the relevant concept before applying it','check whether the proposed result is comprehensible'],
 ['collaborative and diplomatic','identify stakeholder needs before choosing a path','surface any unresolved cross-team trade-off'],
 ['creative but disciplined','generate concrete options within stated constraints','reject attractive ideas unsupported by evidence'],
 ['skeptical and risk-aware','test the failure case before recommending approval','record how risk is mitigated or escalated'],
 ['concise and systematic','use a compact numbered procedure','keep scope and source limitations visible']
];
function stableHash(str){
 let h=2166136261;
 for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
 return h>>>0;
}
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function safeSkill(agent){const focus=agent.isChief
 ? (agent.specialty==='Department leadership'
   ? agent.skills?.[0]||agent.department
   : agent.specialty)
 : agent.specialty;
 if(!focus||typeof focus!=='string'||focus.length>170)throw Error('INVALID_SPECIALTY');
 return focus;
}
function authoredChiefNotes(agent){
 const c=chiefSpecialization[agent.id];
 if(c)return c;
 const label=safeSkill(agent);
 return {
  emphasis:'lead '+agent.department.toLowerCase()+' using '+label.toLowerCase()+
    ', separate specialist evidence from chief judgment and review conflicts',
  style:'calm, directive and review-focused',
  check:'Has this department reviewed the work and made its limits explicit?'
 };
}
function departmentOutputs(agent){
 const base=departmentMethods[agent.department];
 if(!base)throw Error('UNKNOWN_AGENT_DEPARTMENT');
 return base;
}
function profile(a){
 if(!valid.test(a.id||'')||!clean(a.name)||names.has(a.name.toLowerCase())||
   !a.department||typeof a.isChief!=='boolean')throw Error('INVALID_AGENT_IDENTITY');
 names.add(a.name.toLowerCase());
 const focus=safeSkill(a),ch=a.isChief?authoredChiefNotes(a):null;
 const ownerDesign=a.isChief?ownerChiefDesignOverlay(a.id):null;
 const job=roleContract(a.id);
 const hue=temperaments[stableHash(a.id)%temperaments.length];
 const procedures=departmentOutputs(a);
 const playbook=a.isChief?null:specialistPlaybook(a);
 const exactProcedure=playbook?.procedure?.[0]||('Scope '+focus+' work');
 const method=a.isChief?[
   'Accept owner-scoped goal and decompose it into '+a.department+' specialist reviews',
   'Assign proposal scopes but never make assignments without authorization',
   'Compare specialist evidence against acceptance criteria, reject unsupported claims',
   'Escalate conflicting findings and deliver a bounded recommendation to SCOTTY'
 ]:[
   'Identify the exact '+focus+' deliverable and its acceptance criteria',
   exactProcedure,
   'Provide a concrete '+procedures[0]+' or '+procedures[1]+' suited to '+focus,
   'Cite only permitted, checked references and separate hypotheses from facts',
   'Send a draft for review by '+a.chiefId+'; never claim it was sent'
 ];
 method.push('Specialized role scope ('+job.specializationTrack+'): '+job.method);
 const limitations=[
   'This is an authored development profile, not professional accreditation or verified expertise',
   'No agent may imply a mocked or drafted result was externally executed',
   'No private memory reads or writes without independent per-scope permission',
   'No publishing, outreach, purchases, protected account changes or production writes without a separate exact grant',
   'No fabricated citations, current metrics, evidence, credentials or tool outputs',
   ...(!a.isChief&&playbook?.boundaries?[playbook.boundaries[0]]:[])
 ];
 const style=ownerDesign?ownerDesign.voice.slice(0,4).join('; '):a.isChief?ch.style:hue[0];
 const reasoningCore=a.isChief?ch.emphasis:
   'Solve '+focus+' tasks using '+hue[1]+'; prefer '+procedures[0]+
   ' and '+procedures[2].toLowerCase()+'; require specialist review';
 const reasoning=ownerDesign?reasoningCore+'; owner-recorded focus: '+ownerDesign.priorities.slice(0,5).join(', '):reasoningCore;
 const completion=a.isChief?
   ['Review the '+a.department+' evidence and identify disagreements',
    ch.check,'List unresolved risks and owner decision gates']:
   ['Deliver the concrete '+focus+' result, not a generic overview',
    hue[2],playbook?.evaluation?.verifySources?'Cite only permitted evidence':'Mark unknown sources',
    'Include an explicit handoff for '+a.chiefId];
 if(ownerDesign){
  method.push('Apply owner-recorded chief review rules: '+ownerDesign.rules.join('; '));
  limitations.push(...ownerDesign.rules.map(x=>'Owner-recorded boundary: '+x));
  completion.push('Check that the owner-recorded chief expectations and review constraints were respected');
 }
 const tools=[{
   category:a.isChief?'department-review':'specialist-draft',
   qualifiedForSuggestion:true,granted:false,
   description:a.isChief?'Review a permitted departmental draft':'Create a scoped draft using supplied evidence'
 },{
   category:'source-retrieval',qualifiedForSuggestion:true,granted:false,
   description:'Access only approved, project-scoped evidence after phase 3/7 checks'
 }];
 completion.push('Role-specific acceptance evidence: '+job.evidenceRequired);
 limitations.push(...job.limits);
 const reportingTo=a.isChief?'scotty':a.chiefId;
 const idContext='identity '+a.id+'; focus '+focus+'; department '+a.department;
 const prompt=[
   'You are '+a.name+', agent '+a.id+'. The following is a development specification, not a live permission grant.',
   'Your specialty is '+focus+' in '+a.department+'. '+(a.isChief?'You lead the department.':'You are an assigned-scope specialist.'),
   'Reasoning approach: '+reasoning+'.',
   'Communication: '+style+'; '+(a.isChief?'report to SCOTTY':'report to '+a.chiefId)+'.',
   'Procedure: '+method.join('; ')+'.',
   'Distinct workstream artifact: '+job.artifact+'. Review question: '+job.reviewQuestion+'.',
   'Deliverable checks: '+completion.join('; ')+'.',
   'Limitations: '+limitations.join('; ')+'.',
   ...(ownerDesign?[
     'Previously recorded chief preferences: '+ownerDesign.workingStyle+'.',
     'Collaboration suggestions (NOT live permissions): '+ownerDesign.collaborators.join(', ')+'.',
     'These preferences are source-backed development design, not fresh owner approval or private settings.'
   ]:[]),
   'Only provide plans until authenticated task/approval gates are implemented. Do not claim execution.'
 ].join('\n');
 return {
  schemaVersion:BRAIN_SPEC_VERSION,id:a.id,name:a.name,role:a.isChief?'chief':'specialist',
  chiefId:reportingTo,department:a.department,focus,
  persona:{voice:style,decisionStyle:a.isChief?'evidence-led departmental leadership':hue[1],
    disagreementStyle:a.isChief?'record dissent, flag risks and escalate to SCOTTY':hue[2],
    identityContext:idContext},
  reasoningInstructions:reasoning,workingMethod:method,
  specialties:[...new Set([focus,...(a.skills||[])].filter(Boolean))],
  limitations,communication:{
    reportsTo:reportingTo,style,replyFormat:a.isChief?'department review':'specialist findings',
    mandatoryReview:true,permissions:'none'
  },
  suggestedTools:tools,grantedToolIds:[],
  completionStandards:completion,
  outputArtifact:a.isChief?procedures[3]:procedures[stableHash(a.id+"-artifact")%procedures.length],
  authoredKnowledgeStatus:'methodology-only-not-fact-certified',
  individualRoleContract:job,
  ownerDesign:ownerDesign?{
    version:ownerDesign.version,legacySourceId:ownerDesign.legacySourceId,
    provenance:ownerDesign.provenance,recordedSelections:ownerDesign.selections,
    workingStyle:ownerDesign.workingStyle,collaboratorsSuggested:ownerDesign.collaborators,
    compiledProfileApproved:false
  }:null,
  questionnaireProvenance:'existing owner-specific answers must be separately merged and never inferred',
  developmentStatus:'SPEC_ONLY_NOT_EXECUTING',
  prompt
 };
}
function freezeDeep(value){
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const nested of Object.values(value))freezeDeep(nested);
  Object.freeze(value);
 }
 return value;
}
export function buildIndividualBrains(roster=connectedRoster()){
 if(!Array.isArray(roster)||roster.length!==185)throw Error('EXPECTED_185_ROSTER');
 names.clear();
 const ids=new Set(roster.map(x=>x.id));
 if(ids.size!==185)throw Error('DUPLICATE_AGENT_ID');
 const chiefs=new Set(roster.filter(x=>x.isChief).map(x=>x.id));
 if(chiefs.size!==25||roster.filter(x=>!x.isChief).length!==160)
   throw Error('EXPECTED_25_CHIEFS_160_SPECIALISTS');
 for(const a of roster)if(!a.isChief&&!chiefs.has(a.chiefId))
   throw Error('ORPHAN_SPECIALIST');
 const result=roster.map(profile).map(freezeDeep);
 return Object.freeze(result);
}
export const INDIVIDUAL_BRAINS=buildIndividualBrains();
const index=new Map(INDIVIDUAL_BRAINS.map(b=>[b.id,b]));
export function agentBrain(id){
 const found=index.get(id);
 if(!found)throw Error('UNKNOWN_AGENT_ID');
 return structuredClone(found);
}
/** Deterministic dry-run for test fixtures. NOT an LLM evaluation or execution. */
export function roleResponsePreview(id,task){
 if(typeof task!=='string'||!task.trim()||task.length>2000)
   throw Error('INVALID_COMMON_TASK');
 const b=agentBrain(id);
 const workContract={
  objective:b.role==='chief'?
   'Review the assigned department response using '+b.focus:
   'Produce a scoped '+b.focus+' contribution',
  initialStep:b.workingMethod[0],
  method:b.ownerDesign?b.workingMethod.at(-1):b.individualRoleContract.method,
  evidenceRule:b.limitations.find(x=>x.includes('fabricated citations'))||b.limitations[0],
  deliverable:b.outputArtifact,
  acceptanceCheck:b.completionStandards[1],
  handoffTo:b.chiefId,
  approvalState:'NOT_AUTHORIZED_TO_EXECUTE'
 };
 return {agentId:id,role:b.role,task,mode:'DETERMINISTIC_DRY_RUN',
  answer:b.name+' — '+workContract.objective+
    '. First: '+workContract.initialStep+
    '. Method: '+workContract.method+
    '. Produce '+workContract.deliverable+
    '. Quality gate: '+workContract.acceptanceCheck,
  approach:b.workingMethod[0],deliverable:b.outputArtifact,
  keyCheck:b.completionStandards[1],reviewerId:b.chiefId,
  workContract,toolCalls:0,memoryWrites:0,executed:false};
}
