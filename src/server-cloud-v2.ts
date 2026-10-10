import { handleEyesOn } from "./eyes/index.ts";
import { handleHudStt } from "./voice/hud-stt.ts";
import { handleCloudVoice } from "./voice/cloud.ts";
import { handleCloudMemory } from "./memory/cloud.ts";
import { handleCloudCommand } from "./brain/cloud.ts";
import { handleCloudAgents,bootstrapAgents } from "./agents/cloud.ts";
import { handleCloudForge,runForgeSelfTest } from "./forge/cloud.ts";
import { handleCloudResources,bootstrapResources } from "./resources/cloud.ts";
import { handleCloudAutonomy,bootstrapAutonomy,autonomyTick } from "./autonomy/cloud.ts";
import { handleCloudProviders } from "./providers/cloud.ts";
import { handleCloudConnections,connectionSetupStatus } from "./connections/cloud.ts";
import { handleHealth,handleSystemStatus,handleSystemQa,handleSystemRecover } from "./health.ts";
import { handleCloudAuth,isCloudAuthenticated } from "./auth/cloud.ts";

const PORT=Number(process.env.PORT||3000);

async function servePublic(path:string,type="text/html; charset=utf-8"){
 try{
  const file=Bun.file(path);
  if(!(await file.exists()))return null;
  return new Response(file,{headers:{"content-type":type,"cache-control":"no-store"}});
 }catch{return null}
}
async function serveHud(){
 try{
  const file=Bun.file("public/index.html");
  if(!(await file.exists()))return null;
  let html=await file.text();
  if(!html.includes("/render-hotfix.js"))html=html.replace("</body>","<script src=\"/render-hotfix.js?v=4\"></script></body>");
  return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
 }catch{return null}
}

Bun.serve({port:PORT,async fetch(req){
 const u=new URL(req.url);
 if(req.method==="GET"){
  if(u.pathname==="/render-hotfix.js") {const r=await servePublic("public/render-hotfix.js","application/javascript; charset=utf-8");if(r)return r}
  if(u.pathname==="/hud"||u.pathname==="/hud/"||u.pathname==="/") {const r=await serveHud();if(r)return r}
  if(u.pathname==="/missions"||u.pathname==="/missions/") {const r=await servePublic("public/missions/index.html");if(r)return r}
  if(u.pathname==="/integrations"||u.pathname==="/integrations/") {const r=await servePublic("public/integrations/index.html");if(r)return r}
  if(u.pathname==="/system"||u.pathname==="/system/") {const r=await servePublic("public/system/index.html");if(r)return r}
  if(u.pathname==="/forge"||u.pathname==="/forge/") {const r=await servePublic("public/forge/index.html");if(r)return r}
  if(u.pathname==="/manifest.webmanifest"||u.pathname==="/hud/manifest.json") {const r=await servePublic("public/manifest.webmanifest","application/manifest+json");if(r)return r}
 }
 if(u.pathname==="/health") return handleHealth();
 if(req.method==="GET"&&u.pathname==="/api/connections/setup/status") return Response.json({ok:true,...connectionSetupStatus()},{headers:{"cache-control":"no-store"}});

 if(u.pathname.startsWith("/api/auth")) return handleCloudAuth(req,u);
 if(u.pathname==="/api/connections/google/callback") return handleCloudConnections(req,u);

 const protectedRoute=
  u.pathname==="/api/hud/stt"||
  u.pathname==="/api/hud/command"||
  u.pathname==="/api/hud/agents"||
  u.pathname==="/api/hud/agents/run"||
  u.pathname==="/api/hud/activity"||
  u.pathname.startsWith("/api/hud/resources")||
  u.pathname.startsWith("/api/missions")||
  u.pathname.startsWith("/api/approvals")||
  u.pathname.startsWith("/api/providers")||
  (u.pathname.startsWith("/api/connections")&&u.pathname!=="/api/connections/setup/status")||
  u.pathname==="/api/tts"||
  u.pathname.startsWith("/api/voice/scottish/")||
  u.pathname==="/api/voice/speak"||
  u.pathname==="/api/eyes/analyze"||
  (u.pathname.startsWith("/api/memory/")&&u.pathname!=="/api/memory/status")||
  u.pathname.startsWith("/forge/api/")||
  (u.pathname==="/api/system/status"||u.pathname==="/api/system/qa"||u.pathname==="/api/system/recover");
 if(protectedRoute&&!(await isCloudAuthenticated(req))) return Response.json({ok:false,error:"Authentication required"},{status:401,headers:{"cache-control":"no-store"}});
 if(u.pathname==="/api/hud/stt") return handleHudStt(req);
 if(u.pathname==="/api/hud/command"||u.pathname==="/api/hud/brain/status") return handleCloudCommand(req,u);
 if(u.pathname==="/api/hud/agents"||u.pathname==="/api/hud/agents/run"||u.pathname==="/api/hud/agents/status"||u.pathname==="/api/hud/activity") return handleCloudAgents(req,u);
 if(u.pathname.startsWith("/api/hud/resources")) return handleCloudResources(req,u);
 if(u.pathname.startsWith("/api/missions")||u.pathname.startsWith("/api/approvals")) return handleCloudAutonomy(req,u);
 if(u.pathname.startsWith("/api/providers")) return handleCloudProviders(req,u);
 if(u.pathname.startsWith("/api/connections")) return handleCloudConnections(req,u);
 if(u.pathname.startsWith("/forge/api/")) return handleCloudForge(req,u);
 if(u.pathname==="/api/system/status") return handleSystemStatus(req,u);
 if(u.pathname==="/api/system/qa") return handleSystemQa(req,u);
 if(u.pathname==="/api/system/recover") return handleSystemRecover(req,u);

 if(u.pathname.startsWith("/api/eyes")) return handleEyesOn(req,u);
 if(u.pathname==="/api/tts"||u.pathname.startsWith("/api/voice")) return handleCloudVoice(req,u);
 if(u.pathname.startsWith("/api/memory")) return handleCloudMemory(req,u);
 if(u.pathname.startsWith("/api/")) return Response.json({ok:false,error:"S.C.O.T.T.Y. cloud route not found"},{status:404,headers:{"cache-control":"no-store"}});

 return Response.json({service:"S.C.O.T.T.Y.",status:"online",architecture:"cloud-gateway-v3",native:["brain","agents","activity","resources","missions","approvals","providers","connections","eyes","stt","voice","memory","forge-control","release-status"]});
}});

