import { createBrain,getBrain,listBrains,listMemories,listProposals,propose,review } from "./store.ts";
import type { Actor,Scope } from "./brain.ts";
const scopes=["private","project","department","network","external"];
function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});}
export async function handleAgents(req:Request,u:URL):Promise<Response>{
 const token=process.env.SCOTTY_BRAIN_ADMIN_TOKEN;
 if(!token)return json({ok:false,error:"Brain API disabled until admin token is configured"},503);
 const auth=req.headers.get("authorization");
 if(!auth||auth!==`Bearer ${token}`)return json({ok:false,error:"Unauthorized"},401);
 // Phase 1 intentionally exposes only owner-authorized administration.
 const actor:Actor={id:"owner",role:"owner"};
 try{
 const p=u.pathname,method=req.method;
 if(method==="GET"&&p==="/api/agents")return json({ok:true,agents:await listBrains()});
 if(method==="POST"&&p==="/api/agents"){const b=await req.json();if(!b.id||!b.name||!b.department||!b.specialty||typeof b.instructions!=="string"||!Array.isArray(b.knowledgeSources))return json({error:"Invalid agent profile"},400);return json({ok:true,agent:await createBrain({id:b.id,name:b.name,department:b.department,specialty:b.specialty,instructions:b.instructions,knowledgeSources:b.knowledgeSources})},201);}
 const match=p.match(/^\/api\/agents\/([^/]+)(?:\/(memories|learning))?$/);
 if(match){const id=decodeURIComponent(match[1]);const brain=await getBrain(id);if(!brain)return json({error:"Unknown agent"},404);
 if(method==="GET"&&!match[2])return json({ok:true,brain});
 if(method==="GET"&&match[2]==="memories")return json({ok:true,memories:await listMemories(actor,id)});
 if(method==="POST"&&match[2]==="learning"){const b=await req.json();if(typeof b.text!=="string"||!b.text.trim()||b.text.length>20000||typeof b.source!=="string"||!b.source.trim()||!scopes.includes(b.scope)||b.scope==="external"||(b.scope==="project"&&!b.projectId))return json({error:"Invalid learning proposal"},400);return json({ok:true,proposal:await propose(id,{text:b.text,source:b.source,scope:b.scope as Scope,projectId:b.projectId})},201);}
 }
 if(method==="GET"&&p==="/api/agents/learning/review")return json({ok:true,proposals:await listProposals()});
 const rev=p.match(/^\/api\/agents\/learning\/review\/([^/]+)$/);
 if(method==="POST"&&rev){const b=await req.json();if(!["approved","rejected"].includes(b.decision))return json({error:"Invalid decision"},400);return json({ok:true,proposal:await review(rev[1],b.decision,"owner")});}
 return json({error:"Not found"},404);
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:"Unknown error"},400);}
}
