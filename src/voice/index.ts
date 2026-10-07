// Voice boundary: ElevenLabs/listening/speaking code belongs here.
export async function handleVoice(req:Request,u:URL){
 if(req.method==="GET"&&u.pathname==="/api/voice/status") return Response.json({ok:true,feature:"voice",configured:Boolean(process.env.ELEVENLABS_API_KEY),voiceIdConfigured:Boolean(process.env.SCOTTY_VOICE_ID)});
 return Response.json({ok:false,message:"Voice compatibility adapter is being migrated from the legacy runtime."},{status:501});
}