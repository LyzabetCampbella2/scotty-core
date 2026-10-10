import postgres from "postgres";
import { groqThink,addActivity } from "../brain/cloud.ts";
import { specialistInstructions,departmentSkills } from "./skills.ts";

let sql:any=null,initPromise:Promise<void>|null=null,lastImportTry=0;
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
  await q`create table if not exists scotty_agents(
   id text primary key,
   name text not null,
   department text not null default 'Operations',
   rank text not null default 'Agent',
   is_chief boolean not null default false,
   chief_id text,
   clearance integer not null default 3,
   model text not null default 'groq',
   state text not null default 'idle',
   queue_count integer not null default 0,
   memory_links integer not null default 0,
   voice_mode text not null default 'auto',
   tools jsonb not null default '[]'::jsonb,
   collaborators jsonb not null default '[]'::jsonb,
   current_job text,
   last_result text,
   last_run_at timestamptz,
   sort_order integer not null default 0,
   raw jsonb not null default '{}'::jsonb,
   updated_at timestamptz not null default now()
  )`;
  await q`create table if not exists scotty_agent_missions(
   id uuid primary key,
   task text not null,
   status text not null default 'completed',
   agents jsonb not null default '[]'::jsonb,
   briefing jsonb not null default '[]'::jsonb,
   results jsonb not null default '[]'::jsonb,
   review jsonb not null default '[]'::jsonb,
   progress jsonb not null default '[]'::jsonb,
   unresolved jsonb not null default '[]'::jsonb,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
  )`;
  await q`create table if not exists scotty_agent_meta(
   key text primary key,
   value text not null,
   updated_at timestamptz not null default now()
  )`;
  await q`create table if not exists scotty_activity(
   id bigserial primary key,
   source text not null default 'SCOTTY',
   title text not null default 'ACTIVITY',
   message text not null,
   metadata jsonb not null default '{}'::jsonb,
   created_at timestamptz not null default now()
  )`;
 })();
 return initPromise;
}

const chiefs=[
 ["spock","SPOCK","Strategy & Reasoning"],
 ["worf","WORF","Security & Defense"],
 ["data","DATA","Research & Intelligence"],
 ["quark","QUARK","Commerce & Finance"],
 ["kirk","KIRK","Command & Missions"],
 ["uhura","UHURA","Communications & Languages"],
 ["geordi","GEORDI","Engineering & Systems"],
 ["keiko","KEIKO","Science & Environment"],
 ["picard","PICARD","Policy & Diplomacy"],
 ["bones","BONES","Health & Human Support"],
 ["zora","ZORA","Creative & Knowledge"],
 ["riker","RIKER","Operations & Coordination"]
] as const;
const seedNames=["O'Brien","Seven Ops","Privacy","Sarek","Risa","Bashir","Vox","Rubric","Lingua","Lab","Circuit","Saru","Guinan Herbal","Chronos","Switchboard","Factcheck","Guinan","Stellar","Number One","Vulcan","Sato","Resolver","PADD","Subspace","Hoshi","Context","CRM","Prime","Watchtower","Audit Sec","Deadline","PADD Legal","Lockout","Transporter","Replicator","Evidence","Promo","Chapel","Dax","ROM","Garak","Enterprise","Neelix","Signal","Daystrom","Academy","Jake","Holodeck","Benny","EMH","SCRIBE","Sentinel","Curator","Echo","Probe","Archer","Combadge","LCARS","Patch","Paris","Sisko","Helm","Mission Control","Delta","Argus","Red Alert","Indexer","Sarek Legal","Archive","QA Core","Policy","Dispatch","Shields","Tuvok","PADD Ops","EMH Persona","Trigger","NOO","Yeoman","Rand","Relay Auto","Examiner","Scheduler","Genesis","B-4","Risa Ayurveda","Boothby","Dockyard","Recovery","Vaultguard","JAG","Garax","Design","Vic","Miles","Lwaxana","Seven","Merchant","Security Command"];

