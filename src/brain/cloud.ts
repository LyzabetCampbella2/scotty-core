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
 await q`create table if not exists scotty_projects(
  id text primary key,
  name text not null,
  department text not null default 'S.C.O.T.T.Y.',
  status text not null default 'active',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 )`;
 await q`create table if not exists scotty_folders(
  id text primary key,
  project_id text,
  parent_folder_id text,
  name text not null,
  path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
 )`;
 await q`create table if not exists scotty_tasks(
  id text primary key,
  project_id text,
  assigned_agent_id text,
  title text not null,
  status text not null default 'queued',
  priority text not null default 'normal',
  notes text not null default '',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

function cleanLabel(v:string){
 return String(v||"").trim().replace(/^["'“”]+|["'“”.!?]+$/g,"").trim().slice(0,500);
}
async function findProject(name:string){
 const q=cleanLabel(name);if(!q)return null;
 const exact=await db()`select id,name from scotty_projects where lower(name)=lower(${q}) limit 1`;
 if(exact?.[0])return exact[0];
 const rows=await db()`select id,name from scotty_projects where name ilike ${"%"+q+"%"} order by length(name) asc limit 1`;
 return rows?.[0]||null;
}
async function findAgent(name:string){
 const q=cleanLabel(name);if(!q)return null;
 try{
  const exact=await db()`select id,name from scotty_agents where lower(name)=lower(${q}) limit 1`;
  if(exact?.[0])return exact[0];
  const rows=await db()`select id,name from scotty_agents where name ilike ${"%"+q+"%"} order by is_chief desc,length(name) asc limit 1`;
  return rows?.[0]||null;
 }catch{return null}
}
async function findTask(name:string){
 const q=cleanLabel(name);if(!q)return null;
 const exact=await db()`select id,title,'task' as type from scotty_tasks where lower(title)=lower(${q}) order by updated_at desc limit 1`;
 if(exact?.[0])return exact[0];
 const rows=await db()`select id,title,'task' as type from scotty_tasks where title ilike ${"%"+q+"%"} order by updated_at desc limit 1`;
 if(rows?.[0])return rows[0];
 try{
  const fx=await db()`select id::text as id,title,'forge' as type from scotty_forge_jobs where lower(title)=lower(${q}) or title ilike ${"%"+q+"%"} order by updated_at desc limit 1`;
  if(fx?.[0])return fx[0];
 }catch{}
 return null;
}
async function handleNativeResourceCommand(text:string){
 await ensure();

 let m=text.match(/^\s*(?:create|make|start)\s+(?:a\s+)?project(?:\s+(?:called|named))?\s+(.+?)\s*$/i);
 if(m){
  const name=cleanLabel(m[1]);if(!name)return null;
  const old=await findProject(name);
  if(old)return {reply:`Project ${old.name} already exists.`,focusNode:"project:"+old.id,handled:true,action:"project_exists"};
  const id="project-"+crypto.randomUUID();
  await db()`insert into scotty_projects(id,name,department,status,description) values(${id},${name},'S.C.O.T.T.Y.','active','Created by S.C.O.T.T.Y. command.')`;
  await addActivity("SCOTTY","PROJECT CREATED",name,{projectId:id,source:"voice-command"});
  return {reply:`Created project ${name}.`,focusNode:"project:"+id,handled:true,action:"project_created"};
 }

 m=text.match(/^\s*(?:create|make|add)\s+(?:a\s+)?folder(?:\s+(?:called|named))?\s+(.+?)\s+(?:in|under)\s+(?:project\s+)?(.+?)\s*$/i);
 if(m){
  const name=cleanLabel(m[1]),project=await findProject(m[2]);
  if(!name||!project)return {reply:project?"I need a folder name.":`I could not find project ${cleanLabel(m[2])}.`,handled:true,action:"folder_not_created"};
  const id="folder-"+crypto.randomUUID(),path="/cloud/"+project.id+"/"+name.replace(/[^a-z0-9_-]+/gi,"-").toLowerCase();
  await db()`insert into scotty_folders(id,project_id,name,path) values(${id},${project.id},${name},${path})`;
  await addActivity("SCOTTY","FOLDER CREATED",name,{folderId:id,projectId:project.id});
  return {reply:`Created folder ${name} inside ${project.name}.`,focusNode:"folder:"+id,handled:true,action:"folder_created"};
 }

 m=text.match(/^\s*(?:create|make|add)\s+(?:a\s+)?task(?:\s+(?:called|named))?\s+(.+?)\s*$/i);
 if(m){
  let rest=String(m[1]).trim(),agentName="",projectName="";
  const assign=rest.match(/\s+(?:and\s+)?assign(?:\s+it)?\s+to\s+(.+)$/i);
  if(assign){agentName=cleanLabel(assign[1]);rest=rest.slice(0,assign.index).trim()}
  const projectPart=rest.match(/\s+(?:in|under)\s+project\s+(.+)$/i);
  if(projectPart){projectName=cleanLabel(projectPart[1]);rest=rest.slice(0,projectPart.index).trim()}
  const title=cleanLabel(rest);if(!title)return null;
  const project=projectName?await findProject(projectName):null;
  if(projectName&&!project)return {reply:`I could not find project ${projectName}.`,handled:true,action:"task_not_created"};
  const agent=agentName?await findAgent(agentName):null;
  if(agentName&&!agent)return {reply:`I could not find agent ${agentName}.`,handled:true,action:"task_not_created"};
  const id="task-"+crypto.randomUUID();
  await db()`insert into scotty_tasks(id,project_id,assigned_agent_id,title,status,priority,notes)
   values(${id},${project?.id||null},${agent?.id||null},${title},'queued','normal','Created by S.C.O.T.T.Y. command.')`;
  await addActivity("SCOTTY","TASK CREATED",title,{taskId:id,projectId:project?.id||null,agentId:agent?.id||null});
  const suffix=(project?" in "+project.name:"")+(agent?" and assigned it to "+agent.name:"");
  return {reply:`Created task ${title}${suffix}.`,focusNode:"task:"+id,handled:true,action:"task_created"};
 }

 m=text.match(/^\s*assign\s+(?:the\s+)?task\s+(.+?)\s+to\s+(.+?)\s*$/i);
 if(m){
  const task=await findTask(m[1]),agent=await findAgent(m[2]);
  if(!task)return {reply:`I could not find task ${cleanLabel(m[1])}.`,handled:true,action:"task_not_found"};
  if(!agent)return {reply:`I could not find agent ${cleanLabel(m[2])}.`,handled:true,action:"agent_not_found"};
  if(task.type==="forge"){
   await db()`update scotty_forge_jobs set agent_ids=${db().json([agent.id])},updated_at=now() where id::text=${task.id}`;
   await addActivity("SCOTTY","FORGE TASK ASSIGNED",task.title,{forgeJobId:task.id,agentId:agent.id});
   return {reply:`Assigned Forge task ${task.title} to ${agent.name}.`,focusNode:"task:forge-task-"+task.id,handled:true,action:"forge_task_assigned"};
  }
  await db()`update scotty_tasks set assigned_agent_id=${agent.id},updated_at=now() where id=${task.id}`;
  await addActivity("SCOTTY","TASK ASSIGNED",task.title,{taskId:task.id,agentId:agent.id});
  return {reply:`Assigned task ${task.title} to ${agent.name}.`,focusNode:"task:"+task.id,handled:true,action:"task_assigned"};
 }

 m=text.match(/^\s*move\s+(?:the\s+)?task\s+(.+?)\s+to\s+(?:project\s+)?(.+?)\s*$/i);
 if(m){
  const task=await findTask(m[1]),project=await findProject(m[2]);
  if(!task)return {reply:`I could not find task ${cleanLabel(m[1])}.`,handled:true,action:"task_not_found"};
  if(!project)return {reply:`I could not find project ${cleanLabel(m[2])}.`,handled:true,action:"project_not_found"};
  if(task.type==="forge")await db()`update scotty_forge_jobs set project_id=${project.id},updated_at=now() where id::text=${task.id}`;
  else await db()`update scotty_tasks set project_id=${project.id},updated_at=now() where id=${task.id}`;
  await addActivity("SCOTTY","TASK MOVED",task.title,{taskId:task.id,projectId:project.id});
  return {reply:`Moved task ${task.title} into ${project.name}.`,focusNode:"project:"+project.id,handled:true,action:"task_moved"};
 }
 return null;
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
 const nativeAction=await handleNativeResourceCommand(text);
 if(nativeAction)return json({ok:true,provider:"native",...nativeAction});
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
