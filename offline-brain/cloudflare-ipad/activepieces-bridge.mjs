/**
 * Activepieces Cloud discovery bridge for SCOTTY's isolated development brain lab.
 * Disabled by default; read-only metadata and deterministic recommendations.
 * No memory, AI inference, mission execution, project records or external writes.
 */
import {connectedRoster} from './connected-roster.mjs';
import {planAssignment} from './team-expansion.mjs';
import {reviewLedgerReadiness} from './activepieces-review-readiness.mjs';

const agents=connectedRoster();
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const error=(code,status)=>json({ok:false,error:code},status);
const tokenPattern=/^[A-Za-z0-9._~-]{32,200}$/;
export const isActivepiecesPath=(path)=>path==='/api/activepieces'||path.startsWith('/api/activepieces/');
function sameToken(a,b){
  if(typeof a!=='string'||typeof b!=='string'||!tokenPattern.test(a)||!tokenPattern.test(b)||a.length!==b.length)return false;
  let mismatch=0;
  for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);
  return mismatch===0;
}
const auth=(req,env)=>{
  const key=env?.ACTIVEPIECES_BRIDGE_TOKEN;
  return tokenPattern.test(key||'')&&key!==env?.OWNER_BEARER_TOKEN&&sameToken(req.headers.get('x-scotty-activepieces-token'),key);
};
const summary=a=>({id:a.id,name:a.name,isChief:a.isChief,department:a.department,
 specialty:a.specialty,chiefId:a.chiefId,skills:Array.isArray(a.brain?.expertise?.skills)?a.brain.expertise.skills.slice(0,12):[]});
async function question(req){
  if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('JSON_REQUIRED');
  if(Number(req.headers.get('content-length')||0)>1200)throw Error('BODY_TOO_LARGE');
  const raw=await req.text();
  if(raw.length>1200)throw Error('BODY_TOO_LARGE');
  let body;try{body=JSON.parse(raw)}catch{throw Error('INVALID_JSON')}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='question'))throw Error('QUESTION_ONLY');
  if(typeof body.question!=='string'||!body.question.trim()||body.question.length>500)throw Error('INVALID_QUESTION');
  return body.question.trim();
}
export async function handleActivepieces(req,env,url=new URL(req.url)){
  if(!isActivepiecesPath(url.pathname))return error('NOT_FOUND',404);
  if(env?.SCOTTY_ACTIVEPIECES_ENABLED!=='true')return error('BRIDGE_DISABLED',503);
  if(!auth(req,env))return error('UNAUTHORIZED',401);
  if(url.search)return error('QUERY_NOT_ALLOWED',400);
  if(url.pathname==='/api/activepieces/catalog'){
    if(req.method!=='GET')return error('METHOD_NOT_ALLOWED',405);
    return json({ok:true,mode:'READ_ONLY',source:'isolated-development-roster',
      liveRosterVerified:false,count:agents.length,chiefs:agents.filter(a=>a.isChief).length,
      specialists:agents.filter(a=>!a.isChief).length,agents:agents.map(summary),
      disclosure:'Authored development profiles only; not separately executed or verified agents.'});
  }
  if(url.pathname==='/api/activepieces/plan'){
    if(req.method!=='POST')return error('METHOD_NOT_ALLOWED',405);
    let text;try{text=await question(req)}catch(e){return error(e?.message||'INVALID_BODY',400)}
    const suggested=planAssignment(agents,text,{maxAgents:4});
    return json({ok:true,mode:'READ_ONLY',status:'PROPOSAL_ONLY',
      chiefs:suggested.chiefIds||[],
      agents:(suggested.assignments||[]).map(a=>({agentId:a.agentId,chiefId:a.chiefId,
        name:agents.find(x=>x.id===a.agentId)?.name||a.agentId,score:a.score})),
      aiCalls:0,memoryReads:0,memoryWrites:0,missionsStarted:0,
      changesToProjects:0,ownerApprovalNeededForExecution:true});
  }
  if(url.pathname==='/api/activepieces/review-readiness'){
    if(req.method!=='GET')return error('METHOD_NOT_ALLOWED',405);
    const state=await reviewLedgerReadiness(env?.BRAIN_DB);
    return json({ok:true,mode:'READ_ONLY',type:'REVIEW_SCHEMA_READINESS',
      ...state,workerBridgeActive:true,
      ownerSessionVerified:false,projectMembershipVerified:false,
      approvalsVerified:0,canExecute:false,
      note:'Optional isolated D1 ledger SCHEMA status only. This is not an owner approval or a mission execution endpoint.'});
  }
  return error('NOT_FOUND',404);
}
