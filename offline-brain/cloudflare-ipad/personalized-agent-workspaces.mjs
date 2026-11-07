/** Isolated personalized agent workspaces; synthetic profiles, no real user data. */
import {CHIEFS,SPECIALISTS} from './chief-network.mjs';
const projectCatalog=Object.freeze([
 {id:'scotty',label:'SCOTTY AIOS',domains:['engineering','infrastructure','security','operations','communication','quality','optimization','support','documentation','data','compliance']},
 {id:'eirden',label:'Eirden Atelier',domains:['engineering','infrastructure','security','operations','communication','quality','commerce','research','data','publishing','documentation','support','governance']},
 {id:'writing',label:'Creative Writing Projects',domains:['creative','media','research','publishing','learning','communication','analysis']},
 {id:'education',label:'Education & Personal Curriculum',domains:['education','learning','science','research','documentation','scheduling','data']},
 {id:'creative-business',label:'Creative Business & Content',domains:['commerce','creative','media','communication','quality','scheduling','publishing','advocacy']},
]);
const jobsByDomain={
 operations:['organize authorized project milestones','propose assignment handoffs','prepare blocked-task briefings'],
 analysis:['compare evidence and alternatives','document assumptions','prepare decision matrices'],
 security:['review proposed access scopes','identify privacy risks','prepare security review checklists'],
 research:['evaluate source reliability','draft research questions','prepare evidence summaries'],
 engineering:['review implementation plans','draft technical test cases','diagnose synthetic failures'],
 missions:['plan approved mission milestones','recommend agent teams','prepare progress summaries'],
 governance:['review proposed policies','document decision tradeoffs','prepare approval briefs'],
 communication:['draft authorized messages','review clarity and tone','prepare communication briefs'],
 wellness:['summarize general wellness information','draft appointment question lists','identify when professional input is appropriate'],
 'medical-evidence':['compare published evidence','flag unsupported medical claims','draft non-diagnostic evidence summaries'],
 scheduling:['draft calendar plans','identify schedule conflicts','prepare time-block options'],
 logistics:['map task dependencies','draft resource checklists','identify supply constraints'],
 infrastructure:['review service reliability plans','prepare recovery checklists','propose monitoring metrics'],
 optimization:['analyze process bottlenecks','propose measurable improvements','draft before-after evaluation plans'],
 innovation:['brainstorm project experiments','compare possible approaches','prepare innovation briefs'],
 compliance:['identify policy questions','draft risk registers','prepare review checklists'],
 media:['draft content production briefs','prepare editing shot lists','review publication readiness'],
 documentation:['organize authorized documentation','draft change logs','prepare knowledge indexes'],
 science:['explain scientific concepts','evaluate study methodology','draft learning notes'],
 learning:['prepare study plans','generate practice activities','summarize progress evidence'],
 support:['triage synthetic issues','prepare troubleshooting steps','draft support handoffs'],
 advocacy:['map stakeholder concerns','draft respectful outreach proposals','prepare negotiation briefs'],
 quality:['design synthetic acceptance tests','triage defect reports','prepare QA evidence summaries'],
 commerce:['compare pricing scenarios','draft customer journey maps','prepare commercial risk notes'],
 creative:['outline creative deliverables','draft content concepts','prepare revision checklists'],
 education:['create lesson outlines','draft study exercises','prepare learning objectives'],
 finance:['prepare budget scenarios','review financial assumptions','draft cost comparisons'],
 'legal-information':['summarize public legal information','prepare questions for qualified professionals','identify jurisdiction uncertainties'],
 data:['prepare data dictionaries','propose validation checks','summarize permitted datasets'],
 accessibility:['review interface accessibility','prepare inclusive content checks','draft usability recommendations'],
 publishing:['prepare release checklists','review publication workflows','draft content handoff notes']
};
const chiefStyle={
 'chief-riker':'decisive, collaborative operations',
 'chief-spock':'precise, evidence-led analysis',
 'chief-worf':'security-first, direct and protective',
 'chief-data':'curious, methodical and verification-focused',
 'chief-geordi':'practical, inventive and reliability-first',
 'chief-kirk':'bold, guided mission leadership',
 'chief-picard':'balanced, diplomatic governance',
 'chief-troi':'warm, direct, collaborative and non-diagnostic',
 'chief-uhura':'articulate, welcoming and attentive',
 'chief-crusher':'compassionate and evidence-conscious',
 'chief-mccoy':'candid and safety-minded',
 'chief-sulu':'calm and organized',
 'chief-chekov':'resourceful and detail-oriented',
 'chief-scotty-engineering':'pragmatic and resilient',
 'chief-seven':'analytical and efficiency-focused',
 'chief-janeway':'curious and decisive',
 'chief-tuvok':'disciplined and objective',
 'chief-paris':'creative and adaptable',
 'chief-kim':'diligent and communicative',
 'chief-bashir':'inquisitive and science-minded',
 'chief-dax':'reflective and interdisciplinary',
 'chief-o-brien':'hands-on and dependable',
 'chief-kira':'assertive and principled',
 'chief-odo':'observant and skeptical',
 'chief-quark':'commercially astute and practical'
};
function styleFor(id){return chiefStyle[id]||'thoughtful, precise and collaborative';}
const specialistStyle=['careful and systematic','creative and exploratory','practical and concise','thorough and evidence-focused','supportive and patient','efficient and organized','curious and analytical','direct and transparent','detail-oriented and meticulous','collaborative and adaptive'];
export const AGENT_PROFILES=Object.freeze([
 ...CHIEFS.map(c=>Object.freeze({id:c.id,kind:'chief',name:c.name,department:c.department,domain:c.domain,personality:styleFor(c.id),jobs:Object.freeze([...(jobsByDomain[c.domain]||jobsByDomain.operations)]),knowledgePolicy:'source-grounded, versioned, owner-reviewed',memoryScopes:Object.freeze(['individual','department','shared']),status:'development'})),
 ...SPECIALISTS.map((s,i)=>Object.freeze({id:s.id,kind:'specialist',name:s.name,chiefId:s.chiefId,domain:s.domain,personality:specialistStyle[i%10],jobs:Object.freeze([jobsByDomain[s.domain]?.[i%3]||'prepare scoped task drafts']),knowledgePolicy:'cite evidence; propose updates for review',memoryScopes:Object.freeze(['individual','department','shared']),status:'catalog-prototype'}))
]);
const index=new Map(AGENT_PROFILES.map(a=>[a.id,a]));
export function agentProfile(id){const a=index.get(id);if(!a)throw Error('UNKNOWN_AGENT');return a;}
function authorize(actor,projectId,permission){if(!actor?.authenticated||!actor.id||!actor.projects?.[projectId]?.includes(permission))throw Error('ACCESS_DENIED');}
function copy(x){return JSON.parse(JSON.stringify(x));}
export function suggestProjectAgents({actor,projectId,projectType,goal}={}){
 authorize(actor,projectId,'read');if(!goal?.trim())throw Error('GOAL_REQUIRED');
 const p=projectCatalog.find(x=>x.id===projectType);if(!p)throw Error('UNKNOWN_PROJECT_TYPE');
 const chiefs=AGENT_PROFILES.filter(x=>x.kind==='chief'&&p.domains.includes(x.domain)).slice(0,8);
 return {projectId,projectType,goal,chiefRecommendations:chiefs.map(x=>({id:x.id,job:x.jobs[0],reason:'domain match: '+x.domain})),status:'suggestion-only',assignmentsCreated:false};
}
export function agentAssignmentProposal({actor,projectId,agentId,job,missionId,question,collaboratorIds=[]}={}){
 authorize(actor,projectId,'assign:propose');const agent=agentProfile(agentId);
 if(!agent.jobs.includes(job)||!missionId)throw Error('INVALID_JOB_OR_MISSION');
 for(const id of collaboratorIds)agentProfile(id);
 return {projectId,agentId,job,missionId,question:question||'',collaboratorIds,chiefReviewerId:agent.kind==='specialist'?agent.chiefId:'chief-riker',status:'pending-owner-approval',started:false};
}
export function knowledgeUpdateProposal({actor,projectId,agentId,topic,summary,sourceRefs=[],sourceDates=[]}={}){
 authorize(actor,projectId,'knowledge:propose');agentProfile(agentId);
 if(!topic?.trim()||!summary?.trim()||!sourceRefs.length)throw Error('EVIDENCE_REQUIRED');
 return {projectId,agentId,topic,summary,sourceRefs,sourceDates,verification:'unverified',status:'pending-owner-review',published:false};
}
export function personalizedBio({actor,projectId,agentId,assignments=[],missions=[],questions=[],collaborations=[],knowledge=[]}={}){
 authorize(actor,projectId,'read');const agent=agentProfile(agentId);
 const mine=x=>x.projectId===projectId&&(x.agentId===agentId||x.agentIds?.includes(agentId));
 return {agent:copy(agent),projects:copy(assignments.filter(mine).map(x=>x.projectId)),assignments:copy(assignments.filter(mine)),missions:copy(missions.filter(mine)),questions:copy(questions.filter(mine)),collaborations:copy(collaborations.filter(mine)),knowledge:copy(knowledge.filter(mine)),source:'authorized records supplied by caller',persisted:false};
}
export function proposeReviewChain({actor,projectId,specialistId,missionId,draft,evidenceRefs=[]}={}){
 authorize(actor,projectId,'read');const s=agentProfile(specialistId);
 if(s.kind!=='specialist'||!missionId||!draft?.trim())throw Error('INVALID_REVIEW');
 return {projectId,missionId,specialistId,chiefReviewerId:s.chiefId,scottyReviewerId:'scotty',draft,evidenceRefs,stages:['specialist-draft','chief-review','scotty-synthesis','owner-approval'],status:'specialist-draft',advanced:false};
}
