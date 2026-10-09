import { handleEyesOn } from "./eyes/index.ts";
import { handleHudStt } from "./voice/hud-stt.ts";
import { handleCloudVoice } from "./voice/cloud.ts";
import { handleCloudMemory } from "./memory/cloud.ts";
import { handleCloudCommand } from "./brain/cloud.ts";
import { handleCloudAgents,bootstrapAgents } from "./agents/cloud.ts";
import { handleCloudForge,runForgeSelfTest } from "./forge/cloud.ts";
import { handleCloudResources,bootstrapResources } from "./resources/cloud.ts";
import { handleHealth,handleSystemStatus,handleSystemQa,handleSystemRecover } from "./health.ts";
import { handleCloudAuth,isCloudAuthenticated } from "./auth/cloud.ts";

const PORT=Number(process.env.PORT||3000);

Bun.serve({port:PORT,async fetch(req){
 const u=new URL(req.url);
 if(u.pathname==="/health") return handleHealth();

 if(u.pathname.startsWith("/api/auth")) return handleCloudAuth(req,u);

 const protectedRoute=
  u.pathname==="/api/hud/stt"||
  u.pathname==="/api/hud/command"||
  u.pathname==="/api/hud/agents"||
  u.pathname==="/api/hud/agents/run"||
  u.pathname==="/api/hud/activity"||
  u.pathname.startsWith("/api/hud/resources")||
  u.pathname==="/api/tts"||
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
 if(u.pathname.startsWith("/forge/api/")) return handleCloudForge(req,u);
 if(u.pathname==="/api/system/status") return handleSystemStatus(req,u);
 if(u.pathname==="/api/system/qa") return handleSystemQa(req,u);
 if(u.pathname==="/api/system/recover") return handleSystemRecover(req,u);

 if(u.pathname.startsWith("/api/eyes")) return handleEyesOn(req,u);
 if(u.pathname==="/api/tts"||u.pathname.startsWith("/api/voice")) return handleCloudVoice(req,u);
 if(u.pathname.startsWith("/api/memory")) return handleCloudMemory(req,u);
 if(u.pathname.startsWith("/api/")) return Response.json({ok:false,error:"S.C.O.T.T.Y. cloud route not found"},{status:404,headers:{"cache-control":"no-store"}});

 return Response.json({service:"S.C.O.T.T.Y.",status:"online",architecture:"cloud-gateway-v3",native:["brain","agents","activity","resources","eyes","stt","voice","memory","forge-control","release-status"]});
}});

console.log("S.C.O.T.T.Y. cloud gateway v3 listening",PORT);
handleHealth().then(async r=>console.log("S.C.O.T.T.Y. safe health",await r.text())).catch(()=>{});
bootstrapAgents().then(n=>console.log("S.C.O.T.T.Y. cloud agent matrix ready",n)).catch(e=>console.warn("Agent bootstrap deferred",e?.message||e));
bootstrapResources().then(r=>console.log("S.C.O.T.T.Y. spatial resource graph ready",JSON.stringify(r))).catch(e=>console.warn("Resource graph bootstrap deferred",e?.message||e));
if(process.env.SCOTTY_FORGE_SELF_TEST==="1"){
 runForgeSelfTest().then(r=>console.log("S.C.O.T.T.Y. Forge self-test",JSON.stringify(r))).catch(e=>console.warn("S.C.O.T.T.Y. Forge self-test failed",e?.message||e));
}
if(process.env.SCOTTY_FULL_QA_ON_START==="1"){
 const qr=new Request("http://localhost/api/system/qa",{method:"POST"});
 handleSystemQa(qr,new URL(qr.url)).then(async r=>console.log("S.C.O.T.T.Y. Part 8 full QA",await r.text())).catch(e=>console.warn("S.C.O.T.T.Y. Part 8 full QA failed",e?.message||e));
}
