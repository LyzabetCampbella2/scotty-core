import postgres from "postgres";
import {ensureCollaboration} from "./collaboration.ts";
let sql:any;
const db=()=>sql||(sql=postgres(process.env.DATABASE_URL||"",{ssl:process.env.SCOTTY_BRAIN_DB_SSL==="disable"?false:"require",max:3}));
let ready:Promise<void>|undefined;
async function ensure(){await ensureCollaboration();if(!ready)ready=(async()=>{const q=db();await q`create table if not exists scotty_collab_requests(
 id uuid primary key,project_id text not null,source_agent_id text not null references scotty_agents(id),
 recipient_agent_id text not null references scotty_agents(id),
 kind text not null check(kind in ('handoff','share_memory')),
 title text not null,summary text not null,memory_id uuid,
 status text not null default 'pending' check(status in ('pending','approved','rejected','failed')),
 reviewed_by text,reviewed_at timestamptz,created_at timestamptz default now(),
 check(source_agent_id<>recipient_agent_id),check(length(summary) between 1 and 12000))`;
 await q`create index if not exists scotty_collab_requests_queue on scotty_collab_requests(status,created_at)`;})().catch(e=>{ready=undefined;throw e});return ready;}
export async function requestHandoff(p:string,source:string,recipient:string,title:string,summary:string,memoryId?:string,agentRuntime=false){
 await ensure();const q=db();
 if(source===recipient)throw Error("Distinct agents required");
 const kind=memoryId?"share_memory":"handoff";
 return q.begin(async(tx:any)=>{
 const a=await tx`select id from scotty_projects where id=${p}`;
 const g=await tx`select agent_id from scotty_collab_grants where project_id=${p} and agent_id in ${tx([source,recipient])}`;
 if(!a.length||g.length!==2)throw Error("Project membership is required");
 if(agentRuntime){
   // Serialize quota checks per agent+project to prevent parallel request bursts.
   await tx`select pg_advisory_xact_lock(hashtext(${p}),hashtext(${source}))`;
   const counts=await tx`select count(*)::int as n from scotty_collab_requests
    where project_id=${p} and source_agent_id=${source}
    and created_at>now()-interval '1 hour'`;
   if(Number(counts[0]?.n||0)>=20)throw Error("Agent request limit reached: 20 per hour per project");
 }
 const id=crypto.randomUUID();
 await tx`insert into scotty_collab_requests(id,project_id,source_agent_id,recipient_agent_id,kind,title,summary,memory_id)
 values(${id},${p},${source},${recipient},${kind},${title},${summary},${memoryId??null})`;
 return {id,status:"pending",kind};
 });
}
export async function pendingRequests(p?:string){
 await ensure();const q=db();
 return p?await q`select * from scotty_collab_requests where project_id=${p} and status='pending' order by created_at desc limit 100`:
 await q`select * from scotty_collab_requests where status='pending' order by created_at asc limit 100`;
}
export async function decideRequest(id:string,decision:"approved"|"rejected"){
 await ensure();
 return db().begin(async(tx:any)=>{
  const rows=await tx`select * from scotty_collab_requests where id::text=${id} for update`;
  const x=rows[0];
  if(!x||x.status!=="pending")throw Error("Request unavailable or already reviewed");
  if(decision==="approved"){
   const valid=await tx`select agent_id from scotty_collab_grants where project_id=${x.project_id} and agent_id in ${tx([x.source_agent_id,x.recipient_agent_id])}`;
   if(valid.length!==2)throw Error("Project membership was revoked");
   if(x.kind==="handoff"){
    const text="HANDOFF: "+x.title+"\\n"+x.summary;
    await tx`insert into scotty_collab_messages(id,project_id,sender_id,recipient_id,body) values(${crypto.randomUUID()},${x.project_id},${x.source_agent_id},${x.recipient_agent_id},${text})`;
   }else if(x.kind==="share_memory"&&x.memory_id){
    const memories=await tx`select m.id from scotty_brain_memories m join scotty_brain_proposals p on p.id=m.proposal_id where m.id=${x.memory_id} and m.agent_id=${x.source_agent_id} and m.scope='project' and m.project_id=${x.project_id} and p.status='approved'`;
    if(memories.length!==1)throw Error("Memory is not approved for this project's source agent");
    await tx`insert into scotty_collab_shares(id,project_id,memory_id,recipient_id) values(${crypto.randomUUID()},${x.project_id},${x.memory_id},${x.recipient_agent_id}) on conflict(project_id,memory_id,recipient_id) do update set revoked_at=null,approved_at=now()`;
   }else throw Error("Invalid request type");
  }
  await tx`update scotty_collab_requests set status=${decision},reviewed_by='owner',reviewed_at=now() where id=${x.id}`;
  await tx`insert into scotty_collab_audit(action,project_id,detail) values(${decision==="approved"?"request.approve":"request.reject"},${x.project_id},${tx.json({requestId:id,kind:x.kind,sourceAgentId:x.source_agent_id,recipientAgentId:x.recipient_agent_id})})`;
  return {id,status:decision,delivered:decision==="approved"};
 });
}
