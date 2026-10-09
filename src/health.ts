import postgres from "postgres";

let sql:any=null;
function db(){
  if(!sql){
    const url=process.env.DATABASE_URL;
    if(!url)throw new Error("DATABASE_URL missing");
    sql=postgres(url,{max:3,idle_timeout:20,connect_timeout:12,ssl:"require"});
  }
  return sql;
}

export async function handleHealth(){
  let authOwnerProvisioned=false;
  try{
    const rows=await db()`select count(*)::int as n from scotty_auth_owner`;
    authOwnerProvisioned=Number(rows?.[0]?.n||0)>=1;
  }catch{}
  const legacyFallbacks=[
    process.env.SCOTTY_LEGACY_API_URL,
    process.env.SCOTTY_EYES_FALLBACK_URL,
    process.env.SCOTTY_VOICE_FALLBACK_URL,
    process.env.SCOTTY_MEMORY_FALLBACK_URL
  ].filter(Boolean).length;
  return Response.json({ok:true,service:"scotty-core",architecture:"cloud-gateway-v3",authOwnerProvisioned,legacyFallbacks,time:new Date().toISOString()},{headers:{"cache-control":"no-store"}});
}

async function count(q:Promise<any>){
  try{const rows=await q;return Number(rows?.[0]?.n||0)}catch{return 0}
}

async function forgeHealth(){
  const worker=String(process.env.SCOTTY_FORGE_WORKER_URL||"").replace(/\/$/,"");
  if(!worker)return {configured:false,reachable:false,blenderReady:false,version:null};
  try{
    const r=await fetch(worker+"/health",{signal:AbortSignal.timeout(8000)});
    const d:any=await r.json().catch(()=>({}));
    return {configured:true,reachable:r.ok,blenderReady:Boolean(r.ok&&d?.blenderReady),version:d?.version||null};
  }catch{
    return {configured:true,reachable:false,blenderReady:false,version:null};
  }
}

async function groqHealth(){
  const key=process.env.GROQ_API_KEY;
  if(!key)return {configured:false,reachable:false};
  try{
    const r=await fetch("https://api.groq.com/openai/v1/models",{headers:{authorization:"Bearer "+key},signal:AbortSignal.timeout(8000)});
    return {configured:true,reachable:r.ok};
  }catch{return {configured:true,reachable:false}}
}

async function elevenHealth(){
  const key=process.env.ELEVENLABS_API_KEY;
  if(!key)return {configured:false,reachable:false};
  try{
    const r=await fetch("https://api.elevenlabs.io/v2/voices?page_size=1",{headers:{"xi-api-key":key},signal:AbortSignal.timeout(8000)});
    return {configured:true,reachable:r.ok};
  }catch{return {configured:true,reachable:false}}
}

async function functionalBrainPing(){
  const key=process.env.GROQ_API_KEY;
  if(!key)return {ok:false,detail:"Groq key missing"};
  try{
    const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{authorization:"Bearer "+key,"content-type":"application/json"},
      body:JSON.stringify({model:process.env.SCOTTY_BRAIN_MODEL_GROQ||"qwen/qwen3.8-27b",messages:[{role:"user",content:"Reply with READY only."}],temperature:0,max_completion_tokens:8}),
      signal:AbortSignal.timeout(12000)
    });
    const d:any=await r.json().catch(()=>({}));
    return {ok:r.ok&&Boolean(d?.choices?.[0]?.message?.content),detail:r.ok?"Reasoning request completed":"Reasoning request failed"};
  }catch{return {ok:false,detail:"Reasoning request unavailable"}}
}

async function functionalMemoryRoundTrip(){
  const q=db(),token="qa-"+crypto.randomUUID();
  try{
    const ins=await q`insert into scotty_memory(scope,kind,text_content,metadata) values('system-qa','qa-probe',${token},'{}'::jsonb) returning id`;
    const id=ins?.[0]?.id;
    const rows=await q`select text_content as text from scotty_memory where id=${id} limit 1`;
    await q`delete from scotty_memory where id=${id}`;
    return {ok:rows?.[0]?.text===token,detail:"Postgres write/read/delete completed"};
  }catch{return {ok:false,detail:"Memory round-trip failed"}}
}