console.log("S.C.O.T.T.Y. cloud gateway v3 listening",PORT);
handleHealth().then(async r=>console.log("S.C.O.T.T.Y. safe health",await r.text())).catch(()=>{});
bootstrapAgents().then(n=>console.log("S.C.O.T.T.Y. cloud agent matrix ready",n)).catch(e=>console.warn("Agent bootstrap deferred",e?.message||e));
bootstrapResources().then(r=>console.log("S.C.O.T.T.Y. spatial resource graph ready",JSON.stringify(r))).catch(e=>console.warn("Resource graph bootstrap deferred",e?.message||e));
bootstrapAutonomy().then(n=>console.log("S.C.O.T.T.Y. autonomy mission core ready",n)).catch(e=>console.warn("Autonomy bootstrap deferred",e?.message||e));
if(process.env.SCOTTY_FORGE_SELF_TEST==="1"){
 runForgeSelfTest().then(r=>console.log("S.C.O.T.T.Y. Forge self-test",JSON.stringify(r))).catch(e=>console.warn("S.C.O.T.T.Y. Forge self-test failed",e?.message||e));
}
if(process.env.SCOTTY_FULL_QA_ON_START==="1"){
 const qr=new Request("http://localhost/api/system/qa",{method:"POST"});
 handleSystemQa(qr,new URL(qr.url)).then(async r=>console.log("S.C.O.T.T.Y. Part 8 full QA",await r.text())).catch(e=>console.warn("S.C.O.T.T.Y. Part 8 full QA failed",e?.message||e));
}
const maintenance=()=>{
 const rr=new Request("http://localhost/api/system/recover",{method:"POST"});
 handleSystemRecover(rr,new URL(rr.url)).catch(()=>{});
};
setTimeout(maintenance,30000);
setInterval(maintenance,15*60*1000);
setTimeout(()=>autonomyTick().catch(()=>{}),45000);
setInterval(()=>autonomyTick().catch(()=>{}),5*60*1000);
