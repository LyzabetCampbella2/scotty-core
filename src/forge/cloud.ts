import postgres from "postgres";
import { groqThink,addActivity } from "../brain/cloud.ts";

let sql:any=null,initPromise:Promise<void>|null=null;
function db(){
 if(!sql){
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error("DATABASE_URL missing");
  sql=postgres(url,{max:4,idle_timeout:20,connect_timeout:12,ssl:"require"});
 }
 return sql;
}
async function ensure(){
 if(initPromise)return initPromise;
 initPromise=(async()=>{
  const q=db();
  await q`create table if not exists scotty_forge_jobs(
   id uuid primary key,
   project_id text not null,
   creative_project_id text,
   agent_ids jsonb not null default '[]'::jsonb,
   title text not null,
   task_type text not null default 'scene',
   primitive text,
   source_images jsonb not null default '[]'::jsonb,
   asset_paths jsonb not null default '[]'::jsonb,
   input_blend_file text,
   notes text not null default '',
   destructive boolean not null default false,
   replace_existing boolean not null default false,
   status text not null default 'queued',
   progress integer not null default 0,
   plan jsonb not null default '{}'::jsonb,
   output_blend text,
   preview_svg text,
   error text,
   approved_at timestamptz,
   started_at timestamptz,
   completed_at timestamptz,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
  )`;
  await q`create index if not exists scotty_forge_jobs_created_idx on scotty_forge_jobs(created_at desc)`;
  await q`alter table scotty_forge_jobs add column if not exists blend_bytes bytea`;
  await q`alter table scotty_forge_jobs add column if not exists preview_png bytea`;
  await q`alter table scotty_forge_jobs add column if not exists glb_bytes bytea`;
 })();
 return initPromise;
}
const j=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{"cache-control":"no-store",...headers}});
function esc(s:string){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c))}
function previewSvg(row:any){
 const title=esc(String(row.title||"S.C.O.T.T.Y. Forge"));
 const primitive=esc(String(row.primitive||row.taskType||"scene"));
 const status=esc(String(row.status||"queued").replaceAll("_"," "));
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
 <defs><radialGradient id="g"><stop stop-color="#0b3348"/><stop offset="1" stop-color="#020812"/></radialGradient></defs>
 <rect width="960" height="540" fill="url(#g)"/>
 <g fill="none" stroke="#5eeaff" opacity=".28">${Array.from({length:13},(_,i)=>`<path d="M0 ${40+i*38}H960"/>`).join("")}${Array.from({length:21},(_,i)=>`<path d="M${i*48} 0V540"/>`).join("")}</g>
 <g transform="translate(480 265)" fill="#071827" stroke="#5eeaff" stroke-width="5">
  <circle r="108"/><path d="M-76-76 76-76 110 0 76 76-76 76-110 0Z"/><circle r="34" fill="#0c4258"/>
 </g>
 <text x="48" y="64" fill="#ddf8ff" font-size="28" font-family="system-ui" font-weight="700">${title}</text>
 <text x="48" y="101" fill="#8da8ba" font-size="18" font-family="system-ui">CLOUD FORGE • ${primitive.toUpperCase()}</text>
 <text x="48" y="500" fill="#ffd166" font-size="16" font-family="system-ui">STATUS: ${status.toUpperCase()}</text>
 </svg>`;
}
function mapRow(r:any){
 return {
  id:r.id,projectId:r.projectId,creativeProjectId:r.creativeProjectId,agentIds:r.agentIds||[],title:r.title,
  taskType:r.taskType,primitive:r.primitive,sourceImages:r.sourceImages||[],assetPaths:r.assetPaths||[],
  inputBlendFile:r.inputBlendFile,notes:r.notes,destructive:r.destructive,replaceExisting:r.replaceExisting,
  status:r.status,progress:r.progress,plan:r.plan||{},outputBlend:r.outputBlend,error:r.error,
  createdAt:r.createdAt,updatedAt:r.updatedAt
 };
}
async function row(id:string){
 const r=await db()`select id,project_id as "projectId",creative_project_id as "creativeProjectId",agent_ids as "agentIds",title,task_type as "taskType",primitive,source_images as "sourceImages",asset_paths as "assetPaths",input_blend_file as "inputBlendFile",notes,destructive,replace_existing as "replaceExisting",status,progress,plan,output_blend as "outputBlend",preview_svg as "previewSvg",error,created_at as "createdAt",updated_at as "updatedAt" from scotty_forge_jobs where id=${id} limit 1`;
 return r?.[0]||null;
}
async function createPlan(job:any){
 try{
  const prompt=`Create a concise Blender execution plan for this S.C.O.T.T.Y. Forge job.
Title: ${job.title}
Task type: ${job.taskType}
Primitive: ${job.primitive||"none"}
Notes: ${job.notes||"none"}
Destructive edit: ${job.destructive?"yes":"no"}
Replace export: ${job.replaceExisting?"yes":"no"}
Return JSON only with keys: summary, sceneSteps, materials, camera, lighting, exportChecks. Do not claim anything has executed.`;
  const r=await groqThink([{role:"system",content:"You are S.C.O.T.T.Y. Forge Planner. Return valid compact JSON only."},{role:"user",content:prompt}],700);
  try{return JSON.parse(r.text)}catch{return {summary:r.text,sceneSteps:[]}}
 }catch{return {summary:"Cloud scene plan queued.",sceneSteps:[]}}
}
async function processJob(id:string){
 const x=await row(id);if(!x||x.status==="cancelled"||x.status==="awaiting_approval")return;
 const worker=String(process.env.SCOTTY_FORGE_WORKER_URL||"").replace(/\/$/,"");
 if(!worker){
  await db()`update scotty_forge_jobs set status='waiting_for_blender',progress=25,error=null,updated_at=now() where id=${id}`;
  await addActivity("FORGE","WAITING FOR CLOUD BLENDER",x.title,{jobId:id});
  return;
 }
 await db()`update scotty_forge_jobs set status='working',progress=35,started_at=coalesce(started_at,now()),error=null,updated_at=now() where id=${id}`;
 try{
  const payload={jobId:id,title:x.title,taskType:x.taskType,primitive:x.primitive,notes:x.notes,plan:x.plan,inputBlendFile:x.inputBlendFile,sourceImages:x.sourceImages,assetPaths:x.assetPaths};
  const headers:Record<string,string>={"content-type":"application/json"};
  if(process.env.SCOTTY_FORGE_WORKER_TOKEN)headers.authorization="Bearer "+process.env.SCOTTY_FORGE_WORKER_TOKEN;
  const r=await fetch(worker+"/run",{method:"POST",headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)});
  const out:any=await r.json().catch(()=>({}));
  if(!r.ok||!out?.ok)throw new Error(String(out?.error||"Cloud Blender worker failed"));
  const blend=out.blendBase64?Uint8Array.fromBase64(String(out.blendBase64)):null;
  const png=out.previewPngBase64?Uint8Array.fromBase64(String(out.previewPngBase64)):null;
  const glb=out.glbBase64?Uint8Array.fromBase64(String(out.glbBase64)):null;
  const svg=String(out.previewSvg||previewSvg({...x,status:"exported"}));
  const output=blend?("/forge/api/jobs/"+id+"/blend"):String(out.outputBlend||"cloud://forge/"+id+".blend");
  await db()`update scotty_forge_jobs set status='exported',progress=100,output_blend=${output},preview_svg=${svg},blend_bytes=${blend},preview_png=${png},glb_bytes=${glb},error=null,completed_at=now(),updated_at=now() where id=${id}`;
  await addActivity("FORGE","EXPORT COMPLETE",x.title,{jobId:id,outputBlend:out.outputBlend||null});
 }catch(e:any){
  await db()`update scotty_forge_jobs set status='failed',progress=100,error=${String(e?.message||e).slice(0,1200)},completed_at=now(),updated_at=now() where id=${id}`;
  await addActivity("FORGE","FORGE ERROR",String(e?.message||e).slice(0,280),{jobId:id});
 }
}

export async function handleCloudForge(req:Request,u:URL){
 await ensure();
 const p=u.pathname;
 if(req.method==="GET"&&p==="/forge/api/health"){
  const rows=await db()`select status,count(*)::int as n from scotty_forge_jobs group by status`;
  const counts:any={queued:0,working:0,exported:0,waitingForBlender:0};
  for(const x of rows){const n=Number(x.n||0);if(x.status==="queued")counts.queued=n;else if(x.status==="working")counts.working=n;else if(x.status==="exported")counts.exported=n;else if(x.status==="waiting_for_blender")counts.waitingForBlender=n}
  let blenderReady=false,blenderVersion:string|null=null;
  const worker=String(process.env.SCOTTY_FORGE_WORKER_URL||"").replace(/\/$/,"");
  if(worker){try{const wr=await fetch(worker+"/health",{signal:AbortSignal.timeout(8000)});const w:any=await wr.json().catch(()=>({}));blenderReady=Boolean(wr.ok&&w?.blenderReady);blenderVersion=w?.version||null}catch{}}
  return j({ok:true,provider:"render-postgres",blenderReady,blenderVersion,workerConfigured:Boolean(worker),counts});
 }
 if(req.method==="GET"&&p==="/forge/api/jobs"){
  const rows=await db()`select id,project_id as "projectId",creative_project_id as "creativeProjectId",agent_ids as "agentIds",title,task_type as "taskType",primitive,source_images as "sourceImages",asset_paths as "assetPaths",input_blend_file as "inputBlendFile",notes,destructive,replace_existing as "replaceExisting",status,progress,plan,output_blend as "outputBlend",error,created_at as "createdAt",updated_at as "updatedAt" from scotty_forge_jobs order by created_at desc limit 100`;
  return j({ok:true,jobs:rows.map(mapRow)});
 }
 if(req.method==="POST"&&p==="/forge/api/jobs"){
  let b:any;try{b=await req.json()}catch{return j({ok:false,error:"Invalid JSON"},400)}
  const id=crypto.randomUUID(),title=String(b?.title||"Untitled Forge Job").trim().slice(0,240),projectId=String(b?.projectId||"SCOTTY").trim().slice(0,240);
  const destructive=Boolean(b?.destructive),replaceExisting=Boolean(b?.replaceExisting),needsApproval=destructive||replaceExisting;
  const base={title,taskType:String(b?.taskType||"scene").slice(0,80),primitive:String(b?.primitive||"").slice(0,80),notes:String(b?.notes||"").slice(0,6000),destructive,replaceExisting};
  const plan=await createPlan(base);
  const status=needsApproval?"awaiting_approval":(process.env.SCOTTY_FORGE_WORKER_URL?"queued":"waiting_for_blender");
  const svg=previewSvg({...base,status});
  await db()`insert into scotty_forge_jobs(id,project_id,creative_project_id,agent_ids,title,task_type,primitive,source_images,asset_paths,input_blend_file,notes,destructive,replace_existing,status,progress,plan,preview_svg)
   values(${id},${projectId},${b?.creativeProjectId?String(b.creativeProjectId).slice(0,240):null},${db().json(Array.isArray(b?.agentIds)?b.agentIds:[])},${title},${base.taskType},${base.primitive||null},${db().json(Array.isArray(b?.sourceImages)?b.sourceImages:[])},${db().json(Array.isArray(b?.assetPaths)?b.assetPaths:[])},${b?.inputBlendFile?String(b.inputBlendFile).slice(0,1000):null},${base.notes},${destructive},${replaceExisting},${status},${needsApproval?0:20},${db().json(plan)},${svg})`;
  await addActivity("FORGE",needsApproval?"APPROVAL REQUIRED":"FORGE QUEUED",title,{jobId:id,projectId});
  if(!needsApproval&&process.env.SCOTTY_FORGE_WORKER_URL)queueMicrotask(()=>processJob(id));
  return j({ok:true,id,status,plan},201);
 }
 const act=p.match(/^\/forge\/api\/jobs\/([0-9a-f-]+)\/(approve|retry|cancel)$/i);
 if(req.method==="POST"&&act){
  const id=act[1],action=act[2].toLowerCase(),x=await row(id);if(!x)return j({ok:false,error:"Forge job not found"},404);
  if(action==="cancel"){
   await db()`update scotty_forge_jobs set status='cancelled',progress=100,error=null,completed_at=now(),updated_at=now() where id=${id}`;
   await addActivity("FORGE","JOB CANCELLED",x.title,{jobId:id});return j({ok:true,id,status:"cancelled"});
  }
  if(action==="approve"){
   const status=process.env.SCOTTY_FORGE_WORKER_URL?"queued":"waiting_for_blender";
   await db()`update scotty_forge_jobs set status=${status},progress=20,approved_at=now(),error=null,updated_at=now() where id=${id}`;
   await addActivity("FORGE","JOB APPROVED",x.title,{jobId:id});if(process.env.SCOTTY_FORGE_WORKER_URL)queueMicrotask(()=>processJob(id));return j({ok:true,id,status});
  }
  const status=process.env.SCOTTY_FORGE_WORKER_URL?"queued":"waiting_for_blender";
  await db()`update scotty_forge_jobs set status=${status},progress=20,error=null,completed_at=null,updated_at=now() where id=${id}`;
  await addActivity("FORGE","JOB RETRY",x.title,{jobId:id});if(process.env.SCOTTY_FORGE_WORKER_URL)queueMicrotask(()=>processJob(id));return j({ok:true,id,status});
 }
 const prev=p.match(/^\/forge\/api\/jobs\/([0-9a-f-]+)\/preview$/i);
 if(req.method==="GET"&&prev){
  const bytes=await db()`select preview_png as "previewPng",preview_svg as "previewSvg",title,primitive,task_type as "taskType",status from scotty_forge_jobs where id=${prev[1]} limit 1`;
  const x:any=bytes?.[0];if(!x)return new Response("Not found",{status:404});
  if(x.previewPng)return new Response(x.previewPng,{headers:{"content-type":"image/png","cache-control":"private, max-age=60"}});
  return new Response(x.previewSvg||previewSvg(x),{headers:{"content-type":"image/svg+xml; charset=utf-8","cache-control":"no-store"}});
 }
 const artifact=p.match(/^\/forge\/api\/jobs\/([0-9a-f-]+)\/(blend|glb)$/i);
 if(req.method==="GET"&&artifact){
  const kind=artifact[2].toLowerCase();
  const rows=kind==="blend"
   ? await db()`select blend_bytes as bytes,title from scotty_forge_jobs where id=${artifact[1]} limit 1`
   : await db()`select glb_bytes as bytes,title from scotty_forge_jobs where id=${artifact[1]} limit 1`;
  const x:any=rows?.[0];if(!x||!x.bytes)return new Response("Artifact not available",{status:404});
  const safe=String(x.title||"scotty-forge").replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,80)||"scotty-forge";
  const ext=kind==="blend"?"blend":"glb";
  const type=kind==="blend"?"application/octet-stream":"model/gltf-binary";
  return new Response(x.bytes,{headers:{"content-type":type,"content-disposition":`attachment; filename="${safe}.${ext}"`,"cache-control":"private, max-age=60"}});
 }
 return j({ok:false,error:"Forge route not found"},404);
}
