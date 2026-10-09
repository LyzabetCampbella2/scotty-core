import postgres from "postgres";
import { addActivity } from "../brain/cloud.ts";

let sql:any=null,initPromise:Promise<void>|null=null;
function db(){
 if(!sql){
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error("DATABASE_URL missing");
  sql=postgres(url,{max:5,idle_timeout:20,connect_timeout:12,ssl:"require"});
 }
 return sql;
}
async function ensure(){
 if(initPromise)return initPromise;
 initPromise=(async()=>{
  const q=db();
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
  await q`create table if not exists scotty_files(
    id text primary key,
    project_id text,
    folder_id text,
    name text not null,
    path text not null default '',
    mime_type text,
    size_bytes bigint not null default 0,
    metadata jsonb not null default '{}'::jsonb,
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
  await q`create table if not exists scotty_resource_links(
    id bigserial primary key,
    source_type text not null,
    source_id text not null,
    target_type text not null,
    target_id text not null,
    relation text not null,
    status text not null default 'accepted',
    created_at timestamptz not null default now(),
    unique(source_type,source_id,target_type,target_id,relation)
  )`;
  await q`insert into scotty_projects(id,name,department,status,description)
    values
      ('system-scotty','S.C.O.T.T.Y. CLOUD','Command','active','Cloud command, memory, voice, vision, agents and orchestration.'),
      ('system-forge','3D FORGE','Creative Lab','active','Cloud Blender generation and 3D export pipeline.')
    on conflict(id) do update set name=excluded.name,department=excluded.department,status=excluded.status,description=excluded.description,updated_at=now()`;
  await q`insert into scotty_folders(id,project_id,name,path)
    values
      ('folder-core-systems','system-scotty','Core Systems','/cloud/core'),
      ('folder-shared-memory','system-scotty','Shared Memory','/cloud/memory'),
      ('folder-forge-exports','system-forge','Forge Exports','/cloud/forge/exports')
    on conflict(id) do update set project_id=excluded.project_id,name=excluded.name,path=excluded.path,updated_at=now()`;
 })();
 return initPromise;
}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});

function projectRow(r:any){return {id:r.id,name:r.name,department:r.department,status:r.status,description:r.description,createdAt:r.createdAt,updatedAt:r.updatedAt}}
function folderRow(r:any){return {id:r.id,projectId:r.projectId||null,parentFolderId:r.parentFolderId||null,name:r.name,path:r.path,createdAt:r.createdAt,updatedAt:r.updatedAt}}
function fileRow(r:any){return {id:r.id,projectId:r.projectId||null,folderId:r.folderId||null,name:r.name,path:r.path,mimeType:r.mimeType||null,sizeBytes:Number(r.sizeBytes||0),metadata:r.metadata||{},createdAt:r.createdAt,updatedAt:r.updatedAt}}
function taskRow(r:any){return {id:r.id,projectId:r.projectId||null,assignedAgentId:r.assignedAgentId||null,title:r.title,status:r.status,priority:r.priority,notes:r.notes,dueAt:r.dueAt||null,createdAt:r.createdAt,updatedAt:r.updatedAt}}

async function syncForgeProjects(){
 try{
  const rows=await db()`select distinct project_id as "projectId" from scotty_forge_jobs where project_id is not null and project_id<>'' limit 50`;
  for(const x of rows){
   const id=String(x.projectId||"").slice(0,180);if(!id)continue;
   const name=id==="SCOTTY-SYSTEM"?"S.C.O.T.T.Y. SYSTEM":id;
   await db()`insert into scotty_projects(id,name,department,status,description)
    values(${id},${name},'Creative Lab','active','Project referenced by the cloud Forge pipeline.')
    on conflict(id) do nothing`;
  }
 }catch{}
}
async function forgeVirtuals(){
 let jobs:any[]=[];
 try{
  jobs=await db()`select id::text as id,project_id as "projectId",agent_ids as "agentIds",title,task_type as "taskType",status,progress,output_blend as "outputBlend",created_at as "createdAt",updated_at as "updatedAt",(blend_bytes is not null) as "blendReady",(glb_bytes is not null) as "glbReady" from scotty_forge_jobs order by created_at desc limit 40`;
 }catch{}
 const tasks=jobs.map(x=>({
  id:"forge-task-"+x.id,source:"forge",sourceId:x.id,projectId:x.projectId||"system-forge",
  assignedAgentId:Array.isArray(x.agentIds)&&x.agentIds.length?String(x.agentIds[0]):null,
  title:x.title,status:x.status,priority:"normal",notes:`Forge ${x.taskType||"scene"} • ${Number(x.progress||0)}%`,
  dueAt:null,createdAt:x.createdAt,updatedAt:x.updatedAt
 }));
 const files:any[]=[];
 for(const x of jobs){
  if(x.blendReady)files.push({id:"forge-blend-"+x.id,source:"forge",sourceId:x.id,projectId:x.projectId||"system-forge",folderId:"folder-forge-exports",name:x.title+".blend",path:"/forge/api/jobs/"+x.id+"/blend",mimeType:"application/octet-stream",sizeBytes:0,metadata:{artifact:"blend",forgeJobId:x.id},createdAt:x.createdAt,updatedAt:x.updatedAt});
  if(x.glbReady)files.push({id:"forge-glb-"+x.id,source:"forge",sourceId:x.id,projectId:x.projectId||"system-forge",folderId:"folder-forge-exports",name:x.title+".glb",path:"/forge/api/jobs/"+x.id+"/glb",mimeType:"model/gltf-binary",sizeBytes:0,metadata:{artifact:"glb",forgeJobId:x.id},createdAt:x.createdAt,updatedAt:x.updatedAt});
 }
 return {tasks,files};
}
async function getResources(){
 await ensure();await syncForgeProjects();
 const [projects,folders,files,tasks,virtuals]=await Promise.all([
  db()`select id,name,department,status,description,created_at as "createdAt",updated_at as "updatedAt" from scotty_projects order by created_at asc,name asc`,
  db()`select id,project_id as "projectId",parent_folder_id as "parentFolderId",name,path,created_at as "createdAt",updated_at as "updatedAt" from scotty_folders order by created_at asc,name asc`,
  db()`select id,project_id as "projectId",folder_id as "folderId",name,path,mime_type as "mimeType",size_bytes as "sizeBytes",metadata,created_at as "createdAt",updated_at as "updatedAt" from scotty_files order by created_at desc limit 200`,
  db()`select id,project_id as "projectId",assigned_agent_id as "assignedAgentId",title,status,priority,notes,due_at as "dueAt",created_at as "createdAt",updated_at as "updatedAt" from scotty_tasks order by created_at desc limit 200`,
  forgeVirtuals()
 ]);
 return {
  projects:projects.map(projectRow),
  folders:folders.map(folderRow),
  files:[...files.map(fileRow),...virtuals.files],
  tasks:[...tasks.map(taskRow),...virtuals.tasks]
 };
}
function newId(kind:string){return kind+"-"+crypto.randomUUID()}
function splitNodeId(v:string){
 const i=v.indexOf(":");if(i<1)return {type:"",id:v};
 return {type:v.slice(0,i),id:v.slice(i+1)};
}
async function relate(sourceNode:string,targetNode:string){
 const s=splitNodeId(sourceNode),t=splitNodeId(targetNode);
 if(!s.type||!t.type)throw new Error("Invalid node relationship");
 if(s.type==="task"&&t.type==="agent"){
  if(s.id.startsWith("forge-task-")){
   const job=s.id.slice("forge-task-".length);
   await db()`update scotty_forge_jobs set agent_ids=${db().json([t.id])},updated_at=now() where id::text=${job}`;
  }else{
   await db()`update scotty_tasks set assigned_agent_id=${t.id},updated_at=now() where id=${s.id}`;
  }
  await addActivity("SCOTTY","TASK REASSIGNED",`${s.id} → ${t.id}`,{sourceNode,targetNode});
  return {relation:"assigned_to",message:"Task assigned to "+t.id};
 }
 if(s.type==="task"&&t.type==="project"){
  if(s.id.startsWith("forge-task-")){
   const job=s.id.slice("forge-task-".length);
   await db()`update scotty_forge_jobs set project_id=${t.id},updated_at=now() where id::text=${job}`;
  }else{
   await db()`update scotty_tasks set project_id=${t.id},updated_at=now() where id=${s.id}`;
  }
  await addActivity("SCOTTY","TASK MOVED",`${s.id} → ${t.id}`,{sourceNode,targetNode});
  return {relation:"belongs_to",message:"Task moved to project"};
 }
 if(s.type==="file"&&t.type==="folder"&&!s.id.startsWith("forge-")){
  await db()`update scotty_files set folder_id=${t.id},updated_at=now() where id=${s.id}`;
  await addActivity("SCOTTY","FILE MOVED",`${s.id} → ${t.id}`,{sourceNode,targetNode});
  return {relation:"contained_in",message:"File moved into folder"};
 }
 if(s.type==="folder"&&t.type==="project"){
  await db()`update scotty_folders set project_id=${t.id},updated_at=now() where id=${s.id}`;
  await addActivity("SCOTTY","FOLDER MOVED",`${s.id} → ${t.id}`,{sourceNode,targetNode});
  return {relation:"belongs_to",message:"Folder moved to project"};
 }
 await db()`insert into scotty_resource_links(source_type,source_id,target_type,target_id,relation,status)
  values(${s.type},${s.id},${t.type},${t.id},'related_to','suggested')
  on conflict(source_type,source_id,target_type,target_id,relation) do update set status='suggested'`;
 await addActivity("SCOTTY","RELATIONSHIP SUGGESTED",`${sourceNode} ↔ ${targetNode}`,{sourceNode,targetNode});
 return {relation:"related_to",suggested:true,message:"Relationship suggested"};
}

export async function handleCloudResources(req:Request,u:URL){
 await ensure();
 if(req.method==="GET"&&u.pathname==="/api/hud/resources"){
  const data=await getResources();
  return json({ok:true,...data,counts:{projects:data.projects.length,folders:data.folders.length,files:data.files.length,tasks:data.tasks.length}});
 }
 if(req.method==="GET"&&u.pathname==="/api/hud/resources/status"){
  const data=await getResources();
  return json({ok:true,provider:"render-postgres",counts:{projects:data.projects.length,folders:data.folders.length,files:data.files.length,tasks:data.tasks.length}});
 }
 if(req.method==="POST"&&u.pathname==="/api/hud/resources"){
  let b:any;try{b=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const kind=String(b?.kind||"").toLowerCase();
  if(kind==="project"){
   const id=newId("project"),name=String(b?.name||"Untitled Project").trim().slice(0,240);
   await db()`insert into scotty_projects(id,name,department,status,description) values(${id},${name},${String(b?.department||"S.C.O.T.T.Y.").slice(0,160)},'active',${String(b?.description||"").slice(0,4000)})`;
   await addActivity("SCOTTY","PROJECT CREATED",name,{projectId:id});return json({ok:true,id,kind},201);
  }
  if(kind==="folder"){
   const id=newId("folder"),name=String(b?.name||"New Folder").trim().slice(0,240);
   await db()`insert into scotty_folders(id,project_id,parent_folder_id,name,path) values(${id},${b?.projectId?String(b.projectId):null},${b?.parentFolderId?String(b.parentFolderId):null},${name},${String(b?.path||"").slice(0,1200)})`;
   return json({ok:true,id,kind},201);
  }
  if(kind==="file"){
   const id=newId("file"),name=String(b?.name||"Untitled File").trim().slice(0,240);
   await db()`insert into scotty_files(id,project_id,folder_id,name,path,mime_type,size_bytes,metadata) values(${id},${b?.projectId?String(b.projectId):null},${b?.folderId?String(b.folderId):null},${name},${String(b?.path||"").slice(0,1600)},${b?.mimeType?String(b.mimeType).slice(0,180):null},${Math.max(0,Number(b?.sizeBytes||0)||0)},${db().json(b?.metadata&&typeof b.metadata==="object"?b.metadata:{})})`;
   return json({ok:true,id,kind},201);
  }
  if(kind==="task"){
   const id=newId("task"),title=String(b?.title||"Untitled Task").trim().slice(0,500);
   await db()`insert into scotty_tasks(id,project_id,assigned_agent_id,title,status,priority,notes) values(${id},${b?.projectId?String(b.projectId):null},${b?.assignedAgentId?String(b.assignedAgentId):null},${title},${String(b?.status||"queued").slice(0,80)},${String(b?.priority||"normal").slice(0,80)},${String(b?.notes||"").slice(0,6000)})`;
   await addActivity("SCOTTY","TASK CREATED",title,{taskId:id});return json({ok:true,id,kind},201);
  }
  return json({ok:false,error:"Unsupported resource kind"},400);
 }
 if(req.method==="POST"&&u.pathname==="/api/hud/resources/relate"){
  let b:any;try{b=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const sourceNode=String(b?.sourceNode||""),targetNode=String(b?.targetNode||"");
  if(!sourceNode||!targetNode||sourceNode===targetNode)return json({ok:false,error:"Two different nodes are required"},400);
  try{return json({ok:true,...await relate(sourceNode,targetNode)})}catch(e:any){return json({ok:false,error:String(e?.message||"Relationship failed")},400)}
 }
 return json({ok:false,error:"Resource route not found"},404);
}
