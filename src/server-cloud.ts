import { handleEyesOn } from "./eyes/index.ts";
import { handleVoice } from "./voice/index.ts";
import { handleMemory } from "./memory/index.ts";
import { handleHealth } from "./health.ts";
import { handleHudStt } from "./voice/hud-stt.ts";
import { legacyApi,eyesFallback,voiceFallback,memoryFallback } from "./compat/cloud-fallback.ts";

const PORT=Number(process.env.PORT||3000);
Bun.serve({port:PORT,async fetch(req){
 const u=new URL(req.url);
 if(u.pathname==="/health") return handleHealth();
 if(u.pathname==="/api/hud/stt") return handleHudStt(req);
 if(u.pathname.startsWith("/api/eyes")) return (process.env.LOCAL_BRAIN_URL||process.env.OPENAI_API_KEY)?handleEyesOn(req,u):(await eyesFallback(req,u)||handleEyesOn(req,u));
 if(u.pathname==="/api/tts") return await voiceFallback(req,u)||handleVoice(req,u);
 if(u.pathname.startsWith("/api/voice")) return (process.env.ELEVENLABS_API_KEY&&process.env.SCOTTY_VOICE_ID)?handleVoice(req,u):(await voiceFallback(req,u)||handleVoice(req,u));
 if(u.pathname.startsWith("/api/memory")) return process.env.DATABASE_URL?handleMemory(req,u):(await memoryFallback(req,u)||handleMemory(req,u));
 if(u.pathname.startsWith("/api/")){const r=await legacyApi(req,u);if(r)return r}
 return Response.json({service:"S.C.O.T.T.Y.",status:"online",architecture:"cloud-gateway"});
}});
console.log("S.C.O.T.T.Y. cloud gateway listening",PORT);
