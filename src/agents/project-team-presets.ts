import {missionDb as db} from './mission-records.ts';
import {ensureProjectMissions} from './project-missions.ts';
import {lockCollaborationProject} from './collaboration-lock.ts';
import {teamPresetInput,teamPresetState} from './project-team-presets-model.mjs';

let setup:Promise<void>|null=null;
async function ensure(){
 await ensureProjectMissions();
 if(!setup)setup=(async()=>{
  const q=db();
  await q`create table if not exists scotty_project_team_presets(
   id uuid primary key, project_id text not null,
   name text not null, revision integer not null check(revision>=1),
   spec jsonb not null, archived_at timestamptz,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now())`;
  await q`create unique index if not exists scotty_project_team_presets_unique_active
   on scotty_project_team_presets(project_id,lower(name)) where archived_at is null`;
 })().catch(e=>{setup=null;throw e});
 return setup;
}
const members=async(q:any,p:string)=>q`select a.id,a.name,a.department,a.is_chief as "isChief",
 a.chief_id as "chiefId",a.state,coalesce((sp.data->>'paused')::boolean,false) as paused
 from scotty_agents a join scotty_collab_grants g on g.agent_id=a.id and g.project_id=${p}
 left join scotty_specialist_profiles sp on sp.agent_id=a.id order by a.id`;
export async function preferredTeams(p:string){
 await ensure();
 const q=db();
 if(!(await q`select id from scotty_projects where id=${p}`).length)throw Error('Project not found');
 const [rows,roster]=await Promise.all([
  q`select id,name,revision,spec,created_at,updated_at from scotty_project_team_presets
   where project_id=${p} and archived_at is null order by updated_at desc,id limit 40`,
  members(q,p)
 ]);
 return {teams:rows.map((r:any)=>({...teamPresetState({
  ...r.spec,name:r.name,projectId:p,revision:r.revision
 },roster),id:r.id,updatedAt:r.updated_at})),
  readOnly:true,noPermissionsGranted:true,source:'Current project membership and owner-approved saved team presets'};
}
export async function savePreferredTeam(p:string,b:any){
 await ensure();
 return db().begin(async(q:any)=>{
  await lockCollaborationProject(q,p);
  if(!(await q`select id from scotty_projects where id=${p}`).length)throw Error('Project not found');
  const allowed=await members(q,p);
  const payload=teamPresetInput(b,p,allowed);
  const existing=(await q`select * from scotty_project_team_presets
   where project_id=${p} and lower(name)=lower(${payload.name}) and archived_at is null for update`)[0];
  if(Number(existing?.revision||0)!==payload.expectedRevision)throw Error('TEAM_PRESET_REVISION_CONFLICT');
  const spec={agentIds:payload.agentIds,leadChiefId:payload.leadChiefId};
  if(existing){
   await q`update scotty_project_team_presets set revision=revision+1,spec=${q.json(spec)},updated_at=now()
    where id=${existing.id}`;
   return {id:existing.id,revision:existing.revision+1,updated:true,automaticallyStarted:false,permissionsGranted:false};
  }
  const count=(await q`select count(*)::int as n from scotty_project_team_presets where project_id=${p} and archived_at is null`)[0].n;
  if(count>=20)throw Error('PROJECT_TEAM_PRESET_LIMIT_REACHED');
  const id=crypto.randomUUID();
  await q`insert into scotty_project_team_presets(id,project_id,name,revision,spec)
   values(${id},${p},${payload.name},1,${q.json(spec)})`;
  return {id,revision:1,updated:false,automaticallyStarted:false,permissionsGranted:false};
 });
}
export async function archivePreferredTeam(p:string,b:any){
 await ensure();
 if(b?.reviewed!==true||b?.approved!==true||typeof b.id!=='string'||!Number.isInteger(b.expectedRevision))throw Error('OWNER_TEAM_ARCHIVE_REVIEW_REQUIRED');
 return db().begin(async(q:any)=>{
  await lockCollaborationProject(q,p);
  const r=(await q`select id,revision from scotty_project_team_presets
    where project_id=${p} and id::text=${b.id} and archived_at is null for update`)[0];
  if(!r||r.revision!==b.expectedRevision)throw Error('TEAM_PRESET_REVISION_CONFLICT');
  await q`update scotty_project_team_presets set archived_at=now(),updated_at=now(),revision=revision+1
    where id=${r.id}`;
  return {id:r.id,archived:true,revision:r.revision+1,permissionsRevoked:false,missionCancelled:false};
 });
}