function fallbackRoster(){
 const out:any[]=[];let order=0,seed=0;
 for(const [id,name,department] of chiefs){
  out.push({id:"chief-"+id,name,department,rank:"Chief",isChief:true,chiefId:null,clearance:5,model:"groq",state:"idle",queueCount:0,memoryLinks:0,voiceMode:"auto",tools:[{key:"coordinate",label:"Coordinate"},{key:"analyze",label:"Analyze"}],collaborators:[],currentJob:null,sortOrder:order++});
 }
 for(let ci=0;ci<chiefs.length;ci++){
  const [cid,cname,department]=chiefs[ci];
  const count=ci<8?10:9;
  for(let j=0;j<count;j++){
   const base=seedNames[seed++]||`${cname}-${String(j+1).padStart(2,"0")}`;
   out.push({id:`agent-${cid}-${String(j+1).padStart(2,"0")}`,name:base,department,rank:"Agent",isChief:false,chiefId:"chief-"+cid,clearance:3,model:"groq",state:"idle",queueCount:0,memoryLinks:0,voiceMode:"auto",tools:[{key:"research",label:"Research"},{key:"report",label:"Report"}],collaborators:[],currentJob:null,sortOrder:order++});
  }
 }
 return out;
}

async function replaceRoster(items:any[],source:string){
 const q=db();
 await q.begin(async(tx:any)=>{
  await tx`delete from scotty_agents`;
  let order=0;
  for(const a of items){
   const raw=a&&typeof a==="object"?a:{};
   const id=String(raw.id||`agent-${order+1}`).slice(0,180);
   const name=String(raw.name||id).slice(0,180);
   const department=String(raw.department||"Operations").slice(0,180);
   const rank=String(raw.rank||((raw.isChief||raw.is_chief)?"Chief":"Agent")).slice(0,100);
   const isChief=Boolean(raw.isChief??raw.is_chief);
   const chiefId=raw.chiefId?String(raw.chiefId).slice(0,180):raw.chief_id?String(raw.chief_id).slice(0,180):null;
   const clearance=Math.max(1,Math.min(9,Number(raw.clearance||3)||3));
   const model="groq";
   const state=String(raw.state||"idle").slice(0,50);
   const queueCount=Math.max(0,Number(raw.queueCount??raw.queue_count??0)||0);
   const memoryLinks=Math.max(0,Number(raw.memoryLinks??raw.memory_links??0)||0);
   const voiceMode=String(raw.voiceMode??raw.voice_mode??"auto").slice(0,50);
   const tools=Array.isArray(raw.tools)?raw.tools:[];
   const collaborators=Array.isArray(raw.collaborators)?raw.collaborators:[];
   const currentJob=raw.currentJob?String(raw.currentJob).slice(0,2000):raw.current_job?String(raw.current_job).slice(0,2000):null;
   const sortOrder=Number(raw.sortOrder??raw.sort_order??order)||order;
   await tx`insert into scotty_agents(id,name,department,rank,is_chief,chief_id,clearance,model,state,queue_count,memory_links,voice_mode,tools,collaborators,current_job,sort_order,raw)
    values(${id},${name},${department},${rank},${isChief},${chiefId},${clearance},${model},${state},${queueCount},${memoryLinks},${voiceMode},${tx.json(tools)},${tx.json(collaborators)},${currentJob},${sortOrder},${tx.json(raw)})`;
   order++;
  }
  await tx`insert into scotty_agent_meta(key,value,updated_at) values('roster_source',${source},now())
    on conflict(key) do update set value=excluded.value,updated_at=now()`;
 });
}

