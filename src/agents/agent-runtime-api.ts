import {authenticateAgent} from "./agent-credentials.ts";
import {requestHandoff} from "./collaboration-requests.ts";
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
const id=(s:unknown)=>typeof s==="string"&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(s);
export async function handleAgentSubmit(req:Request,u:URL):Promise<Response>{
 if(process.env.SCOTTY_AGENT_REQUESTS_ENABLED!=="true")return json({ok:false,error:"Agent submission disabled"},503);
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return json({error:"JSON required"},415);
 const projectId=u.pathname.match(/^\/api\/agent-runtime\/projects\/([A-Za-z0-9_-]+)\/requests$/)?.[1];
 if(!projectId||!id(projectId))return json({error:"Route not found"},404);
 const actor=await authenticateAgent(req,projectId);
 if(!actor)return json({ok:false,error:"Invalid or expired agent credentials"},401);
 try{
  const b=await req.json();
  if(!id(b.recipientId)||typeof b.title!=="string"||!b.title.trim()||b.title.length>240||typeof b.summary!=="string"||!b.summary.trim()||b.summary.length>10000||b.memoryId!==undefined&&!id(b.memoryId))return json({error:"Invalid handoff"},400);
  // Source is cryptographically bound to the token, never supplied by the caller.
  const created=await requestHandoff(projectId,actor.agentId,b.recipientId,b.title,b.summary,b.memoryId);
  return json({ok:true,request:created},201);
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:"Request rejected"},400);}
}
