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

export function handleHealth(){
  return Response.json({ok:true,service:"scotty-core",architecture:"cloud-gateway-v3",time:new Date().toISOString()},{headers:{"cache-control":"no-store"}});
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
  const [agents,chiefs,memory,projects,folders,files,tasks,forgeJobs,forge]=await Promise.all([
    count(q`select count(*)::int as n from scotty_agents`),
    count(q`select count(*)::int as n from scotty_agents where is_chief=true`),
    count(q`select count(*)::int as n from scotty_memory`),
    count(q`select count(*)::int as n from scotty_projects`),
    count(q`select count(*)::int as n from scotty_folders`),
    count(q`select count(*)::int as n from scotty_files`),
    count(q`select count(*)::int as n from scotty_tasks`),
    count(q`select count(*)::int as n from scotty_forge_jobs`),
    forgeHealth()
  ]);
  const brain=Boolean(process.env.GROQ_API_KEY);
  const stt=Boolean(process.env.GROQ_API_KEY||process.env.OPENAI_API_KEY);
  const tts=Boolean(process.env.ELEVENLABS_API_KEY);
  const eyes=Boolean(process.env.GROQ_API_KEY||process.env.OPENAI_API_KEY||process.env.LOCAL_BRAIN_URL);
  const checks=[
    {key:"gateway",label:"Cloud Gateway",ok:true,detail:"Render gateway online"},
    {key:"database",label:"Cloud Database",ok:database,detail:database?"Postgres reachable":"Postgres unavailable"},
    {key:"brain",label:"S.C.O.T.T.Y. Brain",ok:brain,detail:brain?"Cloud reasoning configured":"Reasoning provider missing"},
    {key:"stt",label:"Speech Recognition",ok:stt,detail:stt?"Cloud STT configured":"Speech provider missing"},
    {key:"tts",label:"S.C.O.T.T.Y. Voice",ok:tts,detail:tts?"ElevenLabs configured":"Voice provider missing"},
    {key:"eyes",label:"Eyes On",ok:eyes,detail:eyes?"Vision provider configured":"Vision provider missing"},
    {key:"memory",label:"Shared Memory",ok:database,detail:memory+" memory records"},
    {key:"agents",label:"Agent Matrix",ok:agents>=128&&chiefs>=12,detail:agents+" agents • "+chiefs+" chiefs"},
    {key:"resources",label:"Spatial Resources",ok:database,detail:projects+" projects • "+folders+" folders • "+files+" files • "+tasks+" tasks"},
    {key:"forge",label:"3D Forge",ok:forge.blenderReady,detail:forge.blenderReady?("Blender online • "+(forge.version||"ready")):"Blender worker degraded"}
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
    counts:{agents,chiefs,memory,projects,folders,files,tasks,forgeJobs},
    forge,
    checkedAt:new Date().toISOString()
  });
}