async function importLegacy(cookie=""){
 const base=String(process.env.SCOTTY_LEGACY_API_URL||"").replace(/\/$/,"");
 if(!base)return false;
 try{
  const headers:any={accept:"application/json"};
  if(cookie)headers.cookie=cookie;
  const r=await fetch(base+"/api/hud/agents",{headers,signal:AbortSignal.timeout(20000)});
  if(!r.ok)return false;
  const j:any=await r.json();
  const items=Array.isArray(j?.agents)?j.agents:[];
  if(items.length<12)return false;
  await replaceRoster(items,"legacy");
  await addActivity("SCOTTY","AGENT MIGRATION",`Imported ${items.length} agents/chiefs into Render shared memory.`,{count:items.length});
  console.log("S.C.O.T.T.Y. agent roster imported",items.length);
  return true;
 }catch(e:any){console.warn("Agent roster import deferred",e?.message||e);return false}
}

async function rosterSource(){
 const r=await db()`select value from scotty_agent_meta where key='roster_source' limit 1`;
 return r?.[0]?.value||"";
}
async function ensureRoster(cookie=""){
 await ensure();
 const countRow=await db()`select count(*)::int as n from scotty_agents`;
 let n=Number(countRow?.[0]?.n||0),source=await rosterSource();
 if((source!=="legacy"||n<12)&&Date.now()-lastImportTry>60000){
  lastImportTry=Date.now();
  if(await importLegacy(cookie))return;
  const again=await db()`select count(*)::int as n from scotty_agents`;n=Number(again?.[0]?.n||0);
 }
 if(!n){
  const items=fallbackRoster();
  await replaceRoster(items,"fallback");
  await addActivity("SCOTTY","AGENT MATRIX",`Initialized ${items.length} cloud agents while legacy roster import waits for an authenticated HUD request.`,{count:items.length});
 }
}

function asAgent(r:any){
 const raw=r.raw&&typeof r.raw==="object"?r.raw:{};
 return {...raw,id:r.id,name:r.name,department:r.department,rank:r.rank,isChief:Boolean(r.isChief),chiefId:r.chiefId||null,clearance:r.clearance,model:r.model,state:r.state,queueCount:r.queueCount,memoryLinks:r.memoryLinks,voiceMode:r.voiceMode,tools:Array.isArray(r.tools)?r.tools:[],collaborators:Array.isArray(r.collaborators)?r.collaborators:[],currentJob:r.currentJob||null,lastResult:r.lastResult||null,lastRunAt:r.lastRunAt||null};
}

export async function getAgentsByIds(ids:string[]){
 if(!ids.length)return [];
 return db()`select id,name,department,rank,is_chief as "isChief",chief_id as "chiefId",clearance,model,state,queue_count as "queueCount",memory_links as "memoryLinks",voice_mode as "voiceMode",tools,collaborators,current_job as "currentJob",last_result as "lastResult",last_run_at as "lastRunAt",raw
  from scotty_agents where id in ${db()(ids)} order by sort_order asc`;
}

export async function memoryContext(){
 try{
  const rows=await db()`select kind,agent_id as "agentId",text_content as text from scotty_memory order by created_at desc limit 20`;
  return rows.reverse().map((x:any)=>`[${x.kind||"memory"}${x.agentId?" · "+x.agentId:""}] ${x.text}`).join("\n");
 }catch{return ""}
}

export async function runAgent(row:any,task:string,context:string){
 const id=String(row.id),name=String(row.name);
 try{
  await db()`update scotty_agents set state='working',current_job=${task.slice(0,1800)},queue_count=queue_count+1,updated_at=now() where id=${id}`;
  await addActivity(name,"AGENT START",task.slice(0,220),{agentId:id});
  const system=specialistInstructions(row)+"\nSpecialty focus: "+(departmentSkills[row.department]?.skills||["analysis"])[Math.max(0,Number(String(id).split("-").pop())-1)%(departmentSkills[row.department]?.skills?.length||1)]+". Review your assigned part, identify unresolved questions, and provide evidence-aware findings.";
  const r=await groqThink([{role:"system",content:system+(context?"\n\nSHARED MEMORY:\n"+context:"")},{role:"user",content:task}],750);
  await db()`update scotty_agents set state='idle',current_job=null,queue_count=greatest(queue_count-1,0),last_result=${r.text.slice(0,8000)},last_run_at=now(),memory_links=memory_links+1,updated_at=now() where id=${id}`;
  try{await db()`insert into scotty_memory(scope,kind,agent_id,text_content,metadata) values('shared','agent-result',${id},${name+": "+r.text},${db().json({department:row.department,model:r.model,task:task.slice(0,1000)})})`}catch{}
  await addActivity(name,"AGENT COMPLETE",r.text.slice(0,280),{agentId:id,model:r.model});
  return {id,name,status:"completed",result:r.text,provider:"groq",model:r.model};
 }catch(e:any){
  const msg=String(e?.message||"Agent failed");
  await db()`update scotty_agents set state='idle',current_job=null,queue_count=greatest(queue_count-1,0),updated_at=now() where id=${id}`;
  await addActivity(name,"AGENT ERROR",msg.slice(0,300),{agentId:id});
  return {id,name,status:"error",error:msg};
 }
}

