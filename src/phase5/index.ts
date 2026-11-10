/** Explicitly disabled by default. Staging-only, owner-read-only Phase 5 view.
 * Never uses the preexisting production DATABASE_URL/admin token. No mutation routes.
 */
import { IdentityDenied, requireOwnerJwt, type IdentityConfig } from './identity.ts';

export type Phase5PreviewLoader = {
  portfolio(projectId:string):Promise<unknown>;
  biography(projectId:string,agentId:string):Promise<unknown>;
};
const id=/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
function response(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function envConfig():IdentityConfig {return {
  issuer:process.env.SCOTTY_PHASE5_OIDC_ISSUER||'',
  audience:process.env.SCOTTY_PHASE5_OIDC_AUDIENCE||'',
  ownerSubject:process.env.SCOTTY_PHASE5_OWNER_SUB||'',
  publicKeyPem:process.env.SCOTTY_PHASE5_OIDC_PUBLIC_KEY_PEM||'',
  keyId:process.env.SCOTTY_PHASE5_OIDC_KID||''
};}
export async function handlePhase5(req:Request,url:URL,loader?:Phase5PreviewLoader):Promise<Response>{
  if(process.env.SCOTTY_ENV!=='staging'||process.env.SCOTTY_PHASE5_STAGING_ENABLED!=='true'||
     process.env.SCOTTY_PHASE5_READ_ONLY!=='true')return response({ok:false,error:'phase5_disabled'},503);
  if(req.method!=='GET')return response({ok:false,error:'method_not_allowed'},405);
  if(req.headers.get('origin')!==null||req.headers.get('cookie')!==null)return response({ok:false,error:'browser_credentials_disabled'},403);
  if(req.headers.get('authorization')?.includes(',')||req.headers.get('authorization')?.includes('\n'))return response({ok:false,error:'unauthorized'},401);
  try{requireOwnerJwt(req.headers.get('authorization'),envConfig());}
  catch(e){if(e instanceof IdentityDenied)return response({ok:false,error:'unauthorized'},401);return response({ok:false,error:'unauthorized'},401);}
  const q=url.searchParams;
  const projectIds=q.getAll('projectId');
  if(projectIds.length!==1||!id.test(projectIds[0])||[...q.keys()].some(k=>k!=='projectId'))return response({ok:false,error:'invalid_scope'},400);
  const projectId=projectIds[0];
  const match=url.pathname.match(/^\/api\/phase5\/agents\/([^/]+)\/biography$/);
  if(url.pathname!=='/api/phase5/owner/portfolio'&&!match)return response({ok:false,error:'not_found'},404);
  if(match&&!id.test(match[1]))return response({ok:false,error:'invalid_scope'},400);
  try{
    // Delay connecting to staging DB until after all identity and scope checks.
    if(!loader)loader=(await import('./staging-preview.ts')).stagingPreview;
    const data=match?await loader.biography(projectId,match[1]):await loader.portfolio(projectId);
    return response({ok:true,projectId,data});
  }catch{return response({ok:false,error:'staging_unavailable'},503);}
}
