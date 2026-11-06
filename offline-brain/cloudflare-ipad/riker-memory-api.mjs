import {rikerMemoryReady,proposeStoredRikerMemory,decideStoredRikerMemory,recallStoredRikerMemory,forgetStoredRikerMemory} from './riker-memory-store.mjs';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export const isRikerRoute=p=>['/api/riker/memory','/api/riker/memory/review','/api/riker/memory/delete'].includes(p);
export async function rikerRoute(request,env,url,ownerVerified){
 if(!ownerVerified)return reply({error:'OWNER_REQUIRED'},401);
 if(!env?.BRAIN_DB)return reply({error:'DATABASE_UNAVAILABLE'},503);
 if(url.search)return reply({error:'UNEXPECTED_QUERY'},400);
 if(!(await rikerMemoryReady(env.BRAIN_DB)).ready)return reply({error:'MIGRATION_REQUIRED'},503);
 const ctx={ownerVerified:true,authorizedProjectIds:[]};
 try{
  if(url.pathname==='/api/riker/memory'&&request.method==='GET')return reply({notes:await recallStoredRikerMemory(env.BRAIN_DB,ctx)});
  if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON_REQUIRED'},400);
  const body=await request.text();
  if(body.length>2500)return reply({error:'BODY_TOO_LARGE'},413);
  const input=JSON.parse(body);
  if(!input||Array.isArray(input)||typeof input!=='object')return reply({error:'INVALID_BODY'},400);
  if(url.pathname==='/api/riker/memory')return reply(await proposeStoredRikerMemory(env.BRAIN_DB,input,ctx),201);
  if(url.pathname==='/api/riker/memory/review')return reply(await decideStoredRikerMemory(env.BRAIN_DB,input.id,input.decision,ctx));
  if(url.pathname==='/api/riker/memory/delete')return reply(await forgetStoredRikerMemory(env.BRAIN_DB,input.id,ctx));
 }catch{return reply({error:'RIKER_OPERATION_FAILED'},400);}
 return reply({error:'NOT_FOUND'},404);
}