export async function bootstrapAgents(){await ensureRoster("");const r=await db()`select count(*)::int as n from scotty_agents`;return Number(r?.[0]?.n||0)}

export async function handleCloudAgents(req:Request,u:URL){
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});
 const cookie=req.headers.get("cookie")||"";
 await ensureRoster(cookie);

 if(req.method==="GET"&&u.pathname==="/api/hud/agents/skills"){
  const rows=await db()`select id,name,department,rank,is_chief as "isChief",chief_id as "chiefId",tools from scotty_agents order by sort_order asc`;
  return json({ok:true,departments:departmentSkills,agents:rows.map((r:any)=>({id:r.id,name:r.name,department:r.department,rank:r.rank,isChief:r.isChief,chiefId:r.chiefId,skills:departmentSkills[r.department]?.skills||["analysis","planning","reporting"],capabilities:Array.isArray(r.tools)?r.tools:[]}))});
 }

 if(req.method==="GET"&&u.pathname==="/api/hud/agents/missions"){
  const rows=await db()`select id,task,status,agents,progress,unresolved,created_at as "createdAt",updated_at as "updatedAt" from scotty_agent_missions order by created_at desc limit 30`;
  return json({ok:true,missions:rows});
 }
 const missionMatch=u.pathname.match(/^\\/api\\/hud\\/agents\\/missions\\/([0-9a-f-]{36})$/i);
 if(req.method==="GET"&&missionMatch){
  const rows=await db()`select * from scotty_agent_missions where id=${missionMatch[1]} limit 1`;
  return rows.length?json({ok:true,mission:rows[0]}):json({ok:false,error:"Mission not found"},404);
 }
 if(req.method==="POST"&&missionMatch){
  const rows=await db()`select * from scotty_agent_missions where id=${missionMatch[1]} limit 1`;
  if(!rows.length)return json({ok:false,error:"Mission not found"},404);
  const m=rows[0];const body=await req.json().catch(()=>({}));
  const feedback=String(body.feedback||"").trim().slice(0,3000);
  if(!feedback)return json({ok:false,error:"Feedback is required to continue a mission"},400);
  const previous=JSON.stringify({results:m.results,review:m.review,unresolved:m.unresolved}).slice(0,12000);
  const updatedTask=String(m.task)+"\\nContinue this mission using previous findings (do not repeat completed work): "+previous+"\\nNew feedback: "+feedback;
  await db()`update scotty_agent_missions set status='continued',updated_at=now() where id=${m.id}`;
  return json({ok:true,previousMissionId:m.id,continuationTask:updatedTask,agents:m.agents,readyToRun:true});
 }
 if(req.method==="GET"&&u.pathname==="/api/hud/agents/status"){
  const c=await db()`select count(*)::int as n,count(*) filter(where is_chief)::int as chiefs from scotty_agents`;
  return json({ok:true,provider:"render-postgres+groq",agents:Number(c[0]?.n||0),chiefs:Number(c[0]?.chiefs||0),source:await rosterSource()});
 }

 if(req.method==="GET"&&u.pathname==="/api/hud/agents"){
  const rows=await db()`select id,name,department,rank,is_chief as "isChief",chief_id as "chiefId",clearance,model,state,queue_count as "queueCount",memory_links as "memoryLinks",voice_mode as "voiceMode",tools,collaborators,current_job as "currentJob",last_result as "lastResult",last_run_at as "lastRunAt",raw from scotty_agents order by sort_order asc,name asc`;
  return json({ok:true,agents:rows.map(asAgent),source:await rosterSource()});
 }

 if(req.method==="POST"&&u.pathname==="/api/hud/agents/run"){
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const ids:string[]=[...new Set<string>((Array.isArray(body?.agents)?body.agents:[]).map((x:any)=>String(x)))].slice(0,8);
  const task=String(body?.task||"").trim().slice(0,12000);
  if(!ids.length && body?.autoAssign!==true)return json({ok:false,error:"Select at least one agent or enable autoAssign"},400);
  if(!task)return json({ok:false,error:"Missing agent task"},400);
  if(body?.autoAssign===true && ids.length===0){
   const candidates=await db()`select id,name,department,rank,is_chief as "isChief",chief_id as "chiefId",tools from scotty_agents where is_chief=true order by sort_order asc`;
   const tokens=task.toLowerCase().split(/[^a-z]+/).filter((x:string)=>x.length>3);
   const ranked=candidates.map((a:any)=>({a,score:(departmentSkills[a.department]?.skills||[]).join(" ").toLowerCase().split(/[^a-z]+/).filter((x:string)=>tokens.includes(x)).length+(a.department.toLowerCase().split(/[^a-z]+/).filter((x:string)=>tokens.includes(x)).length)})).sort((a:any,b:any)=>b.score-a.score);
   ids.push(...ranked.filter((x:any)=>x.score>0).slice(0,3).map((x:any)=>x.a.id));
   if(!ids.length)ids.push(...ranked.slice(0,2).map((x:any)=>x.a.id));
  }
  if(body?.autoAssign===true && body?.recruitSpecialists!==false){
   const chiefs=ids.filter((id:string)=>id.startsWith("chief-"));
   for(const chiefId of chiefs){
    const pool=await db()`select id,name,department,rank,is_chief as "isChief",chief_id as "chiefId",tools from scotty_agents where chief_id=${chiefId} order by sort_order asc limit 30`;
    const tokens=task.toLowerCase().split(/[^a-z]+/).filter((x:string)=>x.length>3);
    const ranked=pool.map((a:any)=>{const skills=departmentSkills[a.department]?.skills||["analysis"];const slot=Math.max(0,Number(String(a.id).split("-").pop())-1)%skills.length;const primary=skills[slot];return {a,score:primary.toLowerCase().split(/[^a-z]+/).filter((x:string)=>tokens.includes(x)).length};}).sort((a:any,b:any)=>b.score-a.score);
    for(const match of ranked.slice(0,2)){if(ids.length<8 && !ids.includes(match.a.id))ids.push(match.a.id)}
   }
  }
  const rows=await getAgentsByIds(ids);
  if(!rows.length)return json({ok:false,error:"Selected agents were not found"},404);
  const byId=new Map(rows.map((x:any)=>[x.id,x]));
  const ordered=ids.map(id=>byId.get(id)).filter(Boolean);
  const specialtyAssignments=ordered.map((a:any)=>({agentId:a.id,name:a.name,department:a.department,primarySkill:(departmentSkills[a.department]?.skills||["analysis"])[Math.max(0,Number(String(a.id).split("-").pop())-1)%(departmentSkills[a.department]?.skills?.length||1)],secondarySkills:(departmentSkills[a.department]?.skills||[]).filter((_:string,i:number)=>i!==Math.max(0,Number(String(a.id).split("-").pop())-1)%(departmentSkills[a.department]?.skills?.length||1))}));
  const context=await memoryContext();
  const chiefIds=[...new Set(ordered.map((a:any)=>a.isChief?a.id:a.chiefId).filter(Boolean))];
  const supervisors=await getAgentsByIds(chiefIds);
  const briefing=supervisors.length?await Promise.all(supervisors.map(async (chief:any)=>{
   const teammates=ordered.filter((a:any)=>a.id===chief.id||a.chiefId===chief.id);
   const brief="Plan and delegate this mission among "+teammates.map((a:any)=>a.name).join(", ")+". Task: "+task+". Give concise assignments, dependencies, and review criteria.";
   const result=await runAgent(chief,brief,context);
   return {chiefId:chief.id,chief:chief.name,team:teammates.map((a:any)=>a.id),plan:result.result||"",status:result.status};
  })): [];
  const results:any[]=[];
  for(let i=0;i<ordered.length;i+=2){
   const batch=await Promise.all(ordered.slice(i,i+2).map((row:any)=>runAgent(row,task+"\nChief briefings: "+briefing.filter((b:any)=>b.team.includes(row.id)).map((b:any)=>b.plan).join("\n"),context)));
   results.push(...batch);
  }
  const review=await Promise.all(supervisors.map(async (chief:any)=>{
   const findings=results.filter((r:any)=>ordered.some((a:any)=>a.id===r.id&&(a.chiefId===chief.id||a.id===chief.id)));
   if(!findings.length)return {chief:chief.name,status:"no-results"};
   const assessment=await runAgent(chief,"Review these team findings for the mission: "+task+"\n"+JSON.stringify(findings).slice(0,14000)+"\nSummarize completed work, disagreements, gaps, unresolved questions and next steps.",context);
   return {chief:chief.name,chiefId:chief.id,status:assessment.status,assessment:assessment.result||assessment.error};
  }));
  const unresolved=review.filter((x:any)=>x.status!=="completed").map((x:any)=>x.chief+" review incomplete");
  const missionId=crypto.randomUUID();
  const progress=results.map((r:any)=>({agentId:r.id,name:r.name,status:r.status,primarySkill:specialtyAssignments.find((a:any)=>a.agentId===r.id)?.primarySkill||"general",finding:r.status==="completed"?String(r.result||"").slice(0,1500):null,blocker:r.status==="error"?String(r.error||"Unknown error"):null}));
  const questions=review.filter((x:any)=>x.status==="completed").map((x:any)=>({chief:x.chief,review:String(x.assessment||"").slice(0,4000)}));
  try{await db()`insert into scotty_agent_missions(id,task,status,agents,briefing,results,review,progress,unresolved) values(${missionId},${task},${unresolved.length?"needs_attention":"completed"},${db().json(ids)},${db().json(briefing)},${db().json(results)},${db().json(review)},${db().json(progress)},${db().json(unresolved)})`}catch(err){console.warn("mission persistence failed",err)}
  try{await db()`insert into scotty_activity(source,title,message,metadata) values('SCOTTY','MISSION INTELLIGENCE',${task.slice(0,400)},${db().json({missionId,progress,questions,unresolved,chiefIds})})`}catch{}

  try{await db()`insert into scotty_memory(scope,kind,text_content,metadata) values('shared','mission-summary',${("Mission: "+task+"\nChief reviews: "+JSON.stringify(review)+"\nUnresolved: "+unresolved.join("; ")).slice(0,24000)},${db().json({agentIds:ids,chiefIds,completed:results.filter((x:any)=>x.status==="completed").length,unresolved})})`}catch{}
  return json({ok:true,missionId,task,progress,questions,autoAssigned:body?.autoAssign===true,assignments:specialtyAssignments,briefing,results,review,unresolved,completed:results.filter(x=>x.status==="completed").length});
 }

 if(req.method==="GET"&&u.pathname==="/api/hud/activity"){
  const limit=Math.max(1,Math.min(100,Number(u.searchParams.get("limit")||40)||40));
  const rows=await db()`select id,source,title,message,metadata,created_at as "createdAt" from scotty_activity order by created_at desc limit ${limit}`;
  return json({ok:true,items:rows});
 }

 return json({ok:false,error:"Agent route not found"},404);
}
