import {ensureProjectMissions,withProjectMission,checkedMission,missionAudit} from './project-missions.ts';
import {missionDb as db} from './mission-records.ts';
import {ensureWorkload,claimAgentInTransaction} from './workload.ts';
let initializing:Promise<void>|undefined;
export async function ensureCoordination(){if(!initializing)initializing=(async()=>{await ensureProjectMissions();await ensureWorkload();
 await db()`create table if not exists scotty_mission_runs(plan_id uuid references scotty_project_mission_specs(plan_id),revision integer not null,started_at timestamptz not null default now(),deadline timestamptz not null,primary key(plan_id,revision))`;
 await db()`create table if not exists scotty_mission_jobs(plan_id uuid,revision integer,step_id text,agent_id text not null,status text not null default 'queued',attempts integer not null default 0,claim_token uuid,slot_id uuid,lease_until timestamptz,output jsonb,blocker text,primary key(plan_id,revision,step_id),foreign key(plan_id,revision) references scotty_mission_runs(plan_id,revision))`;
 })().catch(e=>{initializing=undefined;throw e});return initializing;}
export async function startCoordination(p:string,id:string,revision:number){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 if(m.status!=='approved'||!m.spec.coordination)throw Error('Approved chief coordination plan required');await checkedMission(q,m,revision);
 const limits=m.spec.coordination.limits;
 const previous=(await q`select deadline>now() as active from scotty_mission_runs where plan_id=${m.plan_id} and revision=${revision}`)[0];
 if(previous){if(!previous.active)throw Error('Elapsed-time ceiling reached; create a new reviewed revision');await q`update scotty_project_mission_specs set status='running',updated_at=now() where plan_id=${m.plan_id}`;await q`update scotty_agent_missions set status='running',updated_at=now() where id=${m.plan_id}`;await missionAudit(q,p,'coordination.resume',{planId:id,revision,actor:'owner'});return {id,revision,status:'running'};}
 await q`insert into scotty_mission_runs(plan_id,revision,deadline) values(${m.plan_id},${revision},now()+${limits.maxElapsedMs}*interval '1 millisecond')`;
 for(const s of m.spec.steps)await q`insert into scotty_mission_jobs(plan_id,revision,step_id,agent_id) values(${m.plan_id},${revision},${s.id},${s.agentId})`;
 await q`insert into scotty_agent_missions(id,task,status,agents,dependencies,project_managed) values(${m.plan_id},${m.spec.goal},'running',${q.json([...new Set(m.spec.steps.map((s:any)=>s.agentId))])},${q.json(m.spec.steps)},true) on conflict(id) do update set task=excluded.task,status='running',agents=excluded.agents,dependencies=excluded.dependencies,results='[]',review='[]',updated_at=now()`;
 await q`update scotty_project_mission_specs set status='running',updated_at=now() where plan_id=${m.plan_id}`;
 await missionAudit(q,p,'coordination.start',{planId:id,revision,limits,actor:'owner'});return {id,revision,status:'running'};
});}
export async function claimMissionStep(p:string,id:string,revision:number){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 if(m.status!=='running')return {ok:false,reason:'Mission is '+m.status};const auth=await checkedMission(q,m,revision);
 const run=(await q`select *,deadline>now() as active from scotty_mission_runs where plan_id=${m.plan_id} and revision=${revision}`)[0];
 if(!run?.active)return {ok:false,reason:'Elapsed-time ceiling reached; owner review required'};
 const jobs=await q`select * from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} order by step_id for update`;
 let reason='Waiting for successful prerequisites or owner reconciliation';
 for(const step of m.spec.steps){const job=jobs.find((j:any)=>j.step_id===step.id);
  if(job?.status!=='queued')continue;
  if(job.attempts>=m.spec.coordination.limits.maxAttempts){reason='Attempt ceiling reached';continue;}
  if(!step.dependsOn.every((dep:string)=>jobs.some((j:any)=>j.step_id===dep&&j.status==='draft')))continue;
  const slot=await claimAgentInTransaction(q,step.agentId,p);if(!slot.ok){reason=slot.reason;continue;}
  const token=crypto.randomUUID();await q`update scotty_mission_jobs set status='claimed',attempts=attempts+1,claim_token=${token},slot_id=${slot.slot},lease_until=now()+interval '2 minutes',blocker=null where plan_id=${m.plan_id} and revision=${revision} and step_id=${step.id}`;
  await missionAudit(q,p,'coordination.claim',{planId:id,revision,stepId:step.id,agentId:step.agentId,attempt:job.attempts+1});
  return {ok:true,token,step,context:auth.contexts[step.id],upstream:jobs.filter((j:any)=>step.dependsOn.includes(j.step_id)).map((j:any)=>j.output)};
 }
 return {ok:false,reason};
});}
// Trusted simulation adapter only. No HTTP route accepts claim tokens or agent-supplied outputs.
export async function finishMissionStep(p:string,id:string,revision:number,token:string,outcome:{status:'draft'|'failed'|'unknown';text?:string;unresolved?:string[]}){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 const job=(await q`select *,lease_until>now() as active from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} and claim_token::text=${token} and status='claimed' for update`)[0];if(!job?.active)throw Error('Claim expired, superseded or already completed');
 let held=m.status!=='running';try{await checkedMission(q,m,revision);}catch{held=true;}
 const active=(await q`select deadline>now() as active from scotty_mission_runs where plan_id=${m.plan_id} and revision=${revision}`)[0]?.active;
 if(!active||m.revision!==revision)held=true;
 const status=held?'held':outcome.status;
 const output={stepId:job.step_id,agentId:job.agent_id,revision,text:String(outcome.text||'').slice(0,12000),sourceIds:m.spec.steps.find((s:any)=>s.id===job.step_id)?.sourceIds||[],unresolved:(outcome.unresolved||[]).map(String).slice(0,20),verified:false,status:'draft'};
 await q`update scotty_mission_jobs set status=${status},output=${q.json(output)},claim_token=null,blocker=${held?'Mission paused, cancelled, revised, timed out or access changed':status==='unknown'?'Outcome uncertain; owner reconciliation required':status==='failed'?'Step failed; explicit recovery required':null} where plan_id=${m.plan_id} and revision=${revision} and step_id=${job.step_id}`;
 await q`delete from scotty_agent_slots where id=${job.slot_id}`;
 if(!held&&status==='draft'){
  const drafts=await q`select output from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} and status='draft' order by step_id`;
  const done=drafts.length===m.spec.steps.length;await q`update scotty_agent_missions set results=${q.json(drafts.map((j:any)=>j.output))},status=${done?'needs_review':'running'},updated_at=now() where id=${m.plan_id}`;
  if(done)await q`update scotty_project_mission_specs set status='needs_review',updated_at=now() where plan_id=${m.plan_id}`;
 }
 await missionAudit(q,p,'coordination.finish',{planId:id,revision,stepId:job.step_id,status});return {status};
});}
export async function recoverCoordination(p:string,id:string,revision:number){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 if(!['running','paused','approved'].includes(m.status))throw Error('Mission cannot recover in its current state');await checkedMission(q,m,revision);
 const expired=await q`select * from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} and status='claimed' and lease_until<=now() for update`;
 for(const job of expired){await q`delete from scotty_agent_slots where id=${job.slot_id}`;await q`update scotty_mission_jobs set status='unknown',claim_token=null,blocker='Worker interrupted; owner reconciliation required' where plan_id=${m.plan_id} and revision=${revision} and step_id=${job.step_id}`;}
 await q`update scotty_mission_jobs set status='queued',blocker=null where plan_id=${m.plan_id} and revision=${revision} and status='failed' and attempts<${m.spec.coordination.limits.maxAttempts}`;
 await missionAudit(q,p,'coordination.recover',{planId:id,revision,uncertain:expired.length,actor:'owner'});return {uncertain:expired.length,note:'Completed work retained. Unknown and held outcomes require owner review; they are never retried automatically.'};
});}
export async function coordinationSnapshot(p:string,id:string,revision:number){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 if(m.revision!==revision)throw Error('Stale revision');let blocker=null;try{await checkedMission(q,m,revision);}catch(e){blocker=e instanceof Error?e.message:'Access changed';}
 const jobs=await q`select step_id,agent_id,status,attempts,lease_until,output,blocker from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} order by step_id`;
 const run=(await q`select started_at,deadline,deadline>now() as active from scotty_mission_runs where plan_id=${m.plan_id} and revision=${revision}`)[0]||null;
 return {planId:id,revision,status:m.status,coordination:m.spec.coordination,run,jobs,blocker:blocker||(!run?.active&&run?'Elapsed-time ceiling reached':null),summary:{evidence:jobs.filter((j:any)=>j.status==='draft').map((j:any)=>({stepId:j.step_id,agentId:j.agent_id,sourceIds:j.output.sourceIds,verified:false})),unresolved:jobs.flatMap((j:any)=>[...(j.output?.unresolved||[]),...(j.blocker?[j.step_id+': '+j.blocker]:[])]),ownerReviewRequired:true}};
});}
export async function simulateCoordinationTick(p:string,id:string,revision:number){const claim=await claimMissionStep(p,id,revision);if(!claim.ok)return claim;const output='SIMULATION draft: '+claim.step.deliverable+'\nPrerequisite draft evidence: '+claim.upstream.map((x:any)=>x.stepId).join(', ');const result=await finishMissionStep(p,id,revision,claim.token,{status:'draft',text:output,unresolved:['Simulated output requires owner verification.']});return {ok:true,stepId:claim.step.id,...result,modelCalls:0};}
export async function simulateProjectQueueTick(p:string){await ensureCoordination();const plans=await db()`select plan_id,revision from scotty_project_mission_specs where project_id=${p} and status='running' and spec ? 'coordination' order by (spec->'coordination'->>'priority')::integer desc,created_at,plan_id`;const blocked=[];for(const plan of plans){try{const result=await simulateCoordinationTick(p,plan.plan_id,plan.revision);if(result.ok)return {...result,planId:plan.plan_id};blocked.push({planId:plan.plan_id,reason:result.reason});}catch(e){blocked.push({planId:plan.plan_id,reason:e instanceof Error?e.message:'Blocked'});}}return {ok:false,blocked,reason:'No permitted ready step'};}
