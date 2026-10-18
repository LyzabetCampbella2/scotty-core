import {ensureCollaboration} from './collaboration.ts';
import {lockCollaborationProject} from './collaboration-lock.ts';
import {ensureMissionRecords,missionDb as db} from './mission-records.ts';
import {missionSpec,type MissionSpec} from './project-mission-model.ts';
import {ensureCollaborationRequests} from './collaboration-requests.ts';
import {ensureWorkload} from './workload.ts';
import {profileInput,projectAllowed} from './team-model.ts';
import {ensureProjectEvidence,selectedEvidence} from './project-evidence.ts';
let initializing:Promise<void>|undefined;
export async function ensureProjectMissions(){
 if(!initializing)initializing=(async()=>{
  await ensureCollaboration();await ensureCollaborationRequests();await ensureProjectEvidence();await ensureMissionRecords();const q=db();
  await q`create table if not exists scotty_project_mission_specs(plan_id uuid primary key references scotty_agent_plans(id),project_id text not null,revision integer not null default 1,spec jsonb not null,status text not null default 'awaiting_approval',approved_revision integer,approval_fingerprint text,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
  await q`create table if not exists scotty_project_mission_history(plan_id uuid references scotty_project_mission_specs(plan_id),revision integer not null,spec jsonb not null,results jsonb not null default '[]',reviews jsonb not null default '[]',created_at timestamptz not null default now(),primary key(plan_id,revision))`;
 })().catch(e=>{initializing=undefined;throw e});return initializing;
}
export async function missionAudit(q:any,p:string,action:string,detail:any){await q`insert into scotty_collab_audit(action,project_id,detail) values(${action},${p},${q.json(detail)})`;}
// All authorization reads and deliveries use the same project lock as grants/revocations.
export async function missionAuthorization(q:any,p:string,spec:MissionSpec){
 if(!(await q`select id from scotty_projects where id=${p}`).length)throw Error('Project not found');
 const agents=[...new Set(spec.steps.map(s=>s.agentId))].sort();
 const grants=await q`select agent_id,granted_at::text as granted_at from scotty_collab_grants where project_id=${p} and agent_id in ${q(agents)} order by agent_id`;
 if(grants.length!==agents.length)throw Error('Every assigned agent must be a current project member');
 const handoffs:any[]=[];
 if(spec.steps.some(s=>s.chiefReview)){const chiefs=await q`select id from scotty_agents where is_chief=true and id in ${q(agents)}`;if(spec.steps.some(s=>s.chiefReview&&!chiefs.some((a:any)=>a.id===s.agentId)))throw Error('Chief review must be assigned to an existing project chief');}
 if(spec.coordination){
  const c=spec.coordination,chiefs=[c.leadChiefId,...c.supportingChiefIds];
  const roster=await q`select id,is_chief,chief_id from scotty_agents where id in ${q(agents)}`;
  if(chiefs.some(id=>!roster.some((a:any)=>a.id===id&&a.is_chief)))throw Error('Coordination chiefs must be assigned existing chiefs');
  const root=(id:string)=>{const a=roster.find((a:any)=>a.id===id);return a?.is_chief?a.id:a?.chief_id;};
  if(roster.some((a:any)=>!chiefs.includes(root(a.id))))throw Error('Every assignee needs a selected coordinating chief');
  for(const to of spec.steps)for(const dep of to.dependsOn){const from=spec.steps.find(s=>s.id===dep)!;
   if(from.agentId===to.agentId||root(from.agentId)===root(to.agentId))continue;
   const link=c.handoffs.find(h=>h.fromStep===dep&&h.toStep===to.id);if(!link)throw Error('Cross-chief dependency requires an approved project handoff');
   const request=(await q`select id,status,reviewed_at from scotty_collab_requests where id::text=${link.requestId} and project_id=${p} and source_agent_id=${from.agentId} and recipient_agent_id=${to.agentId} and kind='handoff' and status='approved'`)[0];
   if(!request)throw Error('Cross-chief handoff is not approved for these assignees and project');handoffs.push(request);
  }
 }
 const contexts:any={};
 for(const step of spec.steps){
  const memories=step.sourceIds.length?await q`select m.id,m.agent_id as "sourceAgentId",m.text,m.source,m.approved_by as "approvedBy",m.created_at as "createdAt",g.granted_at::text as "sourceGrant",s.approved_at::text as "sharedAt" from scotty_brain_memories m join scotty_brain_proposals pr on pr.id=m.proposal_id and pr.status='approved' join scotty_collab_grants g on g.agent_id=m.agent_id and g.project_id=${p} left join scotty_collab_shares s on s.memory_id=m.id and s.project_id=${p} and s.recipient_id=${step.agentId} and s.revoked_at is null where m.id::text in ${q(step.sourceIds)} and m.scope='project' and m.project_id=${p} and (m.agent_id=${step.agentId} or s.id is not null) order by m.id`:[];
  if(memories.length!==step.sourceIds.length)throw Error('A selected source is private, unapproved, revoked or outside this project');
  contexts[step.id]=[...memories,...await selectedEvidence(q,p,step.agentId,step.evidenceIds||[])];
 }
 const encoded=new TextEncoder().encode(JSON.stringify({grants,contexts,handoffs}));
 const authorization=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoded))).map(n=>n.toString(16).padStart(2,'0')).join('');
 return {contexts,authorization};
}
export async function withProjectMission<T>(p:string,id:string,fn:(q:any,m:any)=>Promise<T>):Promise<T>{
 await ensureProjectMissions();return db().begin(async(q:any)=>{await lockCollaborationProject(q,p);const m=(await q`select * from scotty_project_mission_specs where plan_id::text=${id} and project_id=${p} for update`)[0];if(!m)throw Error('Project mission not found');return fn(q,m);});
}
export async function checkedMission(q:any,m:any,revision:number){
 if(m.revision!==revision||m.approved_revision!==revision)throw Error('Plan revision requires owner approval');
 const auth=await missionAuthorization(q,m.project_id,m.spec);
 if(auth.authorization!==m.approval_fingerprint)throw Error('Project membership or source approval changed; revise and approve the plan again');
 if(m.spec.coordination){
  await q`select id from scotty_team_config where id=1 for update`;
  const ids=[...new Set(m.spec.steps.map((s:any)=>s.agentId))];const profiles=await q`select agent_id,data from scotty_specialist_profiles where agent_id in ${q(ids)}`;
  if(profiles.some((r:any)=>!projectAllowed(profileInput(r.data),m.project_id)))throw Error('An assigned agent profile no longer permits this project');
 }
 return auth;
}
export async function createProjectMission(p:string,input:any){
 const spec=missionSpec(input);await ensureProjectMissions();return db().begin(async(q:any)=>{
  await lockCollaborationProject(q,p);await missionAuthorization(q,p,spec);const id=crypto.randomUUID();
  await q`insert into scotty_agent_plans(id,task,agents,dependencies,briefing,project_managed) values(${id},${spec.goal},${q.json([...new Set(spec.steps.map(s=>s.agentId))])},${q.json(spec.steps)},'[]',true)`;
  await q`insert into scotty_project_mission_specs(plan_id,project_id,spec) values(${id},${p},${q.json(spec)})`;
  await q`insert into scotty_project_mission_history(plan_id,revision,spec) values(${id},1,${q.json(spec)})`;
  await missionAudit(q,p,'mission.plan.create',{planId:id,revision:1,actor:'owner'});return {id,revision:1,status:'awaiting_approval'};
 });
}
export async function reviseProjectMission(p:string,id:string,revision:number,input:any){
 const spec=missionSpec(input);return withProjectMission(p,id,async(q,m)=>{
  if(m.revision!==revision)throw Error('Stale plan revision');
  if(['running','completed','cancelled'].includes(m.status))throw Error('Pause unfinished work before revising');
  await missionAuthorization(q,p,spec);const next=revision+1;
  await q`update scotty_project_mission_history h set results=m.results,reviews=m.review from scotty_agent_missions m where h.plan_id=${m.plan_id} and h.revision=${revision} and m.id=h.plan_id`;
  await q`update scotty_project_mission_specs set spec=${q.json(spec)},revision=${next},status='awaiting_approval',approved_revision=null,approval_fingerprint=null,updated_at=now() where plan_id=${m.plan_id}`;
  await q`insert into scotty_project_mission_history(plan_id,revision,spec) values(${m.plan_id},${next},${q.json(spec)})`;
  await q`update scotty_agent_plans set task=${spec.goal},agents=${q.json([...new Set(spec.steps.map(s=>s.agentId))])},dependencies=${q.json(spec.steps)},status='awaiting_approval',approved_at=null where id=${m.plan_id}`;
  await missionAudit(q,p,'mission.plan.revise',{planId:id,revision:next,actor:'owner'});return {id,revision:next,status:'awaiting_approval'};
 });
}
export async function approveProjectMission(p:string,id:string,revision:number){return withProjectMission(p,id,async(q,m)=>{
 if(m.revision!==revision||m.status!=='awaiting_approval')throw Error('Plan unavailable or stale');
 const auth=await missionAuthorization(q,p,m.spec);
 await q`update scotty_project_mission_specs set approved_revision=${revision},approval_fingerprint=${auth.authorization},status='approved',updated_at=now() where plan_id=${m.plan_id}`;
 await q`update scotty_agent_plans set status='approved',approved_at=now() where id=${m.plan_id}`;
 await missionAudit(q,p,'mission.plan.approve',{planId:id,revision,actor:'owner'});return {id,revision,status:'approved'};
});}
export async function controlProjectMission(p:string,id:string,revision:number,action:'pause'|'resume'|'cancel'|'reject'){return withProjectMission(p,id,async(q,m)=>{
 if(m.revision!==revision)throw Error('Stale plan revision');
 let status:string;
 if(action==='pause'&&['approved','running','needs_review'].includes(m.status))status='paused';
 else if(action==='resume'&&m.status==='paused'){await checkedMission(q,m,revision);status='approved';}
 else if(action==='cancel'&&!['completed','cancelled'].includes(m.status))status='cancelled';
 else if(action==='reject'&&m.status==='awaiting_approval')status='rejected';
 else throw Error('Invalid mission transition');
 await q`update scotty_project_mission_specs set status=${status},updated_at=now() where plan_id=${m.plan_id}`;
 await q`update scotty_agent_missions set status=${status},updated_at=now() where id=${m.plan_id}`;
 await missionAudit(q,p,'mission.'+action,{planId:id,revision,actor:'owner'});return {id,revision,status};
});}
// Simulation is synchronous, deterministic and never invokes a provider or tool.
export async function simulateProjectMission(p:string,id:string,revision:number){return withProjectMission(p,id,async(q,m)=>{
 if(m.status!=='approved')throw Error('Mission is not approved for simulation');if(m.spec.coordination)throw Error('Use the bounded coordination queue for this plan');await checkedMission(q,m,revision);
 const results=m.spec.steps.map((s:any)=>({stepId:s.id,agentId:s.agentId,revision,status:'draft',text:'SIMULATION: '+s.deliverable,sourceIds:s.sourceIds,verified:false}));
 await q`insert into scotty_agent_missions(id,task,status,agents,dependencies,results,project_managed) values(${m.plan_id},${m.spec.goal},'needs_review',${q.json([...new Set(m.spec.steps.map((s:any)=>s.agentId))])},${q.json(m.spec.steps)},${q.json(results)},true) on conflict(id) do update set status='needs_review',results=excluded.results,dependencies=excluded.dependencies,review='[]',updated_at=now()`;
 await q`update scotty_project_mission_specs set status='needs_review',updated_at=now() where plan_id=${m.plan_id}`;
 await missionAudit(q,p,'mission.simulate',{planId:id,revision,providerCalls:0});return {id,revision,status:'needs_review',results};
});}
export async function reviewMissionDraft(p:string,id:string,revision:number,stepId:string,decision:'approved'|'rejected'|'revision_requested',note:string){return withProjectMission(p,id,async(q,m)=>{
 if(m.status!=='needs_review')throw Error('No releasable drafts');await checkedMission(q,m,revision);
 const record=(await q`select results,review from scotty_agent_missions where id=${m.plan_id} for update`)[0];
 const result=record?.results.find((r:any)=>r.stepId===stepId&&r.revision===revision);if(!result||result.status!=='draft')throw Error('Draft unavailable or already reviewed');
 const reviews=[...record.review,{stepId,revision,decision,note:note.slice(0,2000),reviewedBy:'owner',reviewedAt:new Date().toISOString()}];
 const results=record.results.map((r:any)=>r===result?{...r,status:decision==='approved'?'released':decision}:r);
 let status=results.length===m.spec.steps.length&&results.every((r:any)=>r.status==='released')?'completed':results.some((r:any)=>['rejected','revision_requested'].includes(r.status))?'revision_requested':'needs_review';
 if(m.spec.coordination){
  await q`update scotty_mission_jobs set status=${decision==='approved'?'released':decision} where plan_id=${m.plan_id} and revision=${revision} and step_id=${stepId} and status='draft'`;
  const remaining=(await q`select count(*)::int n from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} and status in ('queued','claimed')`)[0].n;
  if(decision==='approved'&&remaining>0)status='running';
 }
 await q`update scotty_agent_missions set results=${q.json(results)},review=${q.json(reviews)},status=${status},updated_at=now() where id=${m.plan_id}`;
 await q`update scotty_project_mission_specs set status=${status},updated_at=now() where plan_id=${m.plan_id}`;
 await missionAudit(q,p,'mission.draft.review',{planId:id,revision,stepId,decision,actor:'owner'});return {id,status};
});}
export async function projectMissionDetail(p:string,id:string){return withProjectMission(p,id,async(q,m)=>{let blocker=null;try{if(m.approved_revision)await checkedMission(q,m,m.revision);else await missionAuthorization(q,p,m.spec);}catch(e){blocker=e instanceof Error?e.message:'Access changed';}return {plan:m,blocker,history:await q`select revision,spec,results,reviews,created_at from scotty_project_mission_history where plan_id=${m.plan_id} order by revision`,mission:(await q`select * from scotty_agent_missions where id=${m.plan_id}`)[0]||null};});}
export async function projectMissionList(p:string){await ensureProjectMissions();return db()`select plan_id as id,project_id,revision,status,spec,updated_at from scotty_project_mission_specs where project_id=${p} order by updated_at desc,plan_id limit 100`;}
export async function missionRecommendations(p:string){await ensureProjectMissions();await ensureWorkload();return db()`select a.id,a.name,a.department,a.is_chief as "isChief",a.chief_id as "chiefId",a.state,(select count(*)::int from scotty_agent_slots s where s.agent_id=a.id and s.lease_until>now()) as "activeClaims",coalesce((profile.data->>'paused')::boolean,false) as paused,'Current project member; owner chooses assignments; workload checked again on dispatch' as reason from scotty_agents a join scotty_collab_grants g on g.agent_id=a.id and g.project_id=${p} left join scotty_specialist_profiles profile on profile.agent_id=a.id order by a.is_chief desc,a.sort_order`;}
export async function missionSourceChoices(p:string){await ensureProjectMissions();return db()`select m.id,m.agent_id as "agentId",m.text,m.source,m.approved_by as "approvedBy",coalesce((select jsonb_agg(s.recipient_id) from scotty_collab_shares s where s.memory_id=m.id and s.project_id=${p} and s.revoked_at is null),'[]'::jsonb) as recipients from scotty_brain_memories m join scotty_brain_proposals pr on pr.id=m.proposal_id and pr.status='approved' join scotty_collab_grants g on g.agent_id=m.agent_id and g.project_id=${p} where m.project_id=${p} and m.scope='project' order by m.created_at,m.id`;}
export async function missionHandoffChoices(p:string){await ensureProjectMissions();return db()`select id,title,source_agent_id as "sourceAgentId",recipient_agent_id as "recipientAgentId" from scotty_collab_requests where project_id=${p} and kind='handoff' and status='approved' order by created_at,id`;}
export async function missionProjectChoices(){await ensureProjectMissions();return db()`select p.id,coalesce(to_jsonb(p)->>'name',to_jsonb(p)->>'title',to_jsonb(p)->'data'->>'name',p.id::text) as name from scotty_projects p order by p.id`;}
