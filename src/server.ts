import { handleEyesOn } from "./eyes/index.ts";
import { handleVoice } from "./voice/index.ts";
import { handleMemory } from "./memory/index.ts";
import { handleHealth } from "./health.ts";
import { handleHudStt } from "./voice/hud-stt.ts";

const PORT=Number(process.env.PORT||3000);
Bun.serve({port:PORT,async fetch(req){const u=new URL(req.url);
 if(u.pathname==="/health") return handleHealth();
 if(u.pathname==="/api/hud/stt") return handleHudStt(req);
 if(u.pathname.startsWith("/api/eyes")) return handleEyesOn(req,u);
 if(u.pathname.startsWith("/api/voice")) return handleVoice(req,u);
 if(u.pathname.startsWith("/api/memory")) return handleMemory(req,u);
 return Response.json({service:"S.C.O.T.T.Y.",status:"online",architecture:"modular",routes:["/health","/api/hud/stt","/api/eyes/*","/api/voice/*","/api/memory/*"]});
}});
console.log("S.C.O.T.T.Y. modular core listening",PORT);