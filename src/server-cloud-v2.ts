import { handleEyesOn } from "./eyes/index.ts";
import { handleHudStt } from "./voice/hud-stt.ts";
import { handleCloudVoice } from "./voice/cloud.ts";
import { handleCloudMemory } from "./memory/cloud.ts";
import { handleHealth } from "./health.ts";
import { legacyApi,eyesFallback,voiceFallback,memoryFallback } from "./compat/cloud-fallback.ts";

const PORT=Number(process.env.PORT||3000);

Bun.serve({port:PORT,async fetch(req){
 const u=new URL(req.url);
 if(u.pathname==="/health") return handleHealth();

 if(u.pathname==="/api/hud/stt") return handleHudStt(req);

 if(u.pathname.startsWith("/api/eyes")){
  if(process.env.LOCAL_BRAIN_URL||process.env.OPENAI_API_KEY) return handleEyesOn(req,u);
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

 return Response.json({service:"S.C.O.T.T.Y.",status:"online",architecture:"cloud-gateway-v2"});
}});
console.log("S.C.O.T.T.Y. cloud gateway v2 listening",PORT);
