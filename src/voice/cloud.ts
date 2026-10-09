const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});

export async function handleCloudVoice(req:Request,u:URL){
 const key=process.env.ELEVENLABS_API_KEY;

 if(req.method==="GET"&&u.pathname==="/api/voice/status"){
  return json({ok:true,provider:"ElevenLabs",configured:Boolean(key),voiceIdConfigured:Boolean(process.env.SCOTTY_VOICE_ID)});
 }

 if(req.method==="GET"&&u.pathname==="/api/voice/voices"){
  if(!key)return json({ok:false,error:"ElevenLabs not configured"},503);
  try{
   const r=await fetch("https://api.elevenlabs.io/v2/voices?page_size=100",{headers:{"xi-api-key":key}});
   const j:any=await r.json().catch(()=>({}));
   if(!r.ok)return json({ok:false,error:String(j?.detail?.message||j?.detail||j?.error||"Unable to list voices").slice(0,500),status:r.status},502);
   const voices=(j?.voices||[]).map((v:any)=>({voiceId:v.voice_id,name:v.name,category:v.category||null}));
   return json({ok:true,count:voices.length,voices});
  }catch{return json({ok:false,error:"Unable to reach ElevenLabs voice list"},502)}
 }

 if(req.method==="POST"&&(u.pathname==="/api/tts"||u.pathname==="/api/voice/speak")){
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const text=String(body?.text||"").trim().slice(0,5000);
  const defaultVoice=String(process.env.SCOTTY_VOICE_ID||"").trim();
  const requestedVoice=String(body?.voiceId||"").trim();
  const voiceId=requestedVoice||defaultVoice;
  if(!text)return json({ok:false,error:"Missing text"},400);
  if(!key||!voiceId)return json({ok:false,error:"ElevenLabs not configured"},503);
  async function synth(id:string){
   return fetch("https://api.elevenlabs.io/v1/text-to-speech/"+encodeURIComponent(id),{
    method:"POST",
    headers:{"xi-api-key":key,"content-type":"application/json","accept":"audio/mpeg"},
    body:JSON.stringify({text,model_id:process.env.ELEVENLABS_MODEL||"eleven_multilingual_v2"}),
    signal:AbortSignal.timeout(15000)
   });
  }
  try{
   let r=await synth(voiceId);
   if(!r.ok&&requestedVoice&&defaultVoice&&requestedVoice!==defaultVoice)r=await synth(defaultVoice);
   if(!r.ok){
    let detail="Voice provider request failed";
    try{
      const raw=await r.text();
      if(raw){
        try{
          const j:any=JSON.parse(raw);
          detail=String(j?.detail?.message||j?.detail||j?.error||detail).slice(0,500);
        }catch{detail=raw.slice(0,500)}
      }
    }catch{}
    return json({ok:false,error:detail,status:r.status},502);
   }
   const h=new Headers({"content-type":r.headers.get("content-type")||"audio/mpeg","cache-control":"no-store"});
   return new Response(r.body,{status:200,headers:h});
  }catch{return json({ok:false,error:"Voice provider unavailable"},502)}
 }
 return json({ok:false,error:"Voice route not found"},404);
}
