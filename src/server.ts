import { renderReviewPage } from "./agents/review-ui.ts";
import { handleAgents } from "./agents/api.ts";
import { handleEyesOn } from "./eyes/index.ts";
import { handleVoice } from "./voice/index.ts";
import { handleMemory } from "./memory/index.ts";
import { handleWorkspace } from "./workspace/index.ts";
import { handleHealth } from "./health.ts";

const PORT=Number(process.env.PORT||3000);
Bun.serve({port:PORT,async fetch(req){const u=new URL(req.url);
 if(u.pathname==="/health") return handleHealth();
 if(u.pathname.startsWith("/api/eyes")) return handleEyesOn(req,u);
 if(u.pathname.startsWith("/api/voice")) return handleVoice(req,u);
 if(u.pathname.startsWith("/api/memory")) return handleMemory(req,u);
 if(u.pathname.startsWith("/api/workspace")) return handleWorkspace(req,u);
 if(u.pathname==="/agents/learning-review") {
   if(process.env.SCOTTY_AGENT_BRAINS_ENABLED!=="true") return new Response("Not enabled",{status:503});
   const token=process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
   const cookie=req.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith("scotty_owner_session="))?.slice("scotty_owner_session=".length);
   if(!token||cookie!==token)return new Response("Owner session required",{status:401,headers:{"Cache-Control":"no-store"}});
   return renderReviewPage();
 }
 if(u.pathname.startsWith("/api/agents")) {
   if(process.env.SCOTTY_AGENT_BRAINS_ENABLED!=="true") return Response.json({ok:false,error:"Agent brains not enabled"},{status:503});
   return handleAgents(req,u);
 }
 return Response.json({service:"S.C.O.T.T.Y.",status:"online",architecture:"modular",routes:["/health","/api/eyes/*","/api/voice/*","/api/memory/*","/api/workspace/*"]});
}});
console.log("S.C.O.T.T.Y. modular core listening",PORT);