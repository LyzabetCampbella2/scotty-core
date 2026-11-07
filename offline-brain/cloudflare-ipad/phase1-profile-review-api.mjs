/**
 * Read-only owner lab endpoint for Phase 1 brain review status.
 * Source-wired to the ISOLATED Worker, NOT deployed. Existing owner bearer
 * authentication must run before this handler. No create/approve/revoke route.
 *
 * Only secret-free ledger status is returned; never patches or private memory.
 * A review marked "approved" is not an active profile and grants no tools.
 */
import {connectedRoster} from './connected-roster.mjs';
import {
 phase1ProfileLedgerReadiness,readPhase1ProfileReview
} from './phase1-profile-review-store.mjs';

const ownerIds=Object.freeze(connectedRoster().map(x=>x.id));
const ident=/^[a-z0-9][a-z0-9_-]{3,99}$/i;
const heads={
 'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store',
 'x-frame-options':'DENY',
 'x-content-type-options':'nosniff',
 'referrer-policy':'no-referrer'
};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:heads});
const paths=new Set([
 '/api/phase1/brain-review-readiness',
 '/api/phase1/brain-review'
]);
export const isPhase1BrainReviewPath=path=>paths.has(path);

export async function handlePhase1BrainReview(
 request,env,url=new URL(request.url),ownerAuthenticated=false
){
 const path=url.pathname;
 if(!paths.has(path))return json({error:'NOT_FOUND',canExecute:false},404);
 if(ownerAuthenticated!==true)
   return json({error:'OWNER_AUTH_REQUIRED',canExecute:false},401);
 if(request.method!=='GET')
   return json({error:'READ_ONLY_ENDPOINT',canExecute:false},405);
 if(path==='/api/phase1/brain-review-readiness'){
   if(url.search)return json({error:'QUERY_NOT_ALLOWED',canExecute:false},400);
   const readiness=await phase1ProfileLedgerReadiness(env?.BRAIN_DB);
   return json({
    status:readiness.ready?'ISOLATED_SCHEMA_READY':'SCHEMA_NOT_READY',
    schemaReady:readiness.ready,
    reason:readiness.reason,
    readFeatureEnabled:env?.SCOTTY_PHASE1_REVIEW_READ_ENABLED==='true',
    canExecute:false,canActivate:false,approvedProfilesActivated:0,
    ownerAcceptanceComplete:false,
    note:'Read-only status; no profile review decision or runtime promotion is available here.'
   });
 }
 const keys=[...url.searchParams.keys()];
 if(keys.length!==1||keys[0]!=='requestId')
   return json({error:'INVALID_REVIEW_QUERY',canExecute:false},400);
 const requestId=url.searchParams.get('requestId');
 if(!ident.test(requestId||''))
   return json({error:'INVALID_REVIEW_ID',canExecute:false},400);
 if(env?.SCOTTY_PHASE1_REVIEW_READ_ENABLED!=='true')
   return json({error:'REVIEW_READ_FEATURE_DISABLED',canExecute:false},403);
 const ownerId=env?.SCOTTY_PHASE1_REVIEW_OWNER_ID;
 if(typeof ownerId!=='string'||!ident.test(ownerId))
   return json({error:'OWNER_ID_NOT_CONFIGURED',canExecute:false},503);
 const readiness=await phase1ProfileLedgerReadiness(env?.BRAIN_DB);
 if(!readiness.ready)return json({
   error:readiness.reason||'REVIEW_SCHEMA_NOT_READY',canExecute:false
 },503);
 const serverActor={
  authenticated:true,verifiedByScotty:true,
  provenance:'scotty-server-side-session',
  role:'owner',ownerId,allowedAgentIds:[...ownerIds]
 };
 try{
  const read=await readPhase1ProfileReview(env.BRAIN_DB,{actor:serverActor,requestId});
  return json({
   ...read,mode:'OWNER_READ_ONLY_PHASE1_PROFILE_REVIEW',
   patchContentExposed:false,privateMemoryExposed:false,
   canActivate:false,modelBehaviorCertified:false
  });
 }catch(e){
  const reason=String(e?.message||'REVIEW_STATUS_UNAVAILABLE');
  if(reason==='PROFILE_REVIEW_NOT_FOUND')return json({error:reason,canExecute:false},404);
  if(reason.includes('OWNER')||reason.includes('SCOPE'))
   return json({error:'REVIEW_ACCESS_DENIED',canExecute:false},403);
  return json({error:'REVIEW_STATUS_UNAVAILABLE',canExecute:false},503);
 }
}
