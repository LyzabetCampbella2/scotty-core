const http=require('node:http');
const crypto=require('node:crypto');
const PORT=Number(process.env.PORT||8080);
const url=process.env.SCOTTY_MOSS_VOICE_URL;
const voiceToken=process.env.SCOTTY_MOSS_VOICE_TOKEN;
const clientToken=process.env.SCOTTY_ADAPTER_CLIENT_TOKEN;
const origin=process.env.SCOTTY_ALLOWED_ORIGIN||'';
if(!url||!voiceToken||!clientToken||!origin)throw Error('Missing adapter configuration');
function send(res,status,data,type='application/json'){res.writeHead(status,{'Content-Type':type,'Content-Length':Buffer.byteLength(data),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'});res.end(data)}
function authorized(v){const a=Buffer.from(v||'');const b=Buffer.from('Bearer '+clientToken);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/health'&&req.method==='GET')return send(res,200,'{"ok":true,"adapter":"moss"}');
 if(path!=='/v1/speak')return send(res,404,'{"error":"Not found"}');
 if(req.method==='OPTIONS')return send(res,204,'');
 if(req.method!=='POST')return send(res,405,'{"error":"Method not allowed"}');
 if(req.headers.origin&&req.headers.origin!==origin)return send(res,403,'{"error":"Origin denied"}');
 if(!authorized(req.headers.authorization))return send(res,401,'{"error":"Unauthorized"}');
 let chunks=[],size=0;
 for await(const chunk of req){size+=chunk.length;if(size>16000)return send(res,413,'{"error":"Too large"}');chunks.push(chunk)}
 let data;try{data=JSON.parse(Buffer.concat(chunks).toString())}catch{return send(res,400,'{"error":"Bad JSON"}')}
 if(typeof data.text!=='string'||!data.text.trim()||data.text.length>1500||!['playful','excited','reassuring'].includes(data.style||'playful'))return send(res,400,'{"error":"Invalid request"}');
 try{
  const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+voiceToken,'Content-Type':'application/json'},body:JSON.stringify({text:data.text,style:data.style||'playful'}),signal:AbortSignal.timeout(245000)});
  if(!r.ok)return send(res,502,JSON.stringify({error:'Voice upstream failed',status:r.status}));
  const wav=Buffer.from(await r.arrayBuffer());
  if(wav.subarray(0,4).toString()!=='RIFF')return send(res,502,'{"error":"Invalid WAV"}');
  return send(res,200,wav,'audio/wav');
 }catch{return send(res,503,'{"error":"Voice offline or timed out"}')}
}).listen(PORT,'0.0.0.0',()=>console.log('SCOTTY_MOSS_ADAPTER_READY',PORT));
