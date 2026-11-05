import {buildAgentBio} from './agent-bio.mjs';
// Read current records on every request, including assignments created elsewhere.
export async function agentBio(q:any,id:string,roster:any[]){
 const agent=roster.find(a=>a.id===id);if(!agent)return null;
 const gaps:string[]=[];
 async function rows(table:string){const exists=(await q`select to_regclass(${table}) as name`)[0]?.name;if(!exists){gaps.push(table+' is not available');return [];}const predicates:any={scotty_team_missions:q`(t.plan->'assignments') @> ${JSON.stringify([{agentId:id}])}::jsonb or t.plan->'reviewer'->>'id'=${id}`,scotty_project_mission_specs:q`(t.spec->'steps') @> ${JSON.stringify([{agentId:id}])}::jsonb`,scotty_agent_missions:q`t.agents @> ${JSON.stringify([id])}::jsonb`,scotty_tasks:q`t.assigned_agent_id=${id}`};const result=await q`select to_jsonb(t) as data from ${q(table)} t where ${predicates[table]||q`true`} order by coalesce(to_jsonb(t)->>'updated_at',to_jsonb(t)->>'created_at',to_jsonb(t)->>'id') desc limit 1001`;if(result.length>1000)gaps.push(table+' shows only the most recent 1000 records');return result.slice(0,1000);}
 const [pr,gr,tm,pm,lm,am,steps,tasks]=await Promise.all(['scotty_projects','scotty_collab_grants','scotty_team_missions','scotty_project_mission_specs','scotty_agent_missions','scotty_missions','scotty_mission_steps','scotty_tasks'].map(rows));
 const work:any[]=[];
 for(const {data:m} of tm)work.push({id:'team:'+m.id,title:m.title,kind:'Team mission',status:m.status,projectId:m.project_id,agentIds:[...(m.plan?.assignments||[]).map((a:any)=>a.agentId),m.plan?.reviewer?.id].filter(Boolean),role:m.plan?.reviewer?.id===id?'Reviewer':'Author',updatedAt:m.updated_at});
 for(const {data:m} of pm)work.push({id:'project:'+m.plan_id,title:m.spec?.goal,kind:'Project mission',status:m.status,projectId:m.project_id,agentIds:(m.spec?.steps||[]).map((s:any)=>s.agentId),role:(m.spec?.steps||[]).filter((s:any)=>s.agentId===id).map((s:any)=>s.deliverable).join('; '),updatedAt:m.updated_at});
 for(const {data:m} of lm){if(m.project_managed)continue;work.push({id:'request:'+m.id,title:m.task,kind:'Question / agent request',status:m.status,projectId:null,agentIds:m.agents||[],updatedAt:m.updated_at});}
 for(const {data:m} of am)work.push({id:'autonomy:'+m.id,title:m.title,kind:'Autonomous mission',status:m.status,projectId:m.project_id,agentIds:steps.filter((s:any)=>s.data.mission_id===m.id).flatMap((s:any)=>[s.data.assigned_chief_id,...s.data.assigned_agent_ids||[]]).filter(Boolean),updatedAt:m.updated_at});
 for(const {data:t} of tasks)work.push({id:'task:'+t.id,title:t.title,kind:'Task',status:t.status,projectId:t.project_id,agentIds:[t.assigned_agent_id].filter(Boolean),updatedAt:t.updated_at});
 return buildAgentBio(agent,roster,{projects:pr.map((r:any)=>r.data),grants:gr.map((r:any)=>r.data),work,gaps});
}
