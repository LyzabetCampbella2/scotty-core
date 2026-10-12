import { handleEyesOn } from "./eyes/index.ts";
import { handleVoice } from "./voice/index.ts";
import { handleMemory } from "./memory/index.ts";
import { handleHealth } from "./health.ts";
import { handleReliability } from "./reliability/http.ts";
import { createLocalServiceMonitor } from "./reliability/probes.ts";
import { watchdog } from "./reliability/watchdog.ts";
import { loadAudit } from "./reliability/audit.ts";

const PORT=Number(process.env.PORT||3000);
Bun.serve({port:PORT,async fetch(req){const u=new URL(req.url);
 if(u.pathname.startsWith("/api/control/")) return handleReliability(req,u);
 if(u.pathname==="/health") return handleHealth();
 if(u.pathname.startsWith("/api/eyes")) return handleEyesOn(req,u);
 if(u.pathname.startsWith("/api/voice")) return handleVoice(req,u);
 if(u.pathname.startsWith("/api/memory")) return handleMemory(req,u);
 return Response.json({service:"S.C.O.T.T.Y.",status:"online",architecture:"modular",routes:["/health","/api/eyes/*","/api/voice/*","/api/memory/*"]});
}});
console.log("S.C.O.T.T.Y. modular core listening",PORT);
// Opt-in diagnostics only. No production runtime or HUD behavior is replaced.
if(process.env.SCOTTY_ENABLE_RELIABILITY_MONITOR==="true") {
  watchdog.start();
  const monitor=createLocalServiceMonitor(`http://127.0.0.1:${PORT}`);
  monitor.start();
  loadAudit().catch(error=>console.error("Audit initialization failed",error instanceof Error?error.message:"unknown"));
}
