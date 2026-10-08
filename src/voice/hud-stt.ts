// Cloud speech-to-text endpoint for S.C.O.T.T.Y.
// Uses Groq Whisper so the HUD no longer depends on OpenAI API credits or a Windows PC.
const MAX_AUDIO=8*1024*1024;

export async function handleHudStt(req:Request):Promise<Response>{
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
 if(req.method!=="POST")return json({error:"POST audio/wav required"},405);
 const type=req.headers.get("content-type")||"";
 if(!type.includes("audio/wav")&&!type.includes("audio/x-wav"))return json({error:"Expected audio/wav"},415);
 const len=Number(req.headers.get("content-length")||0);
 if(len>MAX_AUDIO)return json({error:"Audio too large"},413);
 const bytes=await req.arrayBuffer();
 if(bytes.byteLength<2000)return json({text:"",confidence:0,provider:"groq"},200);
 if(bytes.byteLength>MAX_AUDIO)return json({error:"Audio too large"},413);

 const groq=process.env.GROQ_API_KEY;
 if(!groq)return json({error:"Groq transcription is not configured. Set GROQ_API_KEY.",provider:"groq"},503);

 const form=new FormData();
 form.append("file",new Blob([bytes],{type:"audio/wav"}),"speech.wav");
 form.append("model",process.env.SCOTTY_STT_MODEL_GROQ||"whisper-large-v3-turbo");
 form.append("response_format","json");
 form.append("language","en");

 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),25000);
  let upstream:Response;
  try{
   upstream=await fetch("https://api.groq.com/openai/v1/audio/transcriptions",{
    method:"POST",
    headers:{authorization:"Bearer "+groq},
    body:form,
    signal:controller.signal
   });
  }finally{clearTimeout(timer)}

  if(!upstream.ok){
   let detail="Groq transcription provider error";
   try{const j:any=await upstream.json();detail=j?.error?.message||detail}catch{}
   return json({error:detail,provider:"groq",status:upstream.status},502);
  }
  const result=await upstream.json() as {text?:string};
  return json({text:String(result.text||"").trim(),confidence:1,provider:"groq"});
 }catch{
  return json({error:"Groq transcription temporarily unavailable",provider:"groq"},502);
 }
}
