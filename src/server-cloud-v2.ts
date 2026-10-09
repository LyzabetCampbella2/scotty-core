import { handleEyesOn } from "./eyes/index.ts";
import { handleHudStt } from "./voice/hud-stt.ts";
import { handleCloudVoice } from "./voice/cloud.ts";
import { handleCloudMemory } from "./memory/cloud.ts";
import { handleCloudCommand } from "./brain/cloud.ts";
import { handleCloudAgents,bootstrapAgents } from "./agents/cloud.ts";
import { handleHealth } from "./health.ts";
import { handleCloudAuth } from "./auth/cloud.ts";
import { legacyApi,eyesFallback,voiceFallback,memoryFallback } from "./compat/cloud-fallback.ts";

const PORT=Number(process.env.PORT||3000);

Bun.serve({port:PORT,async fetch(req){
 const u=new URL(req.url);
 if(u.pathname==="/health") return handleHealth();

 if(u.pathname==="/api/hud/stt") return handleHudStt(req);
 if(u.pathname.startsWith("/api/auth")) return handleCloudAuth(req,u);
 if(u.pathname==="/api/hud/command"||u.pathname==="/api/hud/brain/status") return handleCloudCommand(req,u);
 if(u.pathname==="/api/hud/agents"||u.pathname==="/api/hud/agents/run"||u.pathname==="/api/hud/agents/status"||u.pathname==="/api/hud/activity") return handleCloudAgents(req,u);

 if(u.pathname.startsWith("/api/eyes")){
  if(process.env.LOCAL_BRAIN_URL||process.env.GROQ_API_KEY||process.env.OPENAI_API_KEY) return handleEyesOn(req,u);
  return await eyesFallback(req,u) || handleEyesOn(req,u);
 }

 if(u.pathname==="/api/tts"||u.pathname.startsWith("/api/voice")){
  if(process.env.ELEVENLABS_API_KEY) return handleCloudVoice(req,u);
  return await voiceFallback(req,u) || handleCloudVoice(req,u);
 }

 if(u.pathname.startsWith("/api/memory")){
  if(process.env.DATABASE_URL) return handleCloudMemory(req,u);
  return await memoryFallback(req,u) || handleCloudMemory(req,u);
 }

 if(u.pathname.startsWith("/api/")){
  const r=await legacyApi(req,u);
  if(r)return r;
 }

 return Response.json({service:"S.C.O.T.T.Y.",status:"online",architecture:"cloud-gateway-v3",native:["brain","agents","activity","eyes","stt","voice","memory"]});
}});

console.log("S.C.O.T.T.Y. cloud gateway v3 listening",PORT);
bootstrapAgents().then(n=>console.log("S.C.O.T.T.Y. cloud agent matrix ready",n)).catch(e=>console.warn("Agent bootstrap deferred",e?.message||e));
