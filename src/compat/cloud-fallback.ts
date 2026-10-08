const strip=(s:string)=>String(s||"").replace(/\/$/,"");

async function relay(req:Request,target:string):Promise<Response>{
 const headers=new Headers();
 const ct=req.headers.get("content-type"); if(ct) headers.set("content-type",ct);
 const cookie=req.headers.get("cookie"); if(cookie) headers.set("cookie",cookie);
 const init:RequestInit={method:req.method,headers,redirect:"manual"};
 if(req.method!=="GET"&&req.method!=="HEAD") init.body=await req.arrayBuffer();
 try{
  const r=await fetch(target,init);
  const h=new Headers();
  for(const k of ["content-type","cache-control","set-cookie","location"]) {
   const v=r.headers.get(k); if(v) h.set(k,v);
  }
  h.set("cache-control","no-store");
  return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
 }catch{
  return Response.json({ok:false,error:"Cloud compatibility service unavailable"},{status:502,headers:{"cache-control":"no-store"}});
 }
}

export async function legacyApi(req:Request,u:URL){
 const base=strip(process.env.SCOTTY_LEGACY_API_URL||"");
 if(!base) return null;
 return relay(req,base+u.pathname+u.search);
}
export async function eyesFallback(req:Request,u:URL){
 const base=strip(process.env.SCOTTY_EYES_FALLBACK_URL||"");
 if(!base) return null;
 return relay(req,base+u.pathname+u.search);
}
export async function voiceFallback(req:Request,u:URL){
 const base=strip(process.env.SCOTTY_VOICE_FALLBACK_URL||"");
 if(!base) return null;
 const path=u.pathname==="/api/tts"?"/api/tts":u.pathname;
 return relay(req,base+path+u.search);
}
export async function memoryFallback(req:Request,u:URL){
 const base=strip(process.env.SCOTTY_MEMORY_FALLBACK_URL||"");
 if(!base) return null;
 return relay(req,base+u.pathname+u.search);
}
