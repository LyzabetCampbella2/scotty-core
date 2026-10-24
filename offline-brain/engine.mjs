/**
 * Standalone zero-network knowledge retrieval / coordination.
 * Does not read DATABASE_URL, any backup, provider API, or filesystem.
 * Zero provider calls, zero production writes. Not imported by SCOTTY Core.
 */
import { DEPARTMENTS,buildSyntheticRoster } from "./catalog.mjs";
import { offlineKnowledgePacks } from "./packs.mjs";

const STOP=new Set(["what","when","where","which","would","should","about","there","these","those","this","that","from","with","have","into","your","please","could","some","need","want","scotty","agent","agents","help","using","does","will","and","the","for","are","was","can","how","all","our","his"]);
const SAFE_ID=/^[a-z0-9][a-z0-9._:-]{0,159}$/i;
const clean=(s,max=500)=>String(s??"").trim().slice(0,max);
const terms=s=>[...new Set((clean(s,20000).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]).filter(w=>!STOP.has(w)))].slice(0,80);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Math.trunc(Number(v)):min));
const reject=m=>{throw new Error(m)};
const knownDepartments=new Set(DEPARTMENTS.map(d=>d.name));

function normalizeDocument(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))reject("A reviewed source record is required");
  if(raw.approved!==true)reject("Knowledge source must be explicitly approved by the owner");
  const id=clean(raw.id,160),title=clean(raw.title,220),content=clean(raw.content,100001);
  if(!SAFE_ID.test(id)||!title||!content||content.length>100000)reject("Invalid id, title or source size");
  const scope=clean(raw.scope,30),department=clean(raw.department,120),projectId=clean(raw.projectId,160);
  if(!["shared","department","project","private"].includes(scope))reject("Explicit scope required");
  if(scope==="department"&&!knownDepartments.has(department))reject("Unknown department");
  if(scope==="project"&&(!SAFE_ID.test(projectId)||!Array.isArray(raw.allowedAgentIds)||!raw.allowedAgentIds.length))reject("Project sources need a project and explicit recipient agents");
  if(scope==="private"&&raw.allowedAgentIds?.length)reject("Private sources cannot be assigned to agents");
  const recipients=raw.allowedAgentIds??[];
  if(!Array.isArray(recipients)||recipients.length>128||recipients.some(id=>typeof id!=="string"||!SAFE_ID.test(id))||new Set(recipients).size!==recipients.length)reject("Invalid recipients");
  const type=clean(raw.sourceType,60),citation=clean(raw.citation,1000),reviewedAt=clean(raw.reviewedAt,40);
  if(!["original-playbook","owner-file","public-reference","licensed-material"].includes(type)||!citation||!reviewedAt||!Number.isFinite(Date.parse(reviewedAt)))reject("Sources require provenance, citation and review date");
  const url=raw.url==null?null:String(raw.url);
  if(url){try{const u=new URL(url);if(u.protocol!=="https:"||u.username||u.password)reject("Use a credential-free HTTPS source URL");}catch{reject("Invalid source URL");}}
  return Object.freeze({id,title,content,scope,department:department||null,projectId:projectId||null,allowedAgentIds:Object.freeze([...recipients]),sourceType:type,citation,reviewedAt,url,approved:true});
}

function canAgentRead(doc,agent,context){
  if(doc.scope==="private")return false;
  if(doc.scope==="department"&&agent.department!==doc.department)return false;
  if(doc.scope==="project"&&(!context.projectId||doc.projectId!==context.projectId||!context.authorizedProjectIds?.includes(doc.projectId)))return false;
  return doc.allowedAgentIds.length===0||doc.allowedAgentIds.includes(agent.id);
}

