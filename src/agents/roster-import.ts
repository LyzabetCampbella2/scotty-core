// Additive roster initialization. Existing identities and state are never replaced.
export async function importRosterPreservingIdentity(q:any,items:any[],source:string){
 await q.begin(async(tx:any)=>{
  // Serialize bootstrap/import attempts and prevent concurrent roster replacements.
  await tx`lock table scotty_agents in share row exclusive mode`;
  const existing=await tx`select id from scotty_agents order by id`;
  const ids=items.map((a:any,i:number)=>String(a?.id||`agent-${i+1}`).slice(0,180));
  if(new Set(ids).size!==ids.length)throw Error("Roster import rejected: duplicate agent identities");
  if(existing.length){
   const incoming=new Set(ids);
   if(existing.length!==ids.length||existing.some((a:any)=>!incoming.has(a.id)))
    throw Error("Roster import rejected: existing agent identities must be preserved");
   await tx`insert into scotty_agent_meta(key,value,updated_at) values('roster_source',${source},now())
    on conflict(key) do update set value=excluded.value,updated_at=now()`;
   return;
  }
  // Existing rows, including names, chief hierarchy and runtime state, are immutable here.
  // Importing the same identity set only verifies the roster; it never deletes/upserts it.
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
    values(${id},${name},${department},${rank},${isChief},${chiefId},${clearance},${model},${state},${queueCount},${memoryLinks},${voiceMode},${tx.json(tools)},${tx.json(collaborators)},${currentJob},${sortOrder},${tx.json(raw)}) on conflict(id) do nothing`;
   order++;
  }
  await tx`insert into scotty_agent_meta(key,value,updated_at) values('roster_source',${source},now())
    on conflict(key) do update set value=excluded.value,updated_at=now()`;
 });
}
