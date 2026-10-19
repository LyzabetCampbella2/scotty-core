import {missionDb as db} from './mission-records.ts';
import {ensureCollaboration} from './collaboration.ts';
import {lockCollaborationProject} from './collaboration-lock.ts';
import {requestSpec,teamResponse,requesterAgreement,version,commandId,fingerprint,field,reference} from './ansjem-work-model.ts';
import {deliveryEnabled,ensureAnsjemDelivery,deliveryState,storeDelivery,deliveryAction,staffingRecommendations,handoffPacket} from './ansjem-delivery.ts';
let initializing:Promise<void>|undefined;
export async function ensureAnsjemWork(){
 if(process.env.SCOTTY_ANSJEM_WORK_ENABLED!=='true')throw Error('ANSJEM development workspace is disabled');
 if(!initializing)initializing=(async()=>{await ensureCollaboration();const q=db();
  await q`create sequence if not exists scotty_ansjem_work_number`;
  await q`create table if not exists scotty_ansjem_work(work_id text primary key,number bigint unique not null,project_id text not null,revision integer not null default 1,version integer not null default 1,spec jsonb not null,status text not null default 'requested',release_status text not null default 'pending_authorization',team_response jsonb,requester_agreement jsonb,progress jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
  await q`create index if not exists scotty_ansjem_project_number on scotty_ansjem_work(project_id,number)`;
  await q`create table if not exists scotty_ansjem_work_revisions(work_id text references scotty_ansjem_work(work_id),revision integer not null,spec jsonb not null,created_at timestamptz not null default now(),primary key(work_id,revision))`;
  await q`create table if not exists scotty_ansjem_work_events(id bigserial primary key,command_id uuid unique not null,project_id text not null,work_id text not null references scotty_ansjem_work(work_id),action text not null,input_hash text not null,result jsonb not null,created_at timestamptz not null default now())`;
 })().catch(e=>{initializing=undefined;throw e});return initializing;
}
async function project(q:any,p:string){if(!(await q`select id from scotty_projects where id=${p}`).length)throw Error('Project not found');}
function present(w:any){return {...w,number:String(w.number),recordUrl:'/agents/project-operations?project='+encodeURIComponent(w.project_id)+'&ansjem='+w.work_id,syncMode:'manual',remoteVerified:false};}
async function event(q:any,p:string,id:string,action:string,input:any,result:any){const hash=await fingerprint(input);await q`insert into scotty_ansjem_work_events(command_id,project_id,work_id,action,input_hash,result) values(${input.commandId},${p},${id},${action},${hash},${q.json(result)})`;await q`insert into scotty_collab_audit(action,project_id,detail) values(${'ansjem.'+action},${p},${q.json({workId:id,revision:result.revision,version:result.version,commandId:input.commandId,actor:'owner',provenance:'manual_owner_record'})})`;return result;}
async function repeat(q:any,p:string,input:any){const r=(await q`select * from scotty_ansjem_work_events where command_id::text=${input.commandId}`)[0];if(!r)return null;if(r.project_id!==p||r.input_hash!==await fingerprint(input))throw Error('Command ID was already used for a different request');return r.result;}
export async function createAnsjemWork(p:string,b:any){commandId(b?.commandId);const spec=requestSpec(b?.spec);if(b.reviewed!==true)throw Error('Review the request before saving');await ensureAnsjemWork();return db().begin(async(q:any)=>{await lockCollaborationProject(q,p);await project(q,p);const prior=await repeat(q,p,b);if(prior)return prior;const n=(await q`select nextval('scotty_ansjem_work_number') as n`)[0].n,id='ANSJEM-DEV-'+String(n).padStart(4,'0');const w=(await q`insert into scotty_ansjem_work(work_id,number,project_id,spec) values(${id},${n},${p},${q.json(spec)}) returning *`)[0];await q`insert into scotty_ansjem_work_revisions(work_id,revision,spec) values(${id},1,${q.json(spec)})`;return event(q,p,id,'request',b,present(w));});}
export async function ansjemBoard(p:string,cursor='0',status=''){
 await ensureAnsjemWork();await project(db(),p);if(!/^\d{1,18}$/.test(cursor))throw Error('Invalid board cursor');if(status&&!['requested','accepted_for_work','in_progress','ready_for_acceptance','accepted','closed','blocked','changes_requested'].includes(status))throw Error('Invalid status filter');
 const q=db(),rows=status?await q`select * from scotty_ansjem_work where project_id=${p} and number>${cursor}::bigint and status=${status} order by number limit 51`:await q`select * from scotty_ansjem_work where project_id=${p} and number>${cursor}::bigint order by number limit 51`;
 const counts=await q`select status,count(*)::int as count from scotty_ansjem_work where project_id=${p} group by status`;
 return {items:rows.slice(0,50).map(present),nextCursor:rows.length>50?String(rows[49].number):null,counts,syncMode:'manual',remoteVerified:false};
}
export async function ansjemDetail(p:string,id:string,before='9223372036854775807'){
 await ensureAnsjemWork();await project(db(),p);if(!/^\d{1,19}$/.test(before))throw Error('Invalid history cursor');const q=db(),w=(await q`select * from scotty_ansjem_work where project_id=${p} and work_id=${id}`)[0];if(!w)throw Error('Work request not found');const rows=await q`select id::text,action,result,created_at from scotty_ansjem_work_events where project_id=${p} and work_id=${id} and id<${before}::bigint order by id desc limit 31`;
 const delivery=await deliveryState(q,w);return {work:present({...w,delivery}),packet:delivery?await handoffPacket(q,w,delivery):null,events:rows.slice(0,30),nextEventCursor:rows.length>30?rows[29].id:null};
}
export async function ansjemStaffing(p:string,id:string){await ensureAnsjemWork();if(!deliveryEnabled())throw Error('ANSJEM delivery tools are disabled');const w=(await db()`select * from scotty_ansjem_work where project_id=${p} and work_id=${id}`)[0];if(!w)throw Error('Work request not found');return staffingRecommendations(w);}
export async function updateAnsjemWork(p:string,id:string,b:any){commandId(b?.commandId);version(b?.version);if(b?.reviewed!==true)throw Error('Review this exact change first');await ensureAnsjemWork();if(deliveryEnabled())await ensureAnsjemDelivery();return db().begin(async(q:any)=>{
 await lockCollaborationProject(q,p);await project(q,p);const prior=await repeat(q,p,b);if(prior){if(prior.work_id!==id)throw Error('Command ID belongs to another work request');return prior;}
 const w=(await q`select * from scotty_ansjem_work where project_id=${p} and work_id=${id} for update`)[0];if(!w)throw Error('Work request not found');if(w.version!==b.version)throw Error('Work request changed; refresh and review again');
 let spec=w.spec,status=w.status,response=w.team_response,agreement=w.requester_agreement,progress=w.progress,revision=w.revision;const delivery=await deliveryState(q,w);
 if(b.action==='revise'){
  if(deliveryEnabled()&&agreement)throw Error('Propose a scope change for agreed work so both sides can review its impact');
  if(['accepted','closed'].includes(status))throw Error('Create a follow-up request for accepted or closed work');spec=requestSpec(b.spec);revision++;response=null;agreement=null;progress=null;status='requested';await q`insert into scotty_ansjem_work_revisions(work_id,revision,spec) values(${id},${revision},${q.json(spec)})`;
 }else if(b.action==='team-response'){
  if(!['requested','changes_requested'].includes(status))throw Error('Revise the request before recording a new agreement');response={...teamResponse(b.response),revision};agreement=null;status=response.disposition==='propose_changes'?'changes_requested':'requested';
 }else if(b.action==='requester-agreement'){
  if(status!=='requested'||response?.disposition!=='accept'||response.revision!==revision)throw Error('The receiving team must accept this revision with owner, estimate and date first');
  agreement={...requesterAgreement(b.agreement),revision};status='accepted_for_work';
 }else if(b.action==='progress'){
  if(!response||!agreement||response.revision!==revision||agreement.revision!==revision)throw Error('Both sides must agree before recording execution');
  if(!['accepted_for_work','in_progress','blocked','ready_for_acceptance',...(deliveryEnabled()?['changes_requested']:[])].includes(status)||!['in_progress','blocked','ready_for_acceptance'].includes(b.status))throw Error('Choose an execution status; acceptance and closure are separate workflows');
  progress={status:b.status,note:field(b.note,'progress note'),owner:field(b.owner,'next-action owner',180),nextAction:field(b.nextAction,'next action'),reference:reference(b.reference,false),recordedBy:'owner',provenance:'manual_owner_record'};status=b.status;
 }else if(['staffing','criterion-review','submit-delivery','accept-delivery','propose-scope-change','scope-team-response','apply-scope-change'].includes(b.action)){
  await deliveryAction(q,w,b,delivery);spec=w.spec;revision=w.revision;status=w.status;response=w.team_response;agreement=w.requester_agreement;progress=w.progress;
 }else throw Error('Unknown work action');
 const updated=(await q`update scotty_ansjem_work set spec=${q.json(spec)},revision=${revision},version=version+1,status=${status},team_response=${response?q.json(response):null},requester_agreement=${agreement?q.json(agreement):null},progress=${progress?q.json(progress):null},updated_at=now() where work_id=${id} and project_id=${p} returning *`)[0];if(delivery){if(delivery.revision!==revision){delivery.revision=revision;delivery.staffing=null;delivery.criteria={};delivery.submissions=[];delivery.acceptance=null;}await storeDelivery(q,updated,delivery);}return event(q,p,id,b.action,b,present({...updated,...(delivery?{delivery}:{})}));
 });}