function excerpt(content,queryTerms){
 const low=content.toLowerCase();
 const found=queryTerms.map(t=>low.indexOf(t)).filter(i=>i>=0);
 const at=found.length?Math.max(0,Math.min(...found)-90):0;
 return content.slice(at,at+380).replace(/\s+/g," ").trim();
}
function rankQuestion(question,agent){
 const q=terms(question),h=[agent.department,agent.specialty,...agent.skills].join(" ").toLowerCase();
 const matches=q.filter(t=>h.includes(t));
 const score=matches.length*3+(agent.isChief?0:0.15);
 return {score,matches};
}
export function createOfflineBrain({documents=[],roster=buildSyntheticRoster()}={}){
 if(!Array.isArray(documents)||documents.length>25000||!Array.isArray(roster))reject("Invalid offline corpus");
 const catalog=roster.map(a=>Object.freeze({...a,skills:Object.freeze([...(a.skills||[])])}));
 if(new Set(catalog.map(a=>a.id)).size!==catalog.length)reject("Duplicate agent identities");
 // Original, non-personal methodology is the ONLY knowledge included automatically.
 const sources=[...offlineKnowledgePacks(),...documents].map(normalizeDocument);
 if(new Set(sources.map(s=>s.id)).size!==sources.length)reject("Duplicate knowledge-source ids");
 const byId=new Map(catalog.map(a=>[a.id,a]));
 const find=(agentId,question,ctx={})=>{
   if(typeof question!=="string"||!question.trim())reject("Question required");
   const agent=byId.get(agentId);if(!agent)reject("Unknown agent ID");
   const t=terms(question);
   const results=sources.filter(d=>canAgentRead(d,agent,ctx)).map(d=>{
     const name=d.title.toLowerCase(),body=d.content.toLowerCase();
     const score=t.reduce((n,w)=>n+(name.includes(w)?5:0)+(body.includes(w)?1:0),0);
     return {doc:d,score};
   }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.doc.id.localeCompare(b.doc.id))
     .slice(0,clamp(ctx.limit??6,1,12))
     .map(({doc,score})=>({sourceId:doc.id,title:doc.title,citation:doc.citation,scope:doc.scope,sourceType:doc.sourceType,reviewedAt:doc.reviewedAt,score,excerpt:excerpt(doc.content,t)}));
   return Object.freeze({agentId,executed:false,modelUsed:null,providerCalls:0,productionWrites:0,results,coverage:results.length?"methodology/sources only":"no matching approved evidence",requiresHumanReview:true});
 };
 const route=(question,maxAgents=4)=>{
   if(typeof question!=="string"||!question.trim())reject("Question required");
   return catalog.filter(a=>!a.isChief).map(a=>({a,...rankQuestion(question,a)})).sort((a,b)=>b.score-a.score||a.a.sortOrder-b.a.sortOrder).slice(0,clamp(maxAgents,1,8)).map(({a,score,matches})=>({id:a.id,name:a.name,department:a.department,specialty:a.specialty,chiefId:a.chiefId,score,matches,synthetic:a.synthetic===true}));
 };
 const plan=(question,{projectId=null,authorizedProjectIds=[],maxAgents=4}={})=>{
   const candidates=route(question,maxAgents);
   const refs=candidates.map(a=>({agentId:a.id,...find(a.id,question,{projectId,authorizedProjectIds})}));
   return Object.freeze({mode:"OFFLINE_ONLY",question:clean(question,4000),agents:candidates,sourceResults:refs,status:"plan_only_no_generation",modelConnected:false,modelUsed:null,providerCalls:0,productionWrites:0,warnings:["No generative AI is connected.","Roster entries are synthetic placeholders, not recovered production identities.","Search results are references, not proof of truth or live web research.","No production database or private backup was accessed."]});
 };
 return Object.freeze({
   mode:"OFFLINE_ONLY",agentCount:catalog.length,chiefCount:catalog.filter(a=>a.isChief).length,documentCount:sources.length,
   departments:DEPARTMENTS.map(d=>d.name),roster:()=>catalog.map(a=>({...a,skills:[...a.skills]})),
   route,search:find,plan,
   addReviewedDocuments:newDocs=>createOfflineBrain({documents:[...documents,...newDocs],roster:catalog}),
 });
}
