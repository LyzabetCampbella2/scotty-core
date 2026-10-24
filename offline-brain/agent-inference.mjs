/**
 * SCOTTY independent brain, Phase 4.
 * Explicit opt-in local generation grounded in owner-reviewed knowledge.
 * No network access except an independently enabled loopback-only model adapter.
 *
 * This is NOT a production authorization boundary. Local caller owns the chosen
 * store and project grants; no SCOTTY Core / Render / Groq integration exists.
 */
import {buildSyntheticRoster} from "./catalog.mjs";
import {createLocalReasoner} from "./local-reasoner.mjs";

const byId=new Map(buildSyntheticRoster().map(a=>[a.id,a]));
const safeId=s=>typeof s==="string"&&/^[a-z0-9._:-]{1,160}$/i.test(s);
const citationNumbers=text=>[...String(text).matchAll(/\[Source\s+(\d+)\]/gi)].map(m=>Number(m[1]));
function assert(condition,message){if(!condition)throw Error(message);}
function questionOK(s){assert(typeof s==="string"&&s.trim()&&s.length<=4000,"Question must be 1 to 4000 characters");}
function scope(context){
  if(context==null)return {};
  assert(context&&typeof context==="object"&&!Array.isArray(context),"Invalid project context");
  const projectId=context.projectId??null;
  const allowed=context.authorizedProjectIds??[];
  assert(projectId===null||safeId(projectId),"Invalid project id");
  assert(Array.isArray(allowed)&&allowed.length<=30&&allowed.every(safeId),"Invalid project authorization list");
  // Owner-controlled local-only workflow: passing ids here is NOT proof
  // of live SCOTTY authentication.
  return {projectId,authorizedProjectIds:[...new Set(allowed)],limit:12};
}
function evaluateLocalDraft(answer,sourceIds){
  const cited=[...new Set(citationNumbers(answer))].sort((a,b)=>a-b);
  const invalid=cited.filter(n=>!Number.isInteger(n)||n<1||n>sourceIds.length);
  const missing=sourceIds.length>0&&cited.length===0;
  const conclusions=[];
  if(invalid.length)conclusions.push("unknown citations: "+invalid.join(", "));
  if(missing)conclusions.push("no source citations in generated text");
  return Object.freeze({
    validCitationNumbers:cited.filter(n=>n>=1&&n<=sourceIds.length),
    invalidCitationNumbers:invalid,
    citedSourceIds:cited.filter(n=>n>=1&&n<=sourceIds.length).map(n=>sourceIds[n-1]),
    missingCitations:missing,
    verdict:invalid.length||missing?"requires_citation_review":"requires_factual_review",
    verifiedFactualAccuracy:false,
    warnings:conclusions
  });
}
export function createAgentInference({
  store,
  reasoner=createLocalReasoner(),
  clock=()=>new Date()
}={}){
 assert(store&&typeof store.search==="function","Private knowledge store required");
 assert(reasoner&&reasoner.config?.host==="127.0.0.1"&&reasoner.config?.groqConnected===false&&reasoner.config?.grokConnected===false,
  "Loopback-only reasoner required; no Groq/Grok adapters allowed");
 assert(typeof reasoner.ask==="function"&&typeof reasoner.preview==="function","Local reasoner required");
 async function preview({agentId,question,context={}}={}){
  assert(safeId(agentId)&&byId.has(agentId),"Known synthetic agent ID required");
  questionOK(question);
  const agent=byId.get(agentId);
  const results=await store.search(agentId,question,scope(context));
  assert(Array.isArray(results.results),"Unexpected scoped knowledge result");
  // Phase 1 guides are helpful routing instructions, not externally
  // reviewed factual source materials. Never pass them as evidence.
  const sources=results.results
    .filter(r=>typeof r.sourceId==="string"&&!r.sourceId.startsWith("department-")&&!r.sourceId.startsWith("profile-"))
    .slice(0,8).map(r=>({sourceId:r.sourceId,title:r.title,citation:r.citation,excerpt:r.excerpt}));
  const base=reasoner.preview({agentId,question,evidence:sources});
  return Object.freeze({
    status:sources.length?"EVIDENCE_READY":"NO_APPROVED_DOMAIN_EVIDENCE",
    agent:{id:agent.id,department:agent.department,specialty:agent.specialty,chiefId:agent.chiefId,synthetic:true},
    scope:context?.projectId?"owner-supplied-project-scope":"department-shared-and-approved",
    model:reasoner.config.model,
    localModelEnabled:reasoner.config.mode==="LOCAL_ONLY_EXPLICIT",
    sourceCount:sources.length,
    sources:base.sources,
    citations:base.sourceIds,
    providerCalls:0,productionWrites:0,
    caution:"Preview is owner-local. Scope supplied by caller is not authenticated production authorization."
  });
 }
 async function answer({agentId,question,context={},ownerApproved=false}={}){
  const p=await preview({agentId,question,context});
  assert(reasoner.config.mode==="LOCAL_ONLY_EXPLICIT"&&!!reasoner.config.model,"LOCAL_MODEL_DISABLED: opt into an installed local model");
  assert(ownerApproved===true,"OWNER_APPROVAL_REQUIRED: independently approve this local response");
  assert(p.sourceCount>0,"NO_APPROVED_DOMAIN_EVIDENCE: obtain approved, dated field knowledge before generating a grounded answer");
  const reply=await reasoner.ask({agentId,question,evidence:p.sources,allowLocalKnowledgeAccess:true});
  assert(reply&&reply.mode==="LOCAL_ONLY"&&reply.unverifiedModelDraft===true&&reply.productionWrites===0&&reply.groqCalls===0&&reply.grokCalls===0,
   "Model adapter safety claim missing");
  const evaluated=evaluateLocalDraft(reply.answer,p.citations);
  return Object.freeze({
    status:"UNVERIFIED_LOCAL_DRAFT",model:reply.modelUsed,
    agent:p.agent,answer:reply.answer,sourceIds:p.citations,evaluation:evaluated,
    generatedAt:clock().toISOString(),modelConnectedToGroq:false,
    requiresOwnerReview:true,automaticPublication:false,
    automaticMemoryTraining:false,automaticToolExecution:false,
    productionWrites:0,groqCalls:0,grokCalls:0
  });
 }
 return Object.freeze({
   state:{status:reasoner.config.mode==="LOCAL_ONLY_EXPLICIT"?"OWNER_OPT_IN_LOCAL_MODEL":"DISCONNECTED",
     model:reasoner.config.model,agentCount:byId.size,
     groqConnected:false,grokConnected:false,productionConnected:false},
   preview,answer
 });
}
export {evaluateLocalDraft};
