import {ensureProjectMissions,withProjectMission,checkedMission,missionAudit} from './project-missions.ts';
import {missionDb as db} from './mission-records.ts';
import {ensureWorkload,claimAgentInTransaction} from './workload.ts';
import {profileInput,projectAllowed} from './team-model.ts';
import {draftMessages} from './project-draft-model.ts';
let initializing:Promise<void>|undefined;
export async function ensureCoordination(){if(!initializing)initializing=(async()=>{await ensureProjectMissions();await ensureWorkload();
 await db()`create table if not exists scotty_mission_runs(plan_id uuid references scotty_project_mission_specs(plan_id),revision integer not null,started_at timestamptz not null default now(),deadline timestamptz not null,primary key(plan_id,revision))`;
 await db()`create table if not exists scotty_mission_jobs(plan_id uuid,revision integer,step_id text,agent_id text not null,status text not null default 'queued',attempts integer not null default 0,claim_token uuid,slot_id uuid,lease_until timestamptz,source_ids jsonb not null default '[]',output jsonb,blocker text,primary key(plan_id,revision,step_id),foreign key(plan_id,revision) references scotty_mission_runs(plan_id,revision))`;
 await db()`alter table scotty_mission_runs add column if not exists model_calls integer not null default 0`;
 await db()`alter table scotty_mission_runs add column if not exists reserved_output_tokens integer not null default 0`;
 await db()`alter table scotty_mission_jobs add column if not exists execution_mode text not null default 'simulation'`;
 })().catch(e=>{initializing=undefined;throw e});return initializing;}
