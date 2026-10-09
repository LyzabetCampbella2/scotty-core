import postgres from "postgres";

let sql:any=null;
function db(){
 if(!sql){
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error("DATABASE_URL missing");
  sql=postgres(url,{max:4,idle_timeout:20,connect_timeout:12,ssl:"require"});
 }
 return sql;
}

async function ensure(){
 const q=db();
 await q`create table if not exists scotty_activity(
  id bigserial primary key,
  source text not null default 'SCOTTY',
  title text not null default 'ACTIVITY',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
 )`;
}

async function sharedContext(limit=18){
 try{
  const rows=await db()`select scope,kind,agent_id as "agentId",text_content as text,created_at as "createdAt"
   from scotty_memory order by created_at desc limit ${limit}`;
  return rows.reverse().map((x:any)=>`[${x.kind||"memory"}${x.agentId?" · "+x.agentId:""}] ${x.text}`).join("\n");
 }catch{return ""}
}

export async function groqThink(messages:any[],maxTokens=900){
 const key=process.env.GROQ_API_KEY;
 if(!key)throw new Error("GROQ_API_KEY missing");
 const model=process.env.SCOTTY_BRAIN_MODEL_GROQ||"qwen/qwen3.8-27b";
 const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{
  method:"POST",
  headers:{authorization:"Bearer "+key,"content-type":"application/json"},
  body:JSON.stringify({model,messages,temperature:.35,max_completion_tokens:maxTokens,stream:false}),
  signal:AbortSignal.timeout(45000)
 });
 const j:any=await r.json().catch(()=>({}));
 const out=String(j?.choices?.[0]?.message?.content||"").trim();
 if(!r.ok||!out)throw new Error(String(j?.error?.message||"Groq brain request failed"));
 return {text:out,model};
}

export async function addActivity(source:string,title:string,message:string,metadata:any={}){
 await ensure();
 try{await db()`insert into scotty_activity(source,title,message,metadata) values(${source},${title},${message},${db().json(metadata)})`}catch{}
}

export async function handleCloudCommand(req:Request,u:URL){
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
 if(req.method==="GET"&&u.pathname==="/api/hud/brain/status")return json({ok:true,provider:"groq",configured:Boolean(process.env.GROQ_API_KEY),memoryConfigured:Boolean(process.env.DATABASE_URL),model:process.env.SCOTTY_BRAIN_MODEL_GROQ||"qwen/qwen3.8-27b"});
 if(req.method!=="POST"||u.pathname!=="/api/hud/command")return json({ok:false,error:"Brain route not found"},404);
 let body:any;try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
 const text=String(body?.text||"").trim().slice(0,24000);
 if(!text)return json({ok:false,error:"Missing command text"},400);
 if(/^\s*(?:s\.?c\.?o\.?t\.?t\.?y\.?\s+)?on deck[.!]?\s*$/i.test(text)||/^\s*scotty on deck[.!]?\s*$/i.test(text)){
  await addActivity("SCOTTY","ON DECK","Voice command acknowledged.");
  return json({ok:true,handled:true,reply:"Aye, on deck.",provider:"native"});
 }
 const memory=await sharedContext();
 const system=[
  "You are S.C.O.T.T.Y., a private visual command assistant and the root coordinator of a 128-agent network with 12 chiefs.",
  "Be direct, useful, calm, and concise enough to speak aloud naturally.",
  "Use supplied shared memory when relevant. Never invent memories, completed actions, device state, or provider results.",
  "If the user asks for analysis or planning, answer fully. If an action requires a specialist agent, you may recommend the relevant department but do not pretend it executed unless an agent result is supplied.",
  "The HUD, Eyes On, voice, memory, chiefs and agents are parts of one S.C.O.T.T.Y. system."
 ].join(" ");
 try{
  const r=await groqThink([{role:"system",content:system+(memory?"\n\nSHARED MEMORY:\n"+memory:"")},{role:"user",content:text}],1000);
  await addActivity("SCOTTY","COMMAND",text.slice(0,180),{provider:"groq",model:r.model});
  return json({ok:true,handled:true,reply:r.text,provider:"groq",model:r.model});
 }catch(e:any){
  await addActivity("SCOTTY","BRAIN ERROR",String(e?.message||e).slice(0,300));
  return json({ok:false,error:String(e?.message||"Cloud brain unavailable")},{status:502});
 }
}
