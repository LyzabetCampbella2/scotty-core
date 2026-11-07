/**
 * Owner-only Creative Studio biography endpoint.
 * Read-only. Existing Worker bearer authentication must happen BEFORE this
 * handler. No model calls, tool actions, owner grants or social posting.
 * Disabled live links when SCOTTY_CREATIVE_BIOS_ENABLED is not explicitly true.
 */
import {creativeAgentBio} from './creative-agent-engine.mjs';
import {createCreativeD1Store,creativeD1Readiness} from './creative-agent-d1-store.mjs';
import {portfolioReadiness} from './agent-portfolio.mjs';

const ids=new Set(['chief-lumen','agent-creative-pulse','agent-creative-frame','agent-creative-iris']);
const projectPattern=/^[a-z0-9][a-z0-9-]{2,79}$/;
const headers={
 'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store',
 'x-content-type-options':'nosniff',
 'referrer-policy':'no-referrer'
};
const output=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
export const isCreativeBioPath=x=>x==='/api/creative-agent-bio'||x==='/api/creative-agent-directory';

export async function handleCreativeBio(req,env,url=new URL(req.url),ownerAuthenticated=false){
 if(!isCreativeBioPath(url.pathname))return output({error:'NOT_FOUND'},404);
 if(ownerAuthenticated!==true)return output({error:'OWNER_AUTH_REQUIRED'},401);
 if(req.method!=='GET')return output({error:'READ_ONLY_ENDPOINT'},405);
 if(url.pathname==='/api/creative-agent-directory'){
   if(url.search)return output({error:'QUERY_NOT_ALLOWED'},400);
   return output({mode:'PUBLIC_AGENT_DEVELOPMENT_DIRECTORY',
     profiles:[...ids].map(creativeAgentBio),
     configuredBackend:false,liveAgents:false,
     realAssignmentVisibility:false,modelCalls:0,memoryWrites:0});
 }
 const params=[...url.searchParams.keys()];
 if(params.length!==2||!params.includes('agentId')||!params.includes('projectId'))
   return output({error:'INVALID_BIO_QUERY'},400);
 const agentId=url.searchParams.get('agentId');
 const projectId=url.searchParams.get('projectId');
 if(!ids.has(agentId)||!projectPattern.test(projectId||''))
   return output({error:'INVALID_AGENT_OR_PROJECT'},400);
 const profile=creativeAgentBio(agentId);
 const inactive={
   mode:'PUBLIC_BIO_ONLY',
   profile,selectedProjectId:projectId,
   realProjectMembershipVerified:false,privateMemoryConnected:false,
   missionExecutionConnected:false,activity:[],projectAssignments:[],
   publishedPosts:0,modelCalls:0,memoryWrites:0,
   note:'No authorized project and runtime records were loaded. Draft profile only.'
 };
 if(env?.SCOTTY_CREATIVE_BIOS_ENABLED!=='true')return output(inactive);
 const raw=env?.SCOTTY_CREATIVE_PROJECT_ALLOWLIST;
 const allow=typeof raw==='string'?raw.split(',').map(s=>s.trim()):[];
 if(allow.length<1||allow.length>20||new Set(allow).size!==allow.length||
   allow.some(x=>!projectPattern.test(x))||!allow.includes(projectId))
   return output({error:'OWNER_PROJECT_SCOPE_REQUIRED'},403);
 try{
   const db=env?.BRAIN_DB;
   const [portfolio,creative]=await Promise.all([
     portfolioReadiness(db),creativeD1Readiness(db)
   ]);
   if(portfolio.ready!==true||creative.ready!==true)
     return output({...inactive,mode:'DATABASE_MIGRATION_REQUIRED',
       note:'Isolated project and creative runtime schemas must be applied and reviewed first.'});
   const project=await db.prepare(
     'SELECT id FROM agent_projects WHERE id=? LIMIT 1'
   ).bind(projectId).first();
   if(!project)return output({error:'UNKNOWN_OWNER_PROJECT'},404);
   const membership=await db.prepare(
     'SELECT agent_id FROM agent_project_links WHERE agent_id=? AND project_id=? LIMIT 1'
   ).bind(agentId,projectId).first();
   if(!membership)return output({...inactive,mode:'NO_VERIFIED_AGENT_PROJECT_MEMBERSHIP',
     note:'No owner-authorized agent project membership is stored. Do not represent proposals as assignments.'});
   const store=createCreativeD1Store(db);
   const activity=await store.biographyActivity({agentId,projectId,includeResult:false});
   return output({mode:'OWNER_SCOPED_CREATIVE_BIO',
     profile,selectedProjectId:projectId,
     realProjectMembershipVerified:true,
     projectAssignments:[{projectId,agentId,source:'isolated-d1-verified-link'}],
     activity,privateMemoryConnected:false,
     missionExecutionConnected:false,publishedPosts:0,
     modelCalls:0,memoryWrites:0,
     note:'Activity metadata from isolated D1 only. No private memory text or model results included.'});
 }catch{
   return output({error:'CREATIVE_BIO_DATABASE_UNAVAILABLE'},503);
 }
}
