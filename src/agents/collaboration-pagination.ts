import {ensureCollaborationRequests} from './collaboration-requests.ts';
import {missionDb as db} from './mission-records.ts';
import {lockCollaborationProject} from './collaboration-lock.ts';
let ready:Promise<void>|undefined;
async function ensureInbox(){await ensureCollaborationRequests();if(!ready)ready=db()`create table if not exists scotty_collab_inbox_seen(request_id uuid primary key references scotty_collab_requests(id),seen_at timestamptz not null default now())`.then(()=>{}).catch(e=>{ready=undefined;throw e});return ready;}
export async function markRequestRead(id:string){await ensureInbox();return db().begin(async(q:any)=>{const r=(await q`select project_id from scotty_collab_requests where id::text=${id}`)[0];if(!r)throw Error('Request not found');await lockCollaborationProject(q,r.project_id);await q`insert into scotty_collab_inbox_seen(request_id) values(${id}) on conflict do nothing`;return {id,read:true};});}
export async function collaborationRequestPage(projectId?:string,cursor?:string,limit=30){
 await ensureInbox();if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Page size must be 1 to 100');
 let after:{at:string;id:string}|null=null;
 if(cursor){try{after=JSON.parse(Buffer.from(cursor,'base64url').toString());if(!after||typeof after.at!=='string'||!Number.isFinite(Date.parse(after.at))||!/^[-0-9a-f]{36}$/i.test(after.id))throw Error();}catch{throw Error('Invalid queue cursor');}}
 // Preserve full database timestamp precision in the cursor, including ties.
 const rows=await db()`select r.*,r.created_at::text as cursor_time,m.text as memory_text,m.source as memory_source,m.approved_by as memory_approved_by,(seen.request_id is null) as unread,case when (select count(*) from scotty_collab_grants g where g.project_id=r.project_id and g.agent_id in(r.source_agent_id,r.recipient_agent_id))<>2 then 'Project membership revoked' when r.kind='share_memory' and m.id is null then 'Approved project evidence unavailable' else null end as blocked_reason from scotty_collab_requests r left join scotty_collab_inbox_seen seen on seen.request_id=r.id left join scotty_brain_memories m on m.id=r.memory_id and m.agent_id=r.source_agent_id and m.project_id=r.project_id and m.scope='project' and exists(select 1 from scotty_brain_proposals pr where pr.id=m.proposal_id and pr.status='approved') where r.status='pending' and (${projectId||null}::text is null or r.project_id=${projectId||null}) and (${after?.at||null}::text::timestamptz is null or (r.created_at,r.id)>(${after?.at||null}::text::timestamptz,${after?.id||null}::uuid)) order by r.created_at,r.id limit ${limit+1}`;
 const more=rows.length>limit,requests=rows.slice(0,limit),last=requests.at(-1);
 const count=(await db()`select count(*)::int as n,count(*) filter(where not exists(select 1 from scotty_collab_inbox_seen seen where seen.request_id=r.id))::int as unread from scotty_collab_requests r where status='pending' and (${projectId||null}::text is null or project_id=${projectId||null})`)[0];
 return {requests,nextCursor:more?Buffer.from(JSON.stringify({at:last.cursor_time,id:last.id})).toString('base64url'):null,pendingCount:count.n,unreadCount:count.unread};
}