export async function startCoordination(p:string,id:string,revision:number){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 if(m.status!=='approved'||!m.spec.coordination)throw Error('Approved chief coordination plan required');await checkedMission(q,m,revision);
 const limits=m.spec.coordination.limits;
 const previous=(await q`select deadline>now() as active from scotty_mission_runs where plan_id=${m.plan_id} and revision=${revision}`)[0];
 if(previous){if(!previous.active)throw Error('Elapsed-time ceiling reached; create a new reviewed revision');await q`update scotty_project_mission_specs set status='running',updated_at=now() where plan_id=${m.plan_id}`;await q`update scotty_agent_missions set status='running',updated_at=now() where id=${m.plan_id}`;await missionAudit(q,p,'coordination.resume',{planId:id,revision,actor:'owner'});return {id,revision,status:'running'};}
 await q`insert into scotty_mission_runs(plan_id,revision,deadline) values(${m.plan_id},${revision},now()+${limits.maxElapsedMs}*interval '1 millisecond')`;
 for(const s of m.spec.steps)await q`insert into scotty_mission_jobs(plan_id,revision,step_id,agent_id,source_ids) values(${m.plan_id},${revision},${s.id},${s.agentId},${q.json([...s.sourceIds,...s.evidenceIds||[]])})`;
 await q`insert into scotty_agent_missions(id,task,status,agents,dependencies,project_managed) values(${m.plan_id},${m.spec.goal},'running',${q.json([...new Set(m.spec.steps.map((s:any)=>s.agentId))])},${q.json(m.spec.steps)},true) on conflict(id) do update set task=excluded.task,status='running',agents=excluded.agents,dependencies=excluded.dependencies,results='[]',review='[]',updated_at=now()`;
 await q`update scotty_project_mission_specs set status='running',updated_at=now() where plan_id=${m.plan_id}`;
 await missionAudit(q,p,'coordination.start',{planId:id,revision,limits,actor:'owner'});return {id,revision,status:'running'};
});}
export async function claimMissionStep(p:string,id:string,revision:number,mode:'simulation'|'model'='simulation'){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 if(m.status!=='running')return {ok:false,reason:'Mission is '+m.status};const auth=await checkedMission(q,m,revision);
 const run=(await q`select *,deadline>now() as active from scotty_mission_runs where plan_id=${m.plan_id} and revision=${revision}`)[0];
 if(!run?.active)return {ok:false,reason:'Elapsed-time ceiling reached; owner review required'};
 const jobs=await q`select * from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} order by step_id for update`;
 let reason='Waiting for successful prerequisites or owner reconciliation';
 for(const step of m.spec.steps){const job=jobs.find((j:any)=>j.step_id===step.id);
  if(job?.status!=='queued')continue;
  if(job.attempts>=m.spec.coordination.limits.maxAttempts){reason='Attempt ceiling reached';continue;}
  if(!step.dependsOn.every((dep:string)=>jobs.some((j:any)=>j.step_id===dep&&(j.status==='released'||j.status==='draft'&&!m.spec.steps.find((s:any)=>s.id===dep)?.reviewBeforeNext))))continue;
  const upstream=jobs.filter((j:any)=>step.dependsOn.includes(j.step_id)).map((j:any)=>j.output);
  const agent=(await q`select a.id,a.name,a.department,coalesce(b.specialty,a.department) as specialty,coalesce(b.instructions,'') as instructions from scotty_agents a left join scotty_agent_brains b on b.agent_id=a.id where a.id=${step.agentId}`)[0];
  const limits=m.spec.coordination.limits,claim={step,context:auth.contexts[step.id],upstream,agent,goal:m.spec.goal,limits,deadline:run.deadline};
  if(mode==='model'){
   if(!limits.maxModelCalls||run.model_calls>=limits.maxModelCalls)return {ok:false,reason:'Reviewed model-call ceiling reached'};
   if(JSON.stringify(draftMessages(claim)).length>limits.maxInputChars)return {ok:false,reason:'Selected evidence exceeds the reviewed input ceiling; narrow the assignment'};
  }
  const slot=await claimAgentInTransaction(q,step.agentId,p);if(!slot.ok){reason=slot.reason;continue;}
  if(mode==='model')await q`update scotty_mission_runs set model_calls=model_calls+1,reserved_output_tokens=reserved_output_tokens+${limits.maxOutputTokens} where plan_id=${m.plan_id} and revision=${revision}`;
  const token=crypto.randomUUID();await q`update scotty_mission_jobs set status='claimed',attempts=attempts+1,claim_token=${token},slot_id=${slot.slot},lease_until=now()+interval '2 minutes',execution_mode=${mode},blocker=null where plan_id=${m.plan_id} and revision=${revision} and step_id=${step.id}`;
  await missionAudit(q,p,'coordination.claim',{planId:id,revision,stepId:step.id,agentId:step.agentId,attempt:job.attempts+1});
  return {ok:true,token,...claim};
 }
 return {ok:false,reason};
});}
// Trusted simulation adapter only. No HTTP route accepts claim tokens or agent-supplied outputs.
export async function finishMissionStep(p:string,id:string,revision:number,token:string,outcome:{status:'draft'|'failed'|'unknown';text?:string;unresolved?:string[];findings?:any[];model?:string;comparison?:any}){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 const job=(await q`select *,lease_until>now() as active from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} and claim_token::text=${token} and status='claimed' for update`)[0];if(!job?.active)throw Error('Claim expired, superseded or already completed');
 let held=m.status!=='running';try{await checkedMission(q,m,revision);}catch{held=true;}
 const profile=profileInput((await q`select data from scotty_specialist_profiles where agent_id=${job.agent_id}`)[0]?.data||{});if(profile.paused||!projectAllowed(profile,p))held=true;
 const active=(await q`select deadline>now() as active from scotty_mission_runs where plan_id=${m.plan_id} and revision=${revision}`)[0]?.active;
 if(!active||m.revision!==revision)held=true;
 const status=held?'held':outcome.status;
 const output={stepId:job.step_id,agentId:job.agent_id,revision,text:String(outcome.text||'').slice(0,12000),sourceIds:job.source_ids||[],unresolved:(outcome.unresolved||[]).map(String).slice(0,50),findings:outcome.findings||[],...(outcome.comparison?{comparison:outcome.comparison}:{}),executionMode:job.execution_mode,model:outcome.model||null,verified:false,status:'draft'};
 await q`update scotty_mission_jobs set status=${status},output=${q.json(output)},claim_token=null,blocker=${held?'Mission paused, cancelled, revised, timed out or access changed':status==='unknown'?'Outcome uncertain; owner reconciliation required':status==='failed'?'Step failed; explicit recovery required':null} where plan_id=${m.plan_id} and revision=${revision} and step_id=${job.step_id}`;
 await q`delete from scotty_agent_slots where id=${job.slot_id}`;
 if(!held&&status==='draft'){
  const drafts=await q`select output,status from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} and status in ('draft','released') order by step_id`;
  const review=drafts.length===m.spec.steps.length||m.spec.steps.find((s:any)=>s.id===job.step_id)?.reviewBeforeNext;await q`update scotty_agent_missions set results=${q.json(drafts.map((j:any)=>({...j.output,status:j.status})))},status=${review?'needs_review':'running'},updated_at=now() where id=${m.plan_id}`;
  if(review)await q`update scotty_project_mission_specs set status='needs_review',updated_at=now() where plan_id=${m.plan_id}`;
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
export async function reconcileMissionStep(p:string,id:string,revision:number,stepId:string,decision:'accept_draft'|'abandon',note:string){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 if(m.revision!==revision||!note.trim()||note.length>2000)throw Error('Current revision and owner reconciliation note required');
 const job=(await q`select * from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} and step_id=${stepId} and status in ('unknown','held') for update`)[0];if(!job)throw Error('No uncertain or held step to reconcile');
 if(decision==='accept_draft'){
  if(m.status!=='running'||!job.output?.text)throw Error('Resume the mission and review a retained draft before acceptance');await checkedMission(q,m,revision);
  const active=(await q`select deadline>now() as active from scotty_mission_runs where plan_id=${m.plan_id} and revision=${revision}`)[0]?.active;if(!active)throw Error('Elapsed-time ceiling reached; create a new reviewed revision');
 }
 await q`update scotty_mission_jobs set status=${decision==='accept_draft'?'draft':'abandoned'},blocker=null,claim_token=null where plan_id=${m.plan_id} and revision=${revision} and step_id=${stepId}`;
 await q`delete from scotty_agent_slots where id=${job.slot_id}`;
 const drafts=await q`select output,status from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} and status in ('draft','released') order by step_id`;
 const done=drafts.length===m.spec.steps.length;
 await q`update scotty_agent_missions set results=${q.json(drafts.map((j:any)=>({...j.output,status:j.status})))},status=${done?'needs_review':m.status},updated_at=now() where id=${m.plan_id}`;
 if(done)await q`update scotty_project_mission_specs set status='needs_review',updated_at=now() where plan_id=${m.plan_id}`;
 await missionAudit(q,p,'coordination.reconcile',{planId:id,revision,stepId,decision,note,actor:'owner'});return {stepId,status:decision==='accept_draft'?'draft':'abandoned',ownerReleaseStillRequired:true};
});}
export async function coordinationSnapshot(p:string,id:string,revision:number){await ensureCoordination();return withProjectMission(p,id,async(q,m)=>{
 if(m.revision!==revision)throw Error('Stale revision');let blocker=null;try{await checkedMission(q,m,revision);}catch(e){blocker=e instanceof Error?e.message:'Access changed';}
 const jobs=await q`select step_id,agent_id,status,attempts,lease_until,output,blocker from scotty_mission_jobs where plan_id=${m.plan_id} and revision=${revision} order by step_id`;
 const run=(await q`select started_at,deadline,model_calls,reserved_output_tokens,deadline>now() as active from scotty_mission_runs where plan_id=${m.plan_id} and revision=${revision}`)[0]||null;
 return {planId:id,revision,status:m.status,coordination:m.spec.coordination,run,jobs,blocker:blocker||(!run?.active&&run?'Elapsed-time ceiling reached':null),summary:{evidence:jobs.filter((j:any)=>['draft','released'].includes(j.status)).map((j:any)=>({stepId:j.step_id,agentId:j.agent_id,sourceIds:j.output.sourceIds,verified:false})),unresolved:jobs.flatMap((j:any)=>[...(j.output?.unresolved||[]),...(j.blocker?[j.step_id+': '+j.blocker]:[])]),ownerReviewRequired:true}};
});}
export async function simulateCoordinationTick(p:string,id:string,revision:number){const claim=await claimMissionStep(p,id,revision);if(!claim.ok)return claim;const output='SIMULATION draft: '+claim.step.deliverable+'\nPrerequisite draft evidence: '+claim.upstream.map((x:any)=>x.stepId).join(', ');const result=await finishMissionStep(p,id,revision,claim.token,{status:'draft',text:output,unresolved:['Simulated output requires owner verification.']});return {ok:true,stepId:claim.step.id,...result,modelCalls:0};}
export async function simulateProjectQueueTick(p:string){await ensureCoordination();const plans=await db()`select plan_id,revision from scotty_project_mission_specs where project_id=${p} and status='running' and spec ? 'coordination' order by (spec->'coordination'->>'priority')::integer desc,created_at,plan_id`;const blocked=[];for(const plan of plans){try{const result=await simulateCoordinationTick(p,plan.plan_id,plan.revision);if(result.ok)return {...result,planId:plan.plan_id};blocked.push({planId:plan.plan_id,reason:result.reason});}catch(e){blocked.push({planId:plan.plan_id,reason:e instanceof Error?e.message:'Blocked'});}}return {ok:false,blocked,reason:'No permitted ready step'};}
