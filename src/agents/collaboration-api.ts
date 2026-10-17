import {revokeAgentCredentials} from "./agent-credentials.ts";
import {requestHandoff,pendingRequests,decideRequest} from "./collaboration-requests.ts";
import {grant,revoke,message,share,list,revokeShare,sharedFor} from "./collaboration.ts";
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
const id=(s:unknown)=>typeof s==="string"&&s.length>0&&s.length<=160&&/^[\w-]+$/.test(s);
export async function handleCollaboration(req:Request,u:URL):Promise<Response>{
 const keyRoute=u.pathname==="/api/agent-brains/agent-credentials";
 if(keyRoute){
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  if(req.headers.get("origin")!==u.origin||req.headers.get("x-scotty-csrf")!=="1")return json({error:"Origin/CSRF verification failed"},403);
  try{
   const b=await req.json();
   if(!id(b.agentId)||!id(b.projectId))return json({error:"Invalid agent/project"},400);
   if(b.decision==="issue")return json({ok:false,error:"Credential issuance requires trusted server-side provisioning; browser issuance is disabled"},403);
   if(b.decision==="revoke")return json({ok:true,...await revokeAgentCredentials(b.agentId,b.projectId)});
   return json({error:"Invalid action"},400);
  }catch(e){return json({ok:false,error:e instanceof Error?e.message:"Credential request failed"},400);}
 }
 const notificationRoute=u.pathname==="/api/agent-brains/collaboration-notifications";
 if(notificationRoute){
  if(req.method!=="GET")return json({error:"Method not allowed"},405);
  const pending=await pendingRequests();
  return json({ok:true,pendingCount:pending.length,latest:pending.slice(-5).reverse().map(x=>({id:x.id,projectId:x.project_id,kind:x.kind,title:x.title,sourceAgentId:x.source_agent_id,recipientAgentId:x.recipient_agent_id,createdAt:x.created_at})),limited:pending.length===100});
 }
 const queueRoute=u.pathname==="/api/agent-brains/collaboration-requests";
 const decisionRoute=u.pathname.match(/^\/api\/agent-brains\/collaboration-requests\/([0-9a-f-]{36})$/i);
 if(queueRoute||decisionRoute){
  try{
   if(queueRoute&&req.method==="GET")return json({ok:true,requests:await pendingRequests()});
   if(req.method!=="POST")return json({error:"Method not allowed"},405);
   if(req.headers.get("origin")!==u.origin||req.headers.get("x-scotty-csrf")!=="1")return json({error:"Origin/CSRF verification failed"},403);
   const data=await req.json();
   if(decisionRoute&&["approved","rejected"].includes(data.decision))return json({ok:true,...await decideRequest(decisionRoute[1],data.decision)});
   if(queueRoute&&id(data.projectId)&&id(data.senderId)&&id(data.recipientId)&&typeof data.title==="string"&&data.title.trim()&&data.title.length<=240&&typeof data.summary==="string"&&data.summary.trim()&&data.summary.length<=10000&&(!data.memoryId||id(data.memoryId)))
    return json({ok:true,request:await requestHandoff(data.projectId,data.senderId,data.recipientId,data.title,data.summary,data.memoryId)},201);
   return json({error:"Invalid request"},400);
  }catch(e){return json({ok:false,error:e instanceof Error?e.message:"Unknown error"},400);}
 }
 const match=u.pathname.match(/^\/api\/agent-brains\/collaboration\/([\w-]+)(?:\/(grants|messages|shares|received|audit))?$/);
 if(!match)return json({error:"Route not found"},404);
 const p=match[1],action=match[2],method=req.method;
 try{
 if(method==="GET"&&!action)return json({ok:true,...await list(p)});
 if(method==="GET"&&action==="received"){const recipient=u.searchParams.get("agentId");if(!id(recipient))return json({error:"Agent ID required"},400);return json({ok:true,memories:await sharedFor(p,recipient!)});}
 if(method!=="POST")return json({error:"Method not allowed"},405);
 const origin=req.headers.get("origin");if(!origin||origin!==u.origin||req.headers.get("x-scotty-csrf")!=="1")return json({error:"Origin/CSRF verification failed"},403);
 const b=await req.json();if(!b||typeof b!=="object")return json({error:"Invalid request"},400);
 if(action==="grants"&&id(b.agentId)&&["grant","revoke"].includes(b.decision))return json(await (b.decision==="grant"?grant(p,b.agentId):revoke(p,b.agentId)));
 if(action==="messages"&&id(b.senderId)&&id(b.recipientId)&&typeof b.body==="string"&&b.body.trim()&&b.body.length<=12000)return json(await message(p,b.senderId,b.recipientId,b.body));
 if(action==="shares"&&b.decision==="share"&&id(b.memoryId)&&id(b.recipientId))return json(await share(p,b.memoryId,b.recipientId));
 if(action==="shares"&&b.decision==="revoke"&&id(b.shareId))return json(await revokeShare(p,b.shareId));
 return json({error:"Invalid collaboration action"},400);
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:"Unknown error"},400);}
}