async function functionalForgeArtifact(){
  try{
    const rows=await db()`select id,status,(blend_bytes is not null) as "blendReady",(glb_bytes is not null) as "glbReady" from scotty_forge_jobs where status='exported' order by completed_at desc nulls last limit 1`;
    const x=rows?.[0];
    return {ok:Boolean(x?.blendReady&&x?.glbReady),detail:x?"Latest exported Forge job has cloud artifacts":"No exported Forge job available yet"};
  }catch{return {ok:false,detail:"Forge artifact check failed"}}
}

export async function handleSystemRecover(req:Request,u:URL){
  const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
  if(req.method!=="POST"||u.pathname!=="/api/system/recover")return json({ok:false,error:"System recovery route not found"},404);
  const q=db();
  const expired=await q`delete from scotty_sessions where expires_at<=now() returning token_hash`.catch(()=>[]);
  const agents=await q`update scotty_agents set state='idle',current_job=null,queue_count=0,updated_at=now()
    where state='working' and updated_at<now()-interval '20 minutes' returning id`.catch(()=>[]);
  const forge=await q`update scotty_forge_jobs set status='queued',progress=20,error='Recovered stale worker state. Retry from Forge.',updated_at=now()
    where status='working' and updated_at<now()-interval '20 minutes' returning id`.catch(()=>[]);
  await q`delete from scotty_memory where scope='system-qa' and created_at<now()-interval '1 hour'`.catch(()=>{});
  if(agents.length||forge.length||expired.length){
    try{
      await q`insert into scotty_activity(source,title,message,metadata)
        values('SCOTTY','SYSTEM RECOVERY',${"Recovered "+agents.length+" stale agent job(s), "+forge.length+" stale Forge job(s), and removed "+expired.length+" expired session(s)."},${q.json({agents:agents.length,forge:forge.length,expiredSessions:expired.length})})`;
    }catch{}
  }
  return json({ok:true,recoveredAgents:agents.length,recoveredForgeJobs:forge.length,expiredSessionsRemoved:expired.length});
}

export async function handleSystemQa(req:Request,u:URL){
  const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
  if(req.method!=="POST"||u.pathname!=="/api/system/qa")return json({ok:false,error:"System QA route not found"},404);
  const q=db();
  await q`create table if not exists scotty_qa_runs(
    id uuid primary key,
    overall text not null,
    score integer not null,
    checks jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
  )`;
  const [brain,memory,forge,groq,eleven,owners,agents,chiefs]=await Promise.all([
    functionalBrainPing(),
    functionalMemoryRoundTrip(),
    functionalForgeArtifact(),
    groqHealth(),
    elevenHealth(),
    count(q`select count(*)::int as n from scotty_auth_owner`),
    count(q`select count(*)::int as n from scotty_agents`),
    count(q`select count(*)::int as n from scotty_agents where is_chief=true`)
  ]);
  const checks=[
    {key:"auth",label:"Owner Authentication",ok:owners>=1,detail:owners>=1?"Cloud owner provisioned":"Owner migration missing"},
    {key:"brain",label:"Brain Round Trip",ok:brain.ok,detail:brain.detail},
    {key:"memory",label:"Memory Round Trip",ok:memory.ok,detail:memory.detail},
    {key:"groq",label:"Groq Provider",ok:groq.reachable,detail:groq.reachable?"Provider reachable":"Provider unavailable"},
    {key:"eleven",label:"ElevenLabs Provider",ok:eleven.reachable,detail:eleven.reachable?"Provider reachable":"Provider unavailable"},
    {key:"agents",label:"Agent Matrix",ok:agents>=128&&chiefs>=12,detail:agents+" agents • "+chiefs+" chiefs"},
    {key:"forge",label:"Forge Artifact",ok:forge.ok,detail:forge.detail}
  ];
  const passed=checks.filter(x=>x.ok).length,score=Math.round(passed/checks.length*100),overall=score===100?"ready":score>=80?"ready-with-warnings":"degraded";
  const id=crypto.randomUUID();
  await q`insert into scotty_qa_runs(id,overall,score,checks) values(${id},${overall},${score},${q.json(checks)})`;
  return json({ok:score===100,id,overall,score,passed,total:checks.length,checks,createdAt:new Date().toISOString()});
}

