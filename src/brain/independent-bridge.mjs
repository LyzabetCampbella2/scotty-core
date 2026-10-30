/**
 * Owner-only, opt-in, server-to-server connection to the isolated Cloudflare brain.
 * The Render HUD never sees the Worker bearer token. No production DB access,
 * automatic memory import, background jobs, or AI inference is enabled by this file.
 */
const PREFIX="/api/independent-brain";
const GET_PATHS=new Set(["status","readiness","catalog","quality-cases","sources","missions","memory","memory-history","memory-conflicts"]);
const POST_PATHS=new Set(["plan","discover","team","ask","memory","memory-change","team-preview"]);
const LIMIT=5000;
const json=(data,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
const error=(message,status=400)=>json({ok:false,error:message},status);
function configured(env){
 if(env.SCOTTY_INDEPENDENT_BRAIN_ENABLED!=="true")return {error:"BRIDGE_DISABLED"};
 const token=env.SCOTTY_INDEPENDENT_BRAIN_TOKEN;
 if(typeof token!=="string"||!/^[a-zA-Z0-9._~-]{32,300}$/.test(token))return {error:"BRAIN_TOKEN_NOT_CONFIGURED"};
 let url;
 try{url=new URL(env.SCOTTY_INDEPENDENT_BRAIN_URL||"");}catch{return {error:"BRAIN_URL_NOT_CONFIGURED"};}
 if(url.protocol!=="https:"||!url.hostname.endsWith(".workers.dev")||
   url.username||url.password||url.port||url.pathname!=="/"||url.search||url.hash)
  return {error:"BRAIN_URL_NOT_ALLOWED"};
 return {url:url.origin,token};
}
export async function handleIndependentBrain(req,u,{
 env=process.env,authenticated=async()=>false,fetcher=fetch
}={}){
 if(!u.pathname.startsWith(PREFIX+"/"))return null;
 if(!(await authenticated(req)))return error("OWNER_LOGIN_REQUIRED",401);
 const route=u.pathname.slice(PREFIX.length+1);
 if(route.includes("/")||!(GET_PATHS.has(route)||POST_PATHS.has(route)))return error("NOT_FOUND",404);
 if(req.method==="GET"&&!GET_PATHS.has(route)||req.method==="POST"&&!POST_PATHS.has(route))
  return error("METHOD_NOT_ALLOWED",405);
 if(!["GET","POST"].includes(req.method))return error("METHOD_NOT_ALLOWED",405);
 const config=configured(env);
 if(config.error)return error(config.error,503);
 if(['memory','memory-history','memory-conflicts','memory-change'].includes(route)&&env.SCOTTY_INDEPENDENT_BRAIN_MEMORY_PROXY_ENABLED!=='true')
  return error('MEMORY_PROXY_DISABLED',503);
 if(req.method==="POST"){
  const origin=req.headers.get("origin");
  if(origin&&origin!==u.origin)return error("ORIGIN_DENIED",403);
  if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return error("JSON_REQUIRED",415);
 }
 const endpoint=new URL("/api/"+route,config.url);
 let payload;
 if(req.method==="GET"&&route==="memory"){
  const agentId=u.searchParams.get("agentId")||"";
  if(!/^[a-z0-9-]{1,90}$/i.test(agentId)||u.searchParams.size!==1)return error("AGENT_ID_REQUIRED");
  endpoint.searchParams.set("agentId",agentId);
 }else if(req.method==="GET"&&route==="memory-conflicts"){
  const agentId=u.searchParams.get("agentId")||"";
  if(!/^[A-Za-z0-9-]{1,90}$/.test(agentId)||u.searchParams.size!==1)return error("AGENT_ID_REQUIRED");
  endpoint.searchParams.set("agentId",agentId);
 }else if(req.method==="GET"&&route==="memory-history"){
  const noteId=u.searchParams.get("noteId")||"";
  if(!/^[A-Za-z0-9-]{8,100}$/.test(noteId)||u.searchParams.size!==1)return error("NOTE_ID_REQUIRED");
  endpoint.searchParams.set("noteId",noteId);
 }else if(u.search)return error("QUERY_NOT_ALLOWED");
 if(req.method==="POST"){
  let raw;
  try{raw=await req.text();}catch{return error("BODY_UNREADABLE");}
  if(raw.length>LIMIT)return error("BODY_TOO_LARGE",413);
  try{payload=JSON.parse(raw);}catch{return error("INVALID_JSON");}
  if(!payload||typeof payload!=="object"||Array.isArray(payload))return error("INVALID_OBJECT");
  if(["team","ask"].includes(route)){
   if(env.SCOTTY_INDEPENDENT_BRAIN_AI_PROXY_ENABLED!=="true")return error("AI_PROXY_DISABLED",503);
   if(payload.ownerApproved!==true||payload.shareWithCloudflare!==true||
      payload.noPrivateDataConfirmed!==true)return error("OWNER_AI_APPROVAL_REQUIRED",403);
   if(typeof payload.question!=="string"||payload.question.length>500||
      payload.question.trim().length===0)return error("INVALID_QUESTION");
  }
  if(route==="memory"){
   if(env.SCOTTY_INDEPENDENT_BRAIN_MEMORY_PROXY_ENABLED!=="true")return error("MEMORY_PROXY_DISABLED",503);
   if(payload.approved!==true||payload.noPrivateDataConfirmed!==true)return error("OWNER_MEMORY_APPROVAL_REQUIRED",403);
  }
  if(route==="memory-change"){
   if(env.SCOTTY_INDEPENDENT_BRAIN_MEMORY_PROXY_ENABLED!=="true")return error("MEMORY_PROXY_DISABLED",503);
   if(!["preview","apply"].includes(payload.stage)||payload.noPrivateDataConfirmed!==true)return error("OWNER_MEMORY_APPROVAL_REQUIRED",403);
   if(payload.stage==="apply"&&(payload.approved!==true||payload.reviewAcknowledged!==true||typeof payload.previewToken!=="string"))
    return error("OWNER_MEMORY_CHANGE_APPROVAL_REQUIRED",403);
  }
  if(["plan","team-preview"].includes(route)&&(typeof payload.question!=="string"||payload.question.length>500||!payload.question.trim()))
   return error("INVALID_QUESTION");
 }
 try{
  const response=await fetcher(endpoint.toString(),{
   method:req.method,redirect:"error",
   headers:{"authorization":"Bearer "+config.token,"accept":"application/json",
    ...(req.method==="POST"?{"content-type":"application/json"}:{})},
   ...(req.method==="POST"?{body:JSON.stringify(payload)}:{}),
   signal:AbortSignal.timeout(route==="team"?120000:15000),
  });
  const data=await response.text();
  if(data.length>750000)return error("BRAIN_RESPONSE_TOO_LARGE",502);
  try{JSON.parse(data);}catch{return error("INVALID_BRAIN_RESPONSE",502);}
  return new Response(data,{status:response.status,headers:{
   "content-type":"application/json; charset=utf-8","cache-control":"no-store",
   "x-content-type-options":"nosniff"
  }});
 }catch{return error("BRAIN_UNREACHABLE_OR_TIMEOUT",502);}
}
