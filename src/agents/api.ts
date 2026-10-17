import { createBrain,getBrain,listBrains,listMemories,listProposals,propose,review } from "./store.ts";
import type { Actor,Scope } from "./brain.ts";
const scopes=["private","project","department","network"];
const validId=(v:unknown)=>typeof v==="string"&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(v);
const validText=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.length<=max;
const validSources=(v:unknown)=>Array.isArray(v)&&v.length<=50&&v.every(x=>typeof x==="string"&&x.length<=2048);
function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});}
export async function handleAgents(req:Request,u:URL):Promise<Response>{
 const token=process.env.SCOTTY_BRAIN_ADMIN_TOKEN;
 if(!token)return json({ok:false,error:"Brain API disabled until admin token is configured"},503);
 const auth=req.headers.get("authorization");
 const direct=auth===`Bearer ${token}`;
 const session=process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
 const cookie=req.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith("scotty_owner_session="))?.slice("scotty_owner_session=".length);
 const viaCookie=Boolean(session&&cookie===session);
 if(!direct&&!viaCookie)return json({ok:false,error:"Unauthorized"},401);
 if(viaCookie&&req.method!=="GET"){
  const origin=req.headers.get("origin");
  if(!origin||origin!==u.origin)return json({ok:false,error:"Cross-origin write blocked"},403);
  if(req.headers.get("x-scotty-csrf")!=="1")return json({ok:false,error:"CSRF header required"},403);
 }
 // Phase 1 intentionally exposes only owner-authorized administration.
 const actor:Actor={id:"owner",role:"owner"};
 try{
 const p=u.pathname,method=req.method;
 if(method==="GET"&&p==="/api/agents/learning/review")return json({ok:true,proposals:await listProposals()});
 const rev=p.match(/^\/api\/agents\/learning\/review\/([^/]+)$/);
 if(method==="POST"&&rev){const b=await req.json();if(!["approved","rejected"].includes(b.decision))return json({error:"Invalid decision"},400);return json({ok:true,proposal:await review(rev[1],b.decision,"owner")});}
 if(method==="GET"&&p==="/api/agents")return json({ok:true,agents:await listBrains()});
 if(method==="POST"&&p==="/api/agents"){const b=await req.json();if(!validId(b.id)||!validText(b.name,160)||!validText(b.department,160)||!validText(b.specialty,300)||typeof b.instructions!=="string"||b.instructions.length>20000||!validSources(b.knowledgeSources))return json({error:"Invalid agent profile"},400);return json({ok:true,agent:await createBrain({id:b.id,name:b.name,department:b.department,specialty:b.specialty,instructions:b.instructions,knowledgeSources:b.knowledgeSources})},201);}
 const match=p.match(/^\/api\/agents\/([^/]+)(?:\/(memories|learning))?$/);
 if(match){const id=decodeURIComponent(match[1]);const brain=await getBrain(id);if(!brain)return json({error:"Unknown agent"},404);
 if(method==="GET"&&!match[2])return json({ok:true,brain});
 if(method==="GET"&&match[2]==="memories")return json({ok:true,memories:await listMemories(actor,id)});
 if(method==="POST"&&match[2]==="learning"){const b=await req.json();if(!validText(b.text,20000)||!validText(b.source,2048)||!scopes.includes(b.scope)||(b.scope==="project"&&!validId(b.projectId))||(b.projectId!==undefined&&!validId(b.projectId)))return json({error:"Invalid learning proposal"},400);return json({ok:true,proposal:await propose(id,{text:b.text,source:b.source,scope:b.scope as Scope,projectId:b.projectId})},201);}
 }
 return json({error:"Not found"},404);
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:"Unknown error"},400);}
}
