const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});

const SCOTTISH_BRIDGE="https://scotty-voice-diagnostic-eyes-on-test.up.railway.app";
async function scottishBridge(req:Request,u:URL){
 const sub=u.pathname.slice("/api/voice/scottish".length);
 if(!/^\/(?:health|ack|speak|jobs\/[a-zA-Z0-9_-]+(?:\/audio)?)$/.test(sub))return json({ok:false,error:"Unknown Scottish voice route"},404);
 if(sub==="/speak"&&req.method!=="POST")return json({ok:false,error:"POST required"},405);
 if(sub!=="/speak"&&req.method!=="GET")return json({ok:false,error:"GET required"},405);
 try{
  const response=await fetch(SCOTTISH_BRIDGE+"/scottish"+sub,{method:req.method,headers:sub==="/speak"?{"content-type":"application/json"}:{},body:sub==="/speak"?await req.text():undefined,signal:AbortSignal.timeout(25000)});
  return new Response(response.body,{status:response.status,headers:{"content-type":response.headers.get("content-type")||"application/json","cache-control":"no-store"}});
 }catch(e){return json({ok:false,error:"Scottish voice bridge unavailable: "+String((e as Error).message||e)},503)}
}

export async function handleCloudVoice(req:Request,u:URL){
 if(u.pathname.startsWith("/api/voice/scottish/"))return scottishBridge(req,u);
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
