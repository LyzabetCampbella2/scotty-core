/**
 * SCOTTY isolated Worker lab — gated owner plan-preview review HTTP API.
 * NOT an Activepieces bridge route; separate OWNER_BEARER_TOKEN authentication
 * happens in worker.mjs BEFORE this handler is called. Disabled by default.
 *
 * This API only stores and reads preview-review metadata, never grants
 * execution, publishes agent messages, reads private memories or runs AI.
 *
 * Server-side trust inputs:
 *   SCOTTY_PREVIEW_REVIEWS_ENABLED='true' (default OFF)
 *   SCOTTY_REVIEW_OWNER_ID (stable authenticated lab owner)
 *   SCOTTY_REVIEW_PROJECT_ALLOWLIST (comma-separated IDs, max 20)
 *   BRAIN_DB (isolated D1 with portfolio+review schema and real agent_project_links)
 *
 * No client-supplied actor, project object, scopes or authorization flags
 * are trusted. Do not deploy without independent owner approval and QA.
 */
import {
 createOwnerPreviewReview,decideOwnerPreviewReview,readOwnerPreviewReview
} from './activepieces-review-store.mjs';
import {reviewLedgerReadiness} from './activepieces-review-readiness.mjs';
import {portfolioReadiness} from './agent-portfolio.mjs';
import {connectedRoster} from './connected-roster.mjs';

const rosterIds=new Set(connectedRoster().map(a=>a.id));
const ident=/^[a-z0-9][a-z0-9_-]{3,79}$/i;
const digest=/^[a-f0-9]{64}$/;
const headers={
 'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store',
 'x-content-type-options':'nosniff',
 'referrer-policy':'no-referrer',
 'x-frame-options':'DENY'
};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
const error=(code,status=400)=>json({ok:false,error:code,canExecute:false},status);
const paths=new Set(['/api/owner-preview-reviews','/api/owner-preview-reviews/decision']);
export const isOwnerPreviewReviewPath=path=>paths.has(path);

