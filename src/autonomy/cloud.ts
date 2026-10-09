import postgres from "postgres";
import { groqThink,addActivity } from "../brain/cloud.ts";
import { getAgentsByIds,memoryContext,runAgent } from "../agents/cloud.ts";
import { executeProviderAction } from "../providers/cloud.ts";

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
  await q`create table if not exists scotty_missions(
    id uuid primary key,
    title text not null,
    goal text not null,
    project_id text,
    autonomy_mode text not null default 'supervised',
    priority text not null default 'normal',
    status text not null default 'queued',
    summary text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
  )`;
  await q`create table if not exists scotty_mission_steps(
    id uuid primary key,
    mission_id uuid not null references scotty_missions(id) on delete cascade,
    step_no integer not null,
    title text not null,
    instruction text not null,
    action_type text not null default 'internal_analysis',
    assigned_chief_id text,
    assigned_agent_ids jsonb not null default '[]'::jsonb,
    requires_approval boolean not null default false,
    status text not null default 'pending',
    result text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz,
    unique(mission_id,step_no)
  )`;
  await q`alter table scotty_mission_steps add column if not exists action_provider text`;
  await q`alter table scotty_mission_steps add column if not exists action_operation text`;
  await q`alter table scotty_mission_steps add column if not exists action_payload jsonb not null default '{}'::jsonb`;
  await q`alter table scotty_mission_steps add column if not exists approval_granted boolean not null default false`;
  await q`create table if not exists scotty_approvals(
    id uuid primary key,
    mission_id uuid not null references scotty_missions(id) on delete cascade,
    step_id uuid references scotty_mission_steps(id) on delete cascade,
    action_type text not null,
    description text not null,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    decided_at timestamptz
  )`;
  await q`create index if not exists scotty_missions_status_idx on scotty_missions(status,updated_at desc)`;
  await q`create index if not exists scotty_mission_steps_mission_idx on scotty_mission_steps(mission_id,step_no)`;
  await q`create index if not exists scotty_approvals_status_idx on scotty_approvals(status,created_at desc)`;
 })();
 return initPromise;
}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});

