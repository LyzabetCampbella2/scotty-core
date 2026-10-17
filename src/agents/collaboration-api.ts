import {grant,revoke,message,share,list,revokeShare,sharedFor} from "./collaboration.ts";
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
const id=(s:unknown)=>typeof s==="string"&&s.length>0&&s.length<=160&&/^[\w-]+$/.test(s);
export async function handleCollaboration(req:Request,u:URL):Promise<Response>{
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
