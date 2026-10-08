// Cloud speech-to-text endpoint. Does not depend on a Windows computer.
// Requires GROQ_API_KEY or OPENAI_API_KEY in the cloud service environment.
const MAX_AUDIO=8*1024*1024;
export async function handleHudStt(req:Request):Promise<Response>{
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
 if(req.method!=="POST")return json({error:"POST audio/wav required"},405);
 const type=req.headers.get("content-type")||"";
 if(!type.includes("audio/wav")&&!type.includes("audio/x-wav"))return json({error:"Expected audio/wav"},415);
 const len=Number(req.headers.get("content-length")||0);
 if(len>MAX_AUDIO)return json({error:"Audio too large"},413);
 const bytes=await req.arrayBuffer();
 if(bytes.byteLength<2000)return json({text:"",confidence:0},200);
 if(bytes.byteLength>MAX_AUDIO)return json({error:"Audio too large"},413);
 const groq=process.env.GROQ_API_KEY,openai=process.env.OPENAI_API_KEY;
 if(!groq&&!openai)return json({error:"Cloud transcription not configured. Set GROQ_API_KEY or OPENAI_API_KEY."},503);
 const provider=groq?"groq":"openai";
 const endpoint=groq?"https://api.groq.com/openai/v1/audio/transcriptions":"https://api.openai.com/v1/audio/transcriptions";
 const model=groq?"whisper-large-v3-turbo":"whisper-1";
 const form=new FormData();form.append("file",new Blob([bytes],{type:"audio/wav"}),"speech.wav");form.append("model",model);form.append("response_format","json");form.append("language","en");
 try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  let upstream:Response;
  try{upstream=await fetch(endpoint,{method:"POST",headers:{authorization:"Bearer "+(groq||openai)},body:form,signal:controller.signal})}finally{clearTimeout(timer)}
  if(!upstream.ok)return json({error:"Transcription provider error",provider,status:upstream.status},502);
  const result=await upstream.json() as {text?:string};
  return json({text:String(result.text||"").trim(),confidence:1,provider});
 }catch{return json({error:"Cloud transcription temporarily unavailable"},502)}
}
