import {ensureCollaboration} from './collaboration.ts';
import {missionDb as db} from './mission-records.ts';
import {lockCollaborationProject} from './collaboration-lock.ts';
let init:Promise<void>|undefined;
export const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function ensureProjectEvidence(){if(!init)init=(async()=>{await ensureCollaboration();await db()`create table if not exists scotty_project_evidence(id uuid primary key,project_id text not null,title text not null,kind text not null,source_id text,source_hash text,reference text not null default '',body text not null,recipients jsonb not null,grant_snapshot jsonb not null,approved_by text not null,approved_at timestamptz not null default now(),revoked_at timestamptz)`;await db()`create index if not exists scotty_project_evidence_project on scotty_project_evidence(project_id,approved_at)`;})().catch(e=>{init=undefined;throw e});return init;}
async function exists(q:any,name:string){return !!(await q`select to_regclass(${name}) as name`)[0]?.name;}
async function source(q:any,p:string,kind:string,id:string){
 if(kind==='document'&&await exists(q,'scotty_workspace_documents')){
  const row=(await q`select id,title,content,revision,updated_at::text as "updatedAt" from scotty_workspace_documents where id::text=${id} and project_id=${p}`)[0];
  if(row)return {id:String(row.id),title:row.title,body:row.content,reference:'workspace-document:'+row.id,revision:row.revision,updatedAt:row.updatedAt};
 }
 if(kind==='file'&&await exists(q,'scotty_files')){
  const row=(await q`select id,name,path,metadata,updated_at::text as "updatedAt" from scotty_files where id::text=${id} and project_id=${p}`)[0];
  if(row){const meta=row.metadata||{},event=meta.source==='apple-calendar'?meta.event:null;return {id:String(row.id),title:row.name,body:typeof meta.text==='string'?meta.text:event?JSON.stringify({title:event.title,start:event.start,end:event.end,calendar:event.calendar}):'',reference:String(row.path||('workspace-file:'+row.id)),updatedAt:row.updatedAt,provider:String(meta.source||'workspace'),snapshotAt:meta.snapshotAt||null,referenceOnly:!meta.text&&!event};}
 }
 throw Error('Source is unavailable or outside the selected project');
}
export async function evidenceCandidates(p:string){await ensureProjectEvidence();const q=db(),items:any[]=[];
 if(await exists(q,'scotty_workspace_documents'))for(const r of await q`select id from scotty_workspace_documents where project_id=${p} order by updated_at desc limit 100`){const item=await source(q,p,'document',String(r.id));items.push({...item,kind:'document',sourceHash:await digest(item)});}
 if(await exists(q,'scotty_files'))for(const r of await q`select id from scotty_files where project_id=${p} order by updated_at desc limit 100`){const item=await source(q,p,'file',String(r.id));items.push({...item,kind:'file',sourceHash:await digest(item)});}
 return {items,limitPerKind:100,note:'References do not imply their remote contents have been read. App entries are saved snapshots.'};
}
export async function approveEvidence(p:string,input:any){await ensureProjectEvidence();if(input?.approved!==true||!['document','file','note','reference'].includes(input.kind)||typeof input.title!=='string'||!input.title.trim()||input.title.length>240||!Array.isArray(input.agentIds)||!input.agentIds.length||input.agentIds.length>128||input.agentIds.some((x:any)=>typeof x!=='string')||new Set(input.agentIds).size!==input.agentIds.length)throw Error('Review a source and explicitly approve its selected project recipients');
 return db().begin(async(q:any)=>{await lockCollaborationProject(q,p);if(!(await q`select id from scotty_projects where id=${p}`).length)throw Error('Project not found');
  const grants=await q`select agent_id,granted_at::text as granted_at from scotty_collab_grants where project_id=${p} and agent_id in ${q(input.agentIds)} order by agent_id`;if(grants.length!==input.agentIds.length)throw Error('Recipients must be current project members');
  let body='',reference='',sourceId=null,sourceHash=null;
  if(['document','file'].includes(input.kind)){if(typeof input.sourceId!=='string')throw Error('Source required');const snapshot=await source(q,p,input.kind,input.sourceId);sourceHash=await digest(snapshot);if(sourceHash!==input.sourceHash)throw Error('Source changed since preview; review it again');body=snapshot.body;reference=snapshot.reference;sourceId=input.sourceId;}
  else{if(typeof input.body!=='string')throw Error('Evidence text required');body=input.body;reference=String(input.reference||'');if(input.kind==='reference'){const url=new URL(reference);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP reference without credentials');}}
  if(body.length>24000||reference.length>2000)throw Error('Evidence exceeds the review limit');
  const id=crypto.randomUUID();await q`insert into scotty_project_evidence(id,project_id,title,kind,source_id,source_hash,reference,body,recipients,grant_snapshot,approved_by) values(${id},${p},${input.title.trim()},${input.kind},${sourceId},${sourceHash},${reference},${body},${q.json(input.agentIds)},${q.json(grants)},'owner')`;
  await q`insert into scotty_collab_audit(action,project_id,detail) values('evidence.approve',${p},${q.json({evidenceId:id,kind:input.kind,recipients:input.agentIds,actor:'owner'})})`;return {id,approved:true};
 });
}
export async function revokeEvidence(p:string,id:string){await ensureProjectEvidence();return db().begin(async(q:any)=>{await lockCollaborationProject(q,p);const rows=await q`update scotty_project_evidence set revoked_at=now() where id::text=${id} and project_id=${p} and revoked_at is null returning id`;if(!rows.length)throw Error('Active evidence not found');await q`insert into scotty_collab_audit(action,project_id,detail) values('evidence.revoke',${p},${q.json({evidenceId:id,actor:'owner'})})`;return {id,revoked:true};});}
export async function selectedEvidence(q:any,p:string,agent:string,ids:string[]){if(!ids.length)return [];const rows=await q`select * from scotty_project_evidence where id::text in ${q(ids)} and project_id=${p} and revoked_at is null order by id`;if(rows.length!==ids.length)throw Error('Selected evidence is revoked or outside this project');const result=[];
 for(const r of rows){if(!r.recipients.includes(agent))throw Error('Evidence is not approved for this assignee');const grant=(await q`select granted_at::text as at from scotty_collab_grants where project_id=${p} and agent_id=${agent}`)[0];if(!grant||!r.grant_snapshot.some((g:any)=>g.agent_id===agent&&g.granted_at===grant.at))throw Error('Evidence recipient membership changed; approve a new snapshot');
  if(r.source_id&&await digest(await source(q,p,r.kind,r.source_id))!==r.source_hash)throw Error('Evidence source changed; approve a new snapshot');
  result.push({id:r.id,evidenceId:r.id,title:r.title,text:r.body,source:r.reference,approvedBy:r.approved_by,approvedAt:r.approved_at,referenceOnly:!r.body,kind:r.kind});
 }return result;
}
export async function evidenceList(p:string){await ensureProjectEvidence();return db()`select id,title,kind,reference,body,recipients,approved_by,approved_at,revoked_at from scotty_project_evidence where project_id=${p} order by approved_at desc,id limit 200`;}
// Owner review records cite a current project snapshot without granting an agent access.
export async function ownerEvidenceReferences(q:any,p:string,ids:string[]){if(!ids.length)return [];const rows=await q`select * from scotty_project_evidence where id::text in ${q(ids)} and project_id=${p} and revoked_at is null order by id`;if(rows.length!==ids.length)throw Error('Evidence is revoked or outside this project');const refs=[];for(const r of rows){if(r.source_id&&await digest(await source(q,p,r.kind,r.source_id))!==r.source_hash)throw Error('Evidence source changed; approve a current snapshot');refs.push({id:String(r.id),title:r.title,reference:r.reference,hash:await digest({id:r.id,body:r.body,reference:r.reference,sourceHash:r.source_hash,approvedAt:r.approved_at})});}return refs;}
