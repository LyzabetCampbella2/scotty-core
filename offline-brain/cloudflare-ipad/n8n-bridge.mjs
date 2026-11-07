/**
 * Read-only n8n discovery adapter for the isolated Cloudflare brain lab.
 *
 * No owner bearer reuse, AI inference, memory reads, D1 writes, agent execution,
 * mission approval, production calls, or personal project content.
 * Separate staging deployment and explicit owner activation are required.
 */
import {connectedRoster} from './connected-roster.mjs';
import {planAssignment} from './team-expansion.mjs';

const roster=connectedRoster();
const HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer'
};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const fail=(error,status)=>reply({ok:false,error},status);
const idFormat=/^[A-Za-z0-9._~-]{32,200}$/;

export function isN8nBridgePath(path){
  return path==='/api/n8n'||path.startsWith('/api/n8n/');
}
function constantTimeEquals(provided,secret){
  if(typeof provided!=='string'||typeof secret!=='string'||!idFormat.test(provided)||!idFormat.test(secret)||provided.length!==secret.length)return false;
  let diff=0;
  for(let i=0;i<secret.length;i++)diff|=provided.charCodeAt(i)^secret.charCodeAt(i);
  return diff===0;
}
function authorized(request,env){
  const secret=env?.N8N_BRIDGE_TOKEN;
  if(!idFormat.test(secret||'')||secret===env?.OWNER_BEARER_TOKEN)return false;
  return constantTimeEquals(request.headers.get('x-scotty-n8n-token'),secret);
}
function agentSummary(agent){
  return {
    id:agent.id,
    name:agent.name,
    department:agent.department,
    specialty:agent.specialty,
    chiefId:agent.chiefId,
    isChief:agent.isChief,
    skills:Array.isArray(agent.brain?.expertise?.skills)?agent.brain.expertise.skills.slice(0,15):[]
  };
}
async function validatedPlanBody(request){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('JSON_REQUIRED');
  if(Number(request.headers.get('content-length')||0)>1200)throw Error('BODY_TOO_LARGE');
  const raw=await request.text();
  if(raw.length>1200)throw Error('BODY_TOO_LARGE');
  let body;
  try{body=JSON.parse(raw)}catch{throw Error('INVALID_JSON')}
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>k!=='question'))throw Error('QUESTION_ONLY');
  if(typeof body.question!=='string'||!body.question.trim()||body.question.length>500)throw Error('INVALID_QUESTION');
  return body.question.trim();
}
export async function handleN8nBridge(request,env,url=new URL(request.url)){
  if(!isN8nBridgePath(url.pathname))return fail('NOT_FOUND',404);
  if(env?.SCOTTY_N8N_BRIDGE_ENABLED!=='true')return fail('BRIDGE_DISABLED',503);
  if(!authorized(request,env))return fail('UNAUTHORIZED',401);
  if(url.search) return fail('QUERY_PARAMETERS_NOT_SUPPORTED',400);
  if(url.pathname==='/api/n8n/catalog'){
    if(request.method!=='GET')return fail('METHOD_NOT_ALLOWED',405);
    return reply({ok:true,mode:'READ_ONLY',agentCount:roster.length,
      chiefCount:roster.filter(a=>a.isChief).length,
      specialistCount:roster.filter(a=>!a.isChief).length,
      rosterVerifiedLive:false,agents:roster.map(agentSummary),
      note:'Development roster only. No live identity sync or private knowledge access.'});
  }
  if(url.pathname==='/api/n8n/plan'){
    if(request.method!=='POST')return fail('METHOD_NOT_ALLOWED',405);
    let question;
    try{question=await validatedPlanBody(request)}
    catch(e){return fail(e?.message||'INVALID_REQUEST',400)}
    const plan=planAssignment(roster,question,{maxAgents:4});
    return reply({ok:true,mode:'READ_ONLY',status:'ROUTING_PREVIEW_ONLY',
      chiefs:plan.chiefIds||[],
      agents:(plan.assignments||[]).map(a=>({
        agentId:a.agentId,
        chiefId:a.chiefId,
        score:a.score,
        name:roster.find(x=>x.id===a.agentId)?.name||a.agentId
      })),
      inferenceCalls:0,memoryReads:0,memoryWrites:0,missionsStarted:0,
      ownerApprovalRequiredForExecution:true});
  }
  return fail('NOT_FOUND',404);
}
