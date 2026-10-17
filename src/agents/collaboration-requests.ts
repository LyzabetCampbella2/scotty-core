import postgres from "postgres";
import {message,share,ensureCollaboration} from "./collaboration.ts";
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
export async function requestHandoff(p:string,source:string,recipient:string,title:string,summary:string,memoryId?:string){
 await ensure();const q=db();
 if(source===recipient)throw Error("Distinct agents required");
 const kind=memoryId?"share_memory":"handoff";
 return q.begin(async(tx:any)=>{
 const a=await tx`select id from scotty_projects where id=${p}`;
 const g=await tx`select agent_id from scotty_collab_grants where project_id=${p} and agent_id in ${tx([source,recipient])}`;
 if(!a.length||g.length!==2)throw Error("Project membership is required");
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
 await ensure();const q=db();
 // Claim exclusively. Only one review can transition a pending request.
 const r=await q.begin(async(tx:any)=>{
 const rows=await tx`select * from scotty_collab_requests where id::text=${id} for update`;
 const x=rows[0];if(!x||x.status!=="pending")throw Error("Request unavailable or already reviewed");
 if(decision==="rejected"){await tx`update scotty_collab_requests set status='rejected',reviewed_by='owner',reviewed_at=now() where id=${x.id}`;return {status:"rejected",request:x};}
 // An approved request becomes a validated action. Keep a claim state before side effects.
 await tx`update scotty_collab_requests set status='approved',reviewed_by='owner',reviewed_at=now() where id=${x.id}`;
 return {status:"approved",request:x};
 });
 if(r.status==="rejected")return {id,status:"rejected"};
 const x=r.request;
 // Side effects use the grant and project permission checks again.
 try{
 if(x.kind==="handoff")await message(x.project_id,x.source_agent_id,x.recipient_agent_id,
 "HANDOFF: "+x.title+"\n"+x.summary);
 else if(x.kind==="share_memory"&&x.memory_id)await share(x.project_id,x.memory_id,x.recipient_agent_id);
 else throw Error("Invalid request type");
 return {id,status:"approved",delivered:true};
 }catch(e){
 await q`update scotty_collab_requests set status='failed' where id=${x.id} and status='approved'`;
 throw e;
 }
}
