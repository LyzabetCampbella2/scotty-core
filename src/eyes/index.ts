import { analyzeFrame } from "./vision.ts";
const PAGE='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>S.C.O.T.T.Y. Eyes On</title><style>body{margin:0;background:#031015;color:#dcfaff;font:16px system-ui}.w{max-width:800px;margin:auto;padding:20px}video{width:100%;min-height:260px;background:#000;border-radius:18px}button{margin:10px 8px 0 0;padding:14px 18px;border-radius:12px;border:1px solid #5eeaff;background:#082832;color:#eaffff;font-weight:800}.box{margin-top:14px;padding:14px;border:1px solid #24515b;border-radius:14px;white-space:pre-wrap}</style><div class="w"><h1>S.C.O.T.T.Y. · EYES ON</h1><div id="h" class="box">Checking systems…</div><video id="v" autoplay playsinline muted></video><canvas id="c" hidden></canvas><button id="start">START CAMERA</button><button id="look">EYES ON</button><div id="out" class="box">Ready.</div></div><script>const v=document.querySelector("#v"),c=document.querySelector("#c"),o=document.querySelector("#out"),h=document.querySelector("#h");fetch("/api/eyes/status").then(r=>r.json()).then(x=>h.textContent="Vision: "+(x.visionConfigured?"READY":"NOT CONFIGURED")+"\nVoice: "+(x.voiceConfigured?"READY":"WAITING")+"\nMemory: "+(x.memoryConfigured?"CONNECTED":"WAITING"));start.onclick=async()=>{try{v.srcObject=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});o.textContent="Camera ready."}catch(e){o.textContent="Camera error: "+e.message}};look.onclick=async()=>{if(!v.videoWidth)return o.textContent="Start camera first.";c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);o.textContent="S.C.O.T.T.Y. is looking…";try{const r=await fetch("/api/eyes/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({imageDataUrl:c.toDataURL("image/jpeg",.72)})}),x=await r.json();if(!r.ok)throw Error(x.error||"Vision failed");o.textContent=x.text+"\n\n["+x.provider+" vision]";if(x.voiceConfigured){const a=await fetch("/api/voice/speak",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:x.text})});if(a.ok)new Audio(URL.createObjectURL(await a.blob())).play()}}catch(e){o.textContent="Eyes On error: "+e.message}}</script>';
export async function handleEyesOn(req:Request,u:URL){
 if(req.method==="GET"&&u.pathname==="/api/eyes/test")return new Response(PAGE,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
 if(req.method==="GET"&&u.pathname==="/api/eyes/status")return Response.json({
  ok:true,
  feature:"eyes-on",
  visionConfigured:Boolean(process.env.LOCAL_BRAIN_URL||process.env.GROQ_API_KEY),
  visionProvider:process.env.LOCAL_BRAIN_URL?"local":process.env.GROQ_API_KEY?"groq":null,
  voiceConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&process.env.SCOTTY_VOICE_ID),
  memoryConfigured:Boolean(process.env.DATABASE_URL)
 });
 if(req.method==="POST"&&u.pathname==="/api/eyes/analyze"){
  let body:any;try{body=await req.json()}catch{return Response.json({ok:false,error:"Invalid JSON"},{status:400})}
  const result=await analyzeFrame(String(body?.imageDataUrl||""),String(body?.prompt||""));
  return Response.json({...result,voiceConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&process.env.SCOTTY_VOICE_ID),memoryConfigured:Boolean(process.env.DATABASE_URL)},{status:result.ok?200:result.status||500});
 }
 return Response.json({ok:false,error:"Eyes On route not found"},{status:404});
}
