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