function cleanJson(raw:string){
 const s=String(raw||"").trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"");
 const a=s.indexOf("{"),b=s.lastIndexOf("}");
 if(a>=0&&b>a)return s.slice(a,b+1);
 return s;
}
async function chiefs(){
 const rows=await db()`select id,name,department from scotty_agents where is_chief=true order by sort_order asc,name asc`;
 return rows;
}
function chooseChief(goal:string,rows:any[]){
 const g=goal.toLowerCase();
 const hints:[RegExp,string][]=[
  [/security|privacy|risk|protect|threat/,"Security & Defense"],
  [/research|fact|investigate|compare|find out/,"Research & Intelligence"],
  [/money|budget|business|price|finance|sell|revenue/,"Commerce & Finance"],
  [/message|email|social|language|translate|communicat/,"Communications & Languages"],
  [/engineer|code|system|deploy|technical|bug|build/,"Engineering & Systems"],
  [/science|environment|biology|experiment/,"Science & Environment"],
  [/policy|legal|diplom|rule|visa|government/,"Policy & Diplomacy"],
  [/health|wellness|human|support/,"Health & Human Support"],
  [/write|creative|story|design|content/,"Creative & Knowledge"],
  [/operation|schedule|organize|workflow|coordinate/,"Operations & Coordination"],
  [/mission|execute|launch|command/,"Command & Missions"],
  [/strategy|plan|reason|decide|analy/,"Strategy & Reasoning"]
 ];
 const dept=hints.find(([r])=>r.test(g))?.[1];
 return rows.find(x=>x.department===dept)||rows.find(x=>x.department==="Strategy & Reasoning")||rows[0]||null;
}
async function planMission(goal:string,title:string){
 const rows=await chiefs();
 const drive=goal.match(/create\s+(?:a\s+)?google\s+drive\s+(?:text\s+)?file\s+named\s+(.+?)\s+containing\s*:\s*([\s\S]+)$/i);
 if(drive){
  const chief=chooseChief(goal,rows);
  const name=String(drive[1]||"").trim().replace(/^["“”']+|["“”']+$/g,"").slice(0,240);
  const text=String(drive[2]||"").trim().slice(0,20000);
  return {
   summary:"Create the requested Google Drive text file directly in the connected owner's Drive.",
   steps:[{
    stepNo:1,
    title:"Create Google Drive text file",
    instruction:`Create Google Drive file ${name} with the requested contents.`,
    actionType:"external_action",
    chiefId:chief?.id||null,
    requiresApproval:false,
    actionProvider:"google",
    actionOperation:"drive_create_text",
    actionPayload:{name,text}
   }]
  };
 }
 const roster=rows.map(x=>`${x.name} — ${x.department}`).join("\n");
 const system=[
  "You are S.C.O.T.T.Y.'s mission planner.",
  "Break the goal into 2 to 6 concrete steps.",
  "Use only two action types: internal_analysis or external_action.",
  "external_action means sending/posting/deleting/purchasing/changing an account or provider, contacting another person, or any action outside S.C.O.T.T.Y.'s own database.",
  "Every external_action MUST require approval. Internal analysis should not require approval.",
  "For external_action choose provider and operation only from: telegram/send_message, google/gmail_send, google/calendar_create, google/drive_create_text, github/create_issue, github/comment_issue, slack/send_message, dropbox/upload_text, facebook/create_post, instagram/publish_image, tiktok/status_only.",
  "Put all needed non-secret arguments in actionPayload. Never invent email addresses, chat IDs, issue numbers, channels, image URLs, dates, or account identifiers; if the goal does not provide them, leave them missing so execution can stop safely.",
  "Assign exactly one chief by name from the supplied roster.",
  "Return JSON only: {summary:string,steps:[{title:string,instruction:string,actionType:string,chiefName:string,requiresApproval:boolean,actionProvider:string|null,actionOperation:string|null,actionPayload:object}]}."
 ].join(" ");
 try{
  const r=await groqThink([{role:"system",content:system+"\n\nCHIEFS:\n"+roster},{role:"user",content:"Mission title: "+title+"\nGoal: "+goal}],900);
  const parsed=JSON.parse(cleanJson(r.text));
  const steps=Array.isArray(parsed?.steps)?parsed.steps.slice(0,6):[];
  if(steps.length){
   return {
    summary:String(parsed.summary||"Mission plan created.").slice(0,1500),
    steps:steps.map((x:any,i:number)=>{
      const chief=rows.find(r=>String(r.name).toLowerCase()===String(x?.chiefName||"").toLowerCase())||chooseChief(String(x?.instruction||x?.title||goal),rows);
      const actionType=String(x?.actionType||"internal_analysis")==="external_action"?"external_action":"internal_analysis";
      return {
       stepNo:i+1,
       title:String(x?.title||("Step "+(i+1))).slice(0,240),
       instruction:String(x?.instruction||goal).slice(0,5000),
       actionType,
       chiefId:chief?.id||null,
       requiresApproval:actionType==="external_action"||Boolean(x?.requiresApproval),
       actionProvider:actionType==="external_action"?String(x?.actionProvider||"").toLowerCase().slice(0,80):null,
       actionOperation:actionType==="external_action"?String(x?.actionOperation||"").toLowerCase().slice(0,120):null,
       actionPayload:actionType==="external_action"&&x?.actionPayload&&typeof x.actionPayload==="object"?x.actionPayload:{}
      };
    })
   };
  }
 }catch{}
 const chief=chooseChief(goal,rows);
 return {summary:"Mission plan created with a safe internal analysis step.",steps:[{stepNo:1,title:"Analyze mission",instruction:goal,actionType:"internal_analysis",chiefId:chief?.id||null,requiresApproval:false,actionProvider:null,actionOperation:null,actionPayload:{}}]};
}
function missionRow(r:any){
 return {id:r.id,title:r.title,goal:r.goal,projectId:r.projectId||null,autonomyMode:r.autonomyMode,priority:r.priority,status:r.status,summary:r.summary||null,createdAt:r.createdAt,updatedAt:r.updatedAt,completedAt:r.completedAt||null};
}
function stepRow(r:any){
 return {id:r.id,missionId:r.missionId,stepNo:r.stepNo,title:r.title,instruction:r.instruction,actionType:r.actionType,actionProvider:r.actionProvider||null,actionOperation:r.actionOperation||null,actionPayload:r.actionPayload||{},approvalGranted:Boolean(r.approvalGranted),assignedChiefId:r.assignedChiefId||null,assignedAgentIds:r.assignedAgentIds||[],requiresApproval:Boolean(r.requiresApproval),status:r.status,result:r.result||null,createdAt:r.createdAt,updatedAt:r.updatedAt,completedAt:r.completedAt||null};
}
async function getMission(id:string){
 const rows=await db()`select id,title,goal,project_id as "projectId",autonomy_mode as "autonomyMode",priority,status,summary,created_at as "createdAt",updated_at as "updatedAt",completed_at as "completedAt" from scotty_missions where id::text=${id} limit 1`;
 return rows?.[0]||null;
}
async function getSteps(id:string){
 return db()`select id,mission_id as "missionId",step_no as "stepNo",title,instruction,action_type as "actionType",action_provider as "actionProvider",action_operation as "actionOperation",action_payload as "actionPayload",approval_granted as "approvalGranted",assigned_chief_id as "assignedChiefId",assigned_agent_ids as "assignedAgentIds",requires_approval as "requiresApproval",status,result,created_at as "createdAt",updated_at as "updatedAt",completed_at as "completedAt" from scotty_mission_steps where mission_id::text=${id} order by step_no asc`;
}
async function createApproval(mission:any,step:any){
 const old=await db()`select id,status from scotty_approvals where step_id=${step.id} and status='pending' limit 1`;
 if(old?.[0])return old[0];
 const id=crypto.randomUUID();
 const provider=String(step.actionProvider||"").toLowerCase(),operation=String(step.actionOperation||"").toLowerCase();
 const desc=`${step.title}: ${step.instruction}`.slice(0,3000);
 await db()`insert into scotty_approvals(id,mission_id,step_id,action_type,description,payload) values(${id},${mission.id},${step.id},${step.actionType},${desc},${db().json({missionTitle:mission.title,stepNo:step.stepNo,provider,operation,actionPayload:step.actionPayload||{}})})`;
 await db()`update scotty_mission_steps set status='waiting_approval',updated_at=now() where id=${step.id}`;
 await db()`update scotty_missions set status='waiting_approval',updated_at=now() where id=${mission.id}`;
 await addActivity("SCOTTY","MISSION APPROVAL REQUIRED",desc.slice(0,260),{missionId:mission.id,stepId:step.id,approvalId:id,provider,operation});
 return {id,status:"pending"};
}
async function assignedRows(step:any){
 const ids:string[]=[];
 if(step.assignedChiefId)ids.push(String(step.assignedChiefId));
 if(step.assignedChiefId){
  const sub=await db()`select id from scotty_agents where chief_id=${step.assignedChiefId} and is_chief=false order by queue_count asc,last_run_at asc nulls first limit 1`;
  if(sub?.[0]?.id)ids.push(String(sub[0].id));
 }
 for(const id of Array.isArray(step.assignedAgentIds)?step.assignedAgentIds:[])if(!ids.includes(String(id)))ids.push(String(id));
 return getAgentsByIds(ids.slice(0,3));
}
async function completeMission(mission:any){
 const steps=await getSteps(String(mission.id));
 const body=steps.map((x:any)=>`STEP ${x.stepNo} — ${x.title}\n${x.result||x.status}`).join("\n\n").slice(0,18000);
 let summary=body;
 try{
  const r=await groqThink([{role:"system",content:"Summarize this completed S.C.O.T.T.Y. mission into a concise executive result, decisions, and next actions. Do not claim external actions unless the step result explicitly confirms them."},{role:"user",content:"MISSION: "+mission.title+"\nGOAL: "+mission.goal+"\n\n"+body}],800);
  summary=r.text;
 }catch{}
 await db()`update scotty_missions set status='completed',summary=${summary.slice(0,12000)},completed_at=now(),updated_at=now() where id=${mission.id}`;
 try{await db()`insert into scotty_memory(scope,kind,text_content,metadata) values('shared','mission-summary',${mission.title+": "+summary},${db().json({missionId:mission.id,goal:mission.goal})})`}catch{}
 await addActivity("SCOTTY","MISSION COMPLETE",mission.title,{missionId:mission.id});
 return summary;
}
async function executeStep(mission:any,step:any){
 const rows=await assignedRows(step);
 if(!rows.length)throw new Error("No assigned mission agents available");
 const context=await memoryContext();
 await db()`update scotty_mission_steps set status='working',updated_at=now() where id=${step.id}`;
 await db()`update scotty_missions set status='running',updated_at=now() where id=${mission.id}`;
 await addActivity("SCOTTY","MISSION STEP START",step.title,{missionId:mission.id,stepId:step.id});
 const results=await Promise.all(rows.map((row:any)=>runAgent(row,`MISSION: ${mission.title}\nGOAL: ${mission.goal}\nSTEP: ${step.title}\nINSTRUCTION: ${step.instruction}`,context)));
 const good=results.filter((x:any)=>x.status==="completed");
 if(!good.length)throw new Error("Mission agents did not complete this step");
 const raw=good.map((x:any)=>`${x.name}: ${x.result}`).join("\n\n");
 let result=raw;
 try{
  const synth=await groqThink([{role:"system",content:"Combine the specialist outputs into one clear mission-step result. Preserve disagreements and uncertainty. Do not invent completed external actions."},{role:"user",content:raw}],750);
  result=synth.text;
 }catch{}
 await db()`update scotty_mission_steps set status='completed',result=${result.slice(0,12000)},completed_at=now(),updated_at=now() where id=${step.id}`;
 try{await db()`insert into scotty_memory(scope,kind,text_content,metadata) values('shared','mission-step',${mission.title+" / "+step.title+": "+result},${db().json({missionId:mission.id,stepId:step.id})})`}catch{}
 await addActivity("SCOTTY","MISSION STEP COMPLETE",step.title,{missionId:mission.id,stepId:step.id});
 return result;
}
async function executeExternalStep(mission:any,step:any){
 const provider=String(step.actionProvider||"").toLowerCase(),operation=String(step.actionOperation||"").toLowerCase();
 if(!provider||!operation)throw new Error("Approved external action is missing a provider or operation");
 await db()`update scotty_mission_steps set status='working',updated_at=now() where id=${step.id}`;
 await db()`update scotty_missions set status='running',updated_at=now() where id=${mission.id}`;
 await addActivity("SCOTTY","EXTERNAL ACTION START",`${provider} • ${operation}`,{missionId:mission.id,stepId:step.id,provider,operation});
 const receipt=await executeProviderAction({provider,operation,payload:step.actionPayload||{},missionId:mission.id,stepId:step.id});
 if(!receipt.ok){
  const msg=String(receipt.error||"Provider action failed").slice(0,3000);
  await db()`update scotty_mission_steps set status='error',result=${msg},updated_at=now() where id=${step.id}`;
  await db()`update scotty_missions set status='needs_attention',updated_at=now() where id=${mission.id}`;
  await addActivity("SCOTTY","EXTERNAL ACTION ERROR",msg.slice(0,260),{missionId:mission.id,stepId:step.id,provider,operation,receiptId:receipt.id});
  throw new Error(msg);
 }
 const result=`Provider action completed through ${provider}/${operation}. Receipt ${receipt.id}.`;
 await db()`update scotty_mission_steps set status='completed',result=${result},completed_at=now(),updated_at=now() where id=${step.id}`;
 try{await db()`insert into scotty_memory(scope,kind,text_content,metadata) values('shared','provider-receipt',${mission.title+" / "+step.title+": "+result},${db().json({missionId:mission.id,stepId:step.id,provider,operation,receiptId:receipt.id})})`}catch{}
 await addActivity("SCOTTY","EXTERNAL ACTION COMPLETE",result,{missionId:mission.id,stepId:step.id,provider,operation,receiptId:receipt.id});
 return result;
}

export async function createMission(input:any){
 await ensure();
 const goal=String(input?.goal||"").trim().slice(0,12000);
 if(!goal)throw new Error("Mission goal is required");
 const title=String(input?.title||goal.slice(0,90)||"S.C.O.T.T.Y. Mission").trim().slice(0,240);
 const autonomyMode=String(input?.autonomyMode||"supervised")==="auto"?"auto":"supervised";
 const priority=["low","normal","high","critical"].includes(String(input?.priority))?String(input.priority):"normal";
 const projectId=input?.projectId?String(input.projectId).slice(0,240):null;
 const plan=await planMission(goal,title);
 const id=crypto.randomUUID();
 await db().begin(async(tx:any)=>{
  await tx`insert into scotty_missions(id,title,goal,project_id,autonomy_mode,priority,status,summary) values(${id},${title},${goal},${projectId},${autonomyMode},${priority},'queued',${plan.summary})`;
  for(const s of plan.steps){
   await tx`insert into scotty_mission_steps(id,mission_id,step_no,title,instruction,action_type,action_provider,action_operation,action_payload,assigned_chief_id,requires_approval,status)
    values(${crypto.randomUUID()},${id},${s.stepNo},${s.title},${s.instruction},${s.actionType},${s.actionProvider||null},${s.actionOperation||null},${tx.json(s.actionPayload||{})},${s.chiefId},${s.requiresApproval},'pending')`;
  }
 });
 await addActivity("SCOTTY","MISSION CREATED",title,{missionId:id,autonomyMode,steps:plan.steps.length});
 return {id,title,goal,autonomyMode,priority,status:"queued",plan};
}
export async function runMission(id:string,maxSteps=2){
 await ensure();
 let mission=await getMission(id);
 if(!mission)throw new Error("Mission not found");
 if(["paused","cancelled","completed"].includes(mission.status))return {mission:missionRow(mission),ran:0};
 let ran=0;
 while(ran<Math.max(1,Math.min(3,maxSteps))){
  mission=await getMission(id);if(!mission)break;
  const steps=await getSteps(id);
  const waiting=steps.find((x:any)=>x.status==="waiting_approval");
  if(waiting){await db()`update scotty_missions set status='waiting_approval',updated_at=now() where id=${mission.id}`;break}
  const next=steps.find((x:any)=>x.status==="pending");
  if(!next){
   const unfinished=steps.some((x:any)=>["working","waiting_approval"].includes(x.status));
   if(!unfinished)await completeMission(mission);
   break;
  }
  const safeOwnerCreate=next.actionProvider==="google"&&next.actionOperation==="drive_create_text"&&!next.requiresApproval;
  if(next.actionType==="external_action"&&!next.approvalGranted&&!safeOwnerCreate){
   await createApproval(mission,next);break;
  }
  if(next.requiresApproval&&!next.approvalGranted){
   await createApproval(mission,next);break;
  }
  try{
   if(next.actionType==="external_action")await executeExternalStep(mission,next);
   else await executeStep(mission,next);
   ran++;
  }
  catch(e:any){
   const msg=String(e?.message||"Mission step failed").slice(0,3000);
   await db()`update scotty_mission_steps set status='error',result=${msg},updated_at=now() where id=${next.id}`;
   await db()`update scotty_missions set status='needs_attention',updated_at=now() where id=${mission.id}`;
   await addActivity("SCOTTY","MISSION STEP ERROR",msg.slice(0,260),{missionId:mission.id,stepId:next.id});
   break;
  }
 }
 mission=await getMission(id);
 return {mission:mission?missionRow(mission):null,steps:(await getSteps(id)).map(stepRow),ran};
}
export async function autonomyTick(){
 await ensure();
 const rows=await db()`select id::text as id from scotty_missions where autonomy_mode='auto' and status in ('queued','running') order by case priority when 'critical' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,updated_at asc limit 2`;
 for(const x of rows){try{await runMission(String(x.id),1)}catch{}}
 return rows.length;
}
export async function bootstrapAutonomy(){
 await ensure();
 const c=await db()`select count(*)::int as n from scotty_missions`;
 return Number(c?.[0]?.n||0);
}
export async function handleCloudAutonomy(req:Request,u:URL){
 await ensure();
 const p=u.pathname;
 if(req.method==="GET"&&p==="/api/missions/status"){
  const rows=await db()`select status,count(*)::int as n from scotty_missions group by status`;
  const approvals=await db()`select count(*)::int as n from scotty_approvals where status='pending'`;
  return json({ok:true,provider:"render-postgres+groq",missions:Object.fromEntries(rows.map((x:any)=>[x.status,Number(x.n||0)])),pendingApprovals:Number(approvals?.[0]?.n||0)});
 }
 if(req.method==="GET"&&p==="/api/missions"){
  const limit=Math.max(1,Math.min(100,Number(u.searchParams.get("limit")||50)||50));
  const rows=await db()`select id,title,goal,project_id as "projectId",autonomy_mode as "autonomyMode",priority,status,summary,created_at as "createdAt",updated_at as "updatedAt",completed_at as "completedAt" from scotty_missions order by created_at desc limit ${limit}`;
  return json({ok:true,missions:rows.map(missionRow)});
 }
 if(req.method==="POST"&&p==="/api/missions"){
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  try{return json({ok:true,...await createMission(body)},201)}catch(e:any){return json({ok:false,error:String(e?.message||"Mission creation failed")},400)}
 }
 const one=p.match(/^\/api\/missions\/([0-9a-f-]+)$/i);
 if(req.method==="GET"&&one){
  const m=await getMission(one[1]);if(!m)return json({ok:false,error:"Mission not found"},404);
  return json({ok:true,mission:missionRow(m),steps:(await getSteps(one[1])).map(stepRow)});
 }
 const act=p.match(/^\/api\/missions\/([0-9a-f-]+)\/(run|pause|resume|cancel)$/i);
 if(req.method==="POST"&&act){
  const id=act[1],action=act[2].toLowerCase(),m=await getMission(id);if(!m)return json({ok:false,error:"Mission not found"},404);
  if(action==="run"){try{return json({ok:true,...await runMission(id,2)})}catch(e:any){return json({ok:false,error:String(e?.message||"Mission run failed")},500)}}
  if(action==="pause"){await db()`update scotty_missions set status='paused',updated_at=now() where id=${m.id}`;await addActivity("SCOTTY","MISSION PAUSED",m.title,{missionId:m.id});return json({ok:true,status:"paused"})}
  if(action==="resume"){await db()`update scotty_missions set status='queued',updated_at=now() where id=${m.id} and status<>'completed'`;await addActivity("SCOTTY","MISSION RESUMED",m.title,{missionId:m.id});return json({ok:true,status:"queued"})}
  await db()`update scotty_missions set status='cancelled',updated_at=now() where id=${m.id}`;await addActivity("SCOTTY","MISSION CANCELLED",m.title,{missionId:m.id});return json({ok:true,status:"cancelled"});
 }
 if(req.method==="GET"&&p==="/api/approvals"){
  const status=String(u.searchParams.get("status")||"pending");
  const rows=await db()`select a.id,a.mission_id as "missionId",a.step_id as "stepId",a.action_type as "actionType",a.description,a.payload,a.status,a.created_at as "createdAt",a.decided_at as "decidedAt",m.title as "missionTitle" from scotty_approvals a join scotty_missions m on m.id=a.mission_id where a.status=${status} order by a.created_at desc limit 100`;
  return json({ok:true,approvals:rows});
 }
 const ap=p.match(/^\/api\/approvals\/([0-9a-f-]+)\/(approve|reject)$/i);
 if(req.method==="POST"&&ap){
  const id=ap[1],action=ap[2].toLowerCase();
  const rows=await db()`select a.id,a.mission_id as "missionId",a.step_id as "stepId",a.status,m.title as "missionTitle" from scotty_approvals a join scotty_missions m on m.id=a.mission_id where a.id::text=${id} limit 1`;
  const a=rows?.[0];if(!a)return json({ok:false,error:"Approval not found"},404);
  if(a.status!=="pending")return json({ok:true,status:a.status});
  if(action==="approve"){
   await db().begin(async(tx:any)=>{
    await tx`update scotty_approvals set status='approved',decided_at=now() where id=${a.id}`;
    await tx`update scotty_mission_steps set approval_granted=true,requires_approval=false,status='pending',updated_at=now() where id=${a.stepId}`;
    await tx`update scotty_missions set status='queued',updated_at=now() where id=${a.missionId}`;
   });
   await addActivity("SCOTTY","MISSION ACTION APPROVED",a.missionTitle,{missionId:a.missionId,approvalId:a.id});
   return json({ok:true,status:"approved",missionId:a.missionId});
  }
  await db().begin(async(tx:any)=>{
   await tx`update scotty_approvals set status='rejected',decided_at=now() where id=${a.id}`;
   await tx`update scotty_mission_steps set status='rejected',result='Owner rejected this external action.',updated_at=now() where id=${a.stepId}`;
   await tx`update scotty_missions set status='needs_attention',updated_at=now() where id=${a.missionId}`;
  });
  await addActivity("SCOTTY","MISSION ACTION REJECTED",a.missionTitle,{missionId:a.missionId,approvalId:a.id});
  return json({ok:true,status:"rejected",missionId:a.missionId});
 }
 return json({ok:false,error:"Autonomy route not found"},404);
}