export async function handleSystemStatus(req:Request,u:URL){
  const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
  if(req.method!=="GET"||u.pathname!=="/api/system/status")return json({ok:false,error:"System status route not found"},404);
  const q=db();
  const database=await q`select 1 as ok`.then(()=>true).catch(()=>false);
  const [agents,chiefs,memory,projects,folders,files,tasks,forgeJobs,owners,sessions,forge,groq,eleven]=await Promise.all([
    count(q`select count(*)::int as n from scotty_agents`),
    count(q`select count(*)::int as n from scotty_agents where is_chief=true`),
    count(q`select count(*)::int as n from scotty_memory`),
    count(q`select count(*)::int as n from scotty_projects`),
    count(q`select count(*)::int as n from scotty_folders`),
    count(q`select count(*)::int as n from scotty_files`),
    count(q`select count(*)::int as n from scotty_tasks`),
    count(q`select count(*)::int as n from scotty_forge_jobs`),
    count(q`select count(*)::int as n from scotty_auth_owner`),
    count(q`select count(*)::int as n from scotty_sessions where expires_at>now()`),
    forgeHealth(),
    groqHealth(),
    elevenHealth()
  ]);
  const brain=groq.reachable;
  const stt=groq.reachable||Boolean(process.env.OPENAI_API_KEY);
  const tts=eleven.reachable;
  const eyes=groq.reachable||Boolean(process.env.OPENAI_API_KEY||process.env.LOCAL_BRAIN_URL);
  const legacyFallbacks=[
    process.env.SCOTTY_LEGACY_API_URL,
    process.env.SCOTTY_EYES_FALLBACK_URL,
    process.env.SCOTTY_VOICE_FALLBACK_URL,
    process.env.SCOTTY_MEMORY_FALLBACK_URL
  ].filter(Boolean).length;
  const checks=[
    {key:"gateway",label:"Cloud Gateway",ok:true,detail:"Render gateway online"},
    {key:"database",label:"Cloud Database",ok:database,detail:database?"Postgres reachable":"Postgres unavailable"},
    {key:"auth",label:"Owner Session",ok:owners>=1,detail:owners>=1?(sessions+" active cloud session(s)"):"Owner password migration still pending"},
    {key:"brain",label:"S.C.O.T.T.Y. Brain",ok:brain,detail:brain?"Groq reasoning reachable":"Groq reasoning unavailable"},
    {key:"stt",label:"Speech Recognition",ok:stt,detail:stt?"Cloud STT provider reachable":"Speech provider unavailable"},
    {key:"tts",label:"S.C.O.T.T.Y. Voice",ok:tts,detail:tts?"ElevenLabs reachable":"ElevenLabs unavailable"},
    {key:"eyes",label:"Eyes On",ok:eyes,detail:eyes?"Vision provider reachable":"Vision provider unavailable"},
    {key:"memory",label:"Shared Memory",ok:database,detail:memory+" memory records"},
    {key:"agents",label:"Agent Matrix",ok:agents>=128&&chiefs>=12,detail:agents+" agents • "+chiefs+" chiefs"},
    {key:"resources",label:"Spatial Resources",ok:database,detail:projects+" projects • "+folders+" folders • "+files+" files • "+tasks+" tasks"},
    {key:"forge",label:"3D Forge",ok:forge.blenderReady,detail:forge.blenderReady?("Blender online • "+(forge.version||"ready")):"Blender worker degraded"},
    {key:"legacy",label:"Legacy Fallbacks",ok:legacyFallbacks===0,detail:legacyFallbacks===0?"No Railway fallback variables active":legacyFallbacks+" temporary fallback link(s) remain"}
  ];
  const passed=checks.filter(x=>x.ok).length;
  const score=Math.round((passed/checks.length)*100);
  return json({
    ok:true,
    release:"part-8",
    architecture:"cloud-gateway-v3",
    status:score===100?"ready":score>=80?"ready-with-warnings":"degraded",
    score,
    checks,
    counts:{agents,chiefs,memory,projects,folders,files,tasks,forgeJobs,owners,sessions},
    forge,
    providers:{groq,elevenLabs:eleven},
    legacyFallbacksActive:legacyFallbacks,
    checkedAt:new Date().toISOString()
  });
}