function serverOwner(env){
 const ownerId=env?.SCOTTY_REVIEW_OWNER_ID;
 const raw=env?.SCOTTY_REVIEW_PROJECT_ALLOWLIST;
 if(typeof ownerId!=='string'||!ident.test(ownerId)||typeof raw!=='string'||raw.length>1600)
  throw Error('OWNER_REVIEW_CONFIG_MISSING');
 const entries=raw.split(',').map(s=>s.trim());
 if(entries.length<1||entries.length>20||new Set(entries).size!==entries.length||
    entries.some(p=>!ident.test(p)))throw Error('OWNER_REVIEW_PROJECT_ALLOWLIST_INVALID');
 return {ownerId,projects:entries};
}
async function parseBody(req,allowed){
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
  throw Error('JSON_REQUIRED');
 const size=Number(req.headers.get('content-length')||'0');
 if(!Number.isFinite(size)||size>1600)throw Error('BODY_TOO_LARGE');
 const raw=await req.text();
 if(raw.length<1||raw.length>1600)throw Error('BODY_TOO_LARGE');
 let body;try{body=JSON.parse(raw);}catch{throw Error('INVALID_JSON');}
 if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).some(k=>!allowed.has(k)))throw Error('UNEXPECTED_REVIEW_FIELD');
 return body;
}
const newReviewKeys=new Set([
 'requestId','projectId','missionId','revision','intentDigest','agentIds',
 'idempotencyKey','scope','expiresAt','classification','containsPrivateData','paidProviderRequested'
]);
const decisionKeys=new Set(['requestId','revision','intentDigest','expectedVersion','decision','confirmed']);
async function projectContext(db,projectId,owner){
 if(!owner.projects.includes(projectId))throw Error('PROJECT_NOT_ALLOWED_FOR_LAB_OWNER');
 const result=await db.prepare('SELECT id FROM agent_projects WHERE id=? LIMIT 1').bind(projectId).first();
 if(!result||result.id!==projectId)throw Error('PROJECT_NOT_IN_ISOLATED_DB');
 const links=await db.prepare(
  'SELECT agent_id FROM agent_project_links WHERE project_id=? ORDER BY agent_id LIMIT 100'
 ).bind(projectId).all();
 const ids=(links?.results||[]).map(x=>x.agent_id);
 if(!ids.length||ids.length>8||new Set(ids).size!==ids.length||
    ids.some(x=>!rosterIds.has(x)))throw Error('PROJECT_AGENT_LINKS_NOT_VERIFIED');
 return {origin:'scotty-server-project-store',id:projectId,active:true,allowedAgentIds:ids};
}
function trustedActor(owner){
 return {authenticated:true,verifiedByScotty:true,
  provenance:'scotty-server-side-session',role:'owner',
  ownerId:owner.ownerId,allowedProjects:owner.projects};
}
async function storedProjectId(db,requestId){
 if(!ident.test(requestId||''))throw Error('INVALID_REVIEW_ID');
 const row=await db.prepare(
  'SELECT project_id FROM scotty_activepieces_review_requests_v1 WHERE request_id=? LIMIT 1'
 ).bind(requestId).first();
 if(!row||!ident.test(row.project_id||''))throw Error('REVIEW_REQUEST_NOT_FOUND');
 return row.project_id;
}
function normalizeError(e){
 const value=String(e?.message||'OWNER_REVIEW_OPERATION_FAILED');
 const code=/^[A-Z0-9_]{3,100}$/.test(value)?value:'OWNER_REVIEW_OPERATION_FAILED';
 const status=code==='REVIEW_REQUEST_NOT_FOUND'?404:
  /CONFLICT|IDEMPOTENCY|ILLEGAL_REVIEW_TRANSITION/.test(code)?409:
  /OWNER_REVIEW_D1_MIGRATION_REQUIRED|TRANSACTION_FAILED|READBACK_FAILED|AUDIT_/.test(code)?503:
  /PROJECT_NOT_ALLOWED|OWNER_MISMATCH|MEMBERSHIP_REQUIRED|VERIFIED_OWNER|PROJECT_AGENT_LINKS_NOT_VERIFIED/.test(code)?403:400;
 return error(code,status);
}
export async function handleOwnerPreviewReview(req,env,url=new URL(req.url),authenticatedOwner=false){
 if(!isOwnerPreviewReviewPath(url.pathname))return error('NOT_FOUND',404);
 if(env?.SCOTTY_PREVIEW_REVIEWS_ENABLED!=='true')return error('OWNER_PREVIEW_REVIEWS_DISABLED',503);
 // This boolean is set ONLY by worker.mjs following its existing owner bearer
 // auth. Never route this module through the separate Activepieces bridge.
 if(authenticatedOwner!==true)return error('OWNER_AUTH_REQUIRED',401);
 if(url.search&&!(url.pathname==='/api/owner-preview-reviews'&&req.method==='GET'))
  return error('QUERY_NOT_ALLOWED',400);
 if(!['GET','POST'].includes(req.method))return error('METHOD_NOT_ALLOWED',405);
 if(req.method==='GET'&&url.pathname!== '/api/owner-preview-reviews')
  return error('METHOD_NOT_ALLOWED',405);
 if(req.method==='POST'&&url.pathname==='/api/owner-preview-reviews/decision'&&!env.BRAIN_DB)
  return error('REVIEW_DATABASE_UNAVAILABLE',503);
 try{
  const owner=serverOwner(env);
  const db=env?.BRAIN_DB;
  const [ledger,portfolio]=await Promise.all([
    reviewLedgerReadiness(db),portfolioReadiness(db)
  ]);
  if(!ledger.ready||!portfolio.ready)return error('REVIEW_OR_PORTFOLIO_MIGRATION_REQUIRED',503);
  const actor=trustedActor(owner);
  if(req.method==='GET'){
   const keys=[...url.searchParams.keys()];
   if(keys.length!==1||keys[0]!=='requestId')return error('INVALID_REVIEW_QUERY',400);
   const requestId=url.searchParams.get('requestId');
   const projectId=await storedProjectId(db,requestId);
   const project=await projectContext(db,projectId,owner);
   return json({ok:true,...await readOwnerPreviewReview(db,{actor,project,requestId})});
  }
  if(url.search)return error('QUERY_NOT_ALLOWED',400);
  if(url.pathname==='/api/owner-preview-reviews'){
   const proposal=await parseBody(req,newReviewKeys);
   if(!ident.test(proposal.projectId||'')||
     !Array.isArray(proposal.agentIds)||proposal.agentIds.some(x=>!rosterIds.has(x)))
     return error('INVALID_STAGED_AGENT_PROPOSAL',400);
   const project=await projectContext(db,proposal.projectId,owner);
   return json({ok:true,...await createOwnerPreviewReview(db,{actor,project,proposal})},201);
  }
  const body=await parseBody(req,decisionKeys);
  if(!ident.test(body.requestId||'')||!digest.test(body.intentDigest||''))
   return error('INVALID_REVIEW_DECISION',400);
  const projectId=await storedProjectId(db,body.requestId);
  const project=await projectContext(db,projectId,owner);
  return json({ok:true,...await decideOwnerPreviewReview(db,{actor,project,...body})});
 }catch(e){return normalizeError(e);}
}
