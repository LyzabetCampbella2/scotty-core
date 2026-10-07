export type VisionResult={ok:boolean;status?:number;provider?:string;text?:string;error?:string};
export async function analyzeFrame(data:string,prompt?:string):Promise<VisionResult>{
 const b64=(data.includes(",")?data.split(",").pop():data)||"";
 if(b64.length<100)return {ok:false,status:400,error:"No camera frame received"};
 const instruction=prompt?.trim()||"You are S.C.O.T.T.Y.'s Eyes On vision. Describe what is visible clearly and concisely. Prioritize what the user would want to know and do not invent details.";
 const local=(process.env.LOCAL_BRAIN_URL||"").replace(/\/$/,"");
 if(local){try{const r=await fetch(local+"/api/chat",{method:"POST",headers:{"content-type":"application/json",...(process.env.LOCAL_BRAIN_TOKEN?{authorization:"Bearer "+process.env.LOCAL_BRAIN_TOKEN}:{})},body:JSON.stringify({model:process.env.SCOTTY_VISION_MODEL||"llava",stream:false,messages:[{role:"user",content:instruction,images:[b64]}]}),signal:AbortSignal.timeout(30000)});const j:any=await r.json();if(r.ok&&j?.message?.content)return {ok:true,provider:"local",text:j.message.content};}catch{}}
 if(process.env.OPENAI_API_KEY){try{const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{authorization:"Bearer "+process.env.OPENAI_API_KEY,"content-type":"application/json"},body:JSON.stringify({model:process.env.SCOTTY_VISION_MODEL_CLOUD||"gpt-4.1-mini",messages:[{role:"user",content:[{type:"text",text:instruction},{type:"image_url",image_url:{url:data}}]}],max_tokens:450}),signal:AbortSignal.timeout(45000)});const j:any=await r.json();const text=j?.choices?.[0]?.message?.content;if(r.ok&&text)return {ok:true,provider:"cloud",text};return {ok:false,status:502,error:j?.error?.message||"Cloud vision failed"};}catch(e:any){return {ok:false,status:502,error:e?.message||String(e)}}}
 return {ok:false,status:503,error:"No reachable vision provider"};
}
