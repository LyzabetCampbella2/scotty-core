/** SCOTTY isolated integration prototype. No production adapters, secrets or network calls. */
import {REMAINING_CHIEF_PROFILES} from './remaining-chiefs.mjs';
const existing=[
 ['RIKER','Operations & Team Coordination','operations'],['SPOCK','Strategy & Analysis','analysis'],
 ['WORF','Security & Privacy','security'],['DATA','Research & Intelligence','research'],
 ['GEORDI','Engineering & Technology','engineering'],['KIRK','Missions & Leadership','missions'],
 ['PICARD','Governance & Diplomacy','governance'],['TROI','Human Relations','communication']
];
const primary={UHURA:'communication',CRUSHER:'wellness',MCCOY:'medical-evidence',SULU:'scheduling',CHEKOV:'logistics','SCOTTY-ENGINEERING':'infrastructure',SEVEN:'optimization',JANEWAY:'innovation',TUVOK:'compliance',PARIS:'media',KIM:'documentation',BASHIR:'science',DAX:'learning',"O-BRIEN":'support',KIRA:'advocacy',ODO:'quality',QUARK:'commerce'};
const specialistDomains=['research','operations','engineering','security','communication','creative','education','finance','legal-information','wellness','data','quality','accessibility','publishing','logistics','support'];
export const CHIEFS=Object.freeze([...existing.map(([name,department,domain])=>({id:'chief-'+name.toLowerCase(),name,department,domain,stage:'existing-development'})),...REMAINING_CHIEF_PROFILES.map(x=>({id:x.id,name:x.name,department:x.department,domain:primary[x.name],stage:'provisional-development'}))]);
export const SPECIALISTS=Object.freeze(Array.from({length:160},(_,i)=>{const domain=specialistDomains[Math.floor(i/10)];return Object.freeze({id:'specialist-'+String(i+1).padStart(3,'0'),name:domain+' specialist '+String(i%10+1).padStart(2,'0'),domain,chiefId:CHIEFS.find(c=>c.domain===domain)?.id||'chief-riker',status:'catalog-only'});}));
const chiefIndex=new Map(CHIEFS.map(c=>[c.id,c]));
const specialistIndex=new Map(SPECIALISTS.map(s=>[s.id,s]));
const freezeCopy=x=>JSON.parse(JSON.stringify(x));
function authorize(actor,projectId,action){if(!actor||!actor.authenticated||!actor.id||!projectId||!actor.projects?.[projectId]?.includes(action))throw Error('ACCESS_DENIED');}
function chief(id){const c=chiefIndex.get(id);if(!c)throw Error('UNKNOWN_CHIEF');return c;}
function specialist(id){const s=specialistIndex.get(id);if(!s)throw Error('UNKNOWN_SPECIALIST');return s;}
export function reasoningPlan({chiefId,actor,projectId,goal,inputs=[]}={}){
 authorize(actor,projectId,'read');const c=chief(chiefId);if(!goal?.trim())throw Error('GOAL_REQUIRED');
 return {chiefId,projectId,domain:c.domain,goal,steps:['clarify '+c.domain+' requirements','identify available authorized evidence','produce domain-specific draft','request chief review','request SCOTTY synthesis'],inputs:freezeCopy(inputs),status:'proposal',executed:false,ownerApprovalRequired:true};
}
export class ScopedMemory{
 constructor(adapter){if(!adapter||typeof adapter.read!=='function'||typeof adapter.write!=='function')throw Error('ADAPTER_REQUIRED');this.adapter=adapter;}
 key(scope,owner,projectId){if(!['individual','department','shared'].includes(scope)||!owner||!projectId)throw Error('INVALID_MEMORY_SCOPE');return [scope,projectId,owner].join(':');}
 async read({actor,projectId,scope,owner}){authorize(actor,projectId,'memory:read');if(scope==='individual'&&actor.id!==owner&&!actor.roles?.includes('owner'))throw Error('ACCESS_DENIED');if(scope==='department'&&!actor.departments?.includes(owner)&&!actor.roles?.includes('owner'))throw Error('ACCESS_DENIED');if(scope==='shared'&&owner!=='approved')throw Error('ACCESS_DENIED');return freezeCopy(await this.adapter.read(this.key(scope,owner,projectId))||[]);}
 async propose({actor,projectId,scope,owner,content,evidenceRefs=[],sensitive=false,consent=false}){authorize(actor,projectId,'memory:propose');this.key(scope,owner,projectId);if(!content?.trim()||!evidenceRefs.length)throw Error('EVIDENCE_REQUIRED');if(sensitive&&!consent)throw Error('CONSENT_REQUIRED');return {actorId:actor.id,projectId,scope,owner,content,evidenceRefs,sensitive,consent,status:'pending-owner-approval'};}
 async approve({actor,proposal}){authorize(actor,proposal.projectId,'memory:approve');if(!actor.roles?.includes('owner')||proposal.status!=='pending-owner-approval')throw Error('OWNER_APPROVAL_REQUIRED');const key=this.key(proposal.scope,proposal.owner,proposal.projectId);const old=await this.adapter.read(key)||[];const record={...freezeCopy(proposal),status:'approved',approvedBy:actor.id};await this.adapter.write(key,[...old,record]);return record;}
}
export class InMemoryTestAdapter{
 #data=new Map();
 async read(key){return freezeCopy(this.#data.get(key)||[]);}
 async write(key,value){this.#data.set(key,freezeCopy(value));}
}
export function bioView({actor,chiefId,projectId,assignments=[],questions=[],missions=[],collaborations=[]}={}){
 authorize(actor,projectId,'read');const c=chief(chiefId);
 const belongs=x=>x.projectId===projectId&&(x.chiefId===chiefId||x.chiefIds?.includes(chiefId));
 return {chief:c,projects:[projectId],assignments:freezeCopy(assignments.filter(belongs)),questions:freezeCopy(questions.filter(belongs)),missions:freezeCopy(missions.filter(belongs)),collaborations:freezeCopy(collaborations.filter(belongs)),source:'authorized-input-only'};
}
export function routeRequest({actor,projectId,goal,domain,chiefId}={}){
 authorize(actor,projectId,'read');if(!goal?.trim())throw Error('GOAL_REQUIRED');
 const selected=chiefId?chief(chiefId):CHIEFS.find(c=>c.domain===domain)||CHIEFS.find(c=>c.id==='chief-riker');
 return {projectId,goal,chiefId:selected.id,domain:selected.domain,status:'pending-owner-approval',dispatched:false,scottySynthesis:'pending'};
}
export function delegateSpecialist({actor,projectId,chiefId,specialistId,missionId}={}){
 authorize(actor,projectId,'assign');chief(chiefId);const s=specialist(specialistId);
 if(!missionId)throw Error('MISSION_REQUIRED');
 return {projectId,chiefId,specialistId:s.id,missionId,status:'pending-owner-approval',assigned:false,started:false};
}
export function chiefMessage({actor,projectId,fromChiefId,toChiefId,body}={}){
 authorize(actor,projectId,'message:propose');chief(fromChiefId);chief(toChiefId);if(!body?.trim())throw Error('MESSAGE_REQUIRED');
 return {projectId,fromChiefId,toChiefId,body,status:'pending-owner-approval',sent:false};
}
export function hudSnapshot({actor,projectId,chiefId,assignments=[],questions=[],missions=[],collaborations=[],pendingApprovals=[]}={}){
 const bio=bioView({actor,projectId,chiefId,assignments,questions,missions,collaborations});
 return {...bio,pendingApprovals:freezeCopy(pendingApprovals.filter(x=>x.projectId===projectId)),status:'synthetic-preview',live:false};
}
