import postgres from "postgres";

type MemoryInput={scope?:string;kind?:string;agentId?:string;projectId?:string;text?:string;metadata?:unknown};
let sql:any=null;
let initPromise:Promise<void>|null=null;

function db(){
 if(!sql){
  const url=process.env.DATABASE_URL;
  if(!url) throw new Error("DATABASE_URL missing");
  sql=postgres(url,{max:4,idle_timeout:20,connect_timeout:12,ssl:"require"});
 }
 return sql;
}
async function ensure(){
 if(initPromise)return initPromise;
 initPromise=(async()=>{
  const q=db();
  await q`
   create table if not exists scotty_memory (
    id bigserial primary key,
    scope text not null default 'shared',
    kind text not null default 'note',
    agent_id text,
    project_id text,
    text_content text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
   )
  `;
  await q`create index if not exists scotty_memory_scope_created_idx on scotty_memory(scope,created_at desc)`;
 })();
 return initPromise;
}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});

export async function handleCloudMemory(req:Request,u:URL){
 if(u.pathname==="/api/memory/status"&&req.method==="GET"){
  if(!process.env.DATABASE_URL)return json({ok:true,feature:"memory",databaseConfigured:false,ready:false});
  try{await ensure();const r=await db()`select 1 as ok`;return json({ok:true,feature:"memory",databaseConfigured:true,ready:Boolean(r?.[0]?.ok)})}
  catch{return json({ok:true,feature:"memory",databaseConfigured:true,ready:false},503)}
 }
 if(!process.env.DATABASE_URL)return json({ok:false,error:"Memory database not configured"},503);
 await ensure();
 if(u.pathname==="/api/memory/remember"&&req.method==="POST"){
  let body:MemoryInput;try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const text=String(body?.text||"").trim();if(!text)return json({ok:false,error:"Missing memory text"},400);
  const scope=String(body?.scope||"shared").slice(0,120),kind=String(body?.kind||"note").slice(0,80);
  const agentId=body?.agentId?String(body.agentId).slice(0,160):null,projectId=body?.projectId?String(body.projectId).slice(0,160):null;
  const metadata=body?.metadata&&typeof body.metadata==="object"?body.metadata:{};
  const r=await db()`insert into scotty_memory(scope,kind,agent_id,project_id,text_content,metadata)
    values(${scope},${kind},${agentId},${projectId},${text},${db().json(metadata)}) returning id,created_at`;
  return json({ok:true,id:r[0].id,createdAt:r[0].created_at},201);
 }
 if(u.pathname==="/api/memory/recall"&&req.method==="GET"){
  const scope=String(u.searchParams.get("scope")||"shared").slice(0,120);
  const q=String(u.searchParams.get("q")||"").trim().slice(0,500);
  const limit=Math.max(1,Math.min(50,Number(u.searchParams.get("limit")||20)||20));
  const rows=q
   ? await db()`select id,scope,kind,agent_id as "agentId",project_id as "projectId",text_content as text,metadata,created_at as "createdAt"
       from scotty_memory where scope=${scope} and text_content ilike ${"%"+q+"%"} order by created_at desc limit ${limit}`
   : await db()`select id,scope,kind,agent_id as "agentId",project_id as "projectId",text_content as text,metadata,created_at as "createdAt"
       from scotty_memory where scope=${scope} order by created_at desc limit ${limit}`;
  return json({ok:true,memories:rows});
 }
 if(u.pathname==="/api/memory/recent"&&req.method==="GET"){
  const limit=Math.max(1,Math.min(100,Number(u.searchParams.get("limit")||30)||30));
  const rows=await db()`select id,scope,kind,agent_id as "agentId",project_id as "projectId",text_content as text,metadata,created_at as "createdAt"
    from scotty_memory order by created_at desc limit ${limit}`;
  return json({ok:true,memories:rows});
 }
 return json({ok:false,error:"Memory route not found"},404);
}
