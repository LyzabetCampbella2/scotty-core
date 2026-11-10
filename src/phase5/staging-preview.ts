/** Project- and agent-scoped READ ONLY preview, no fallback to production DB. */
import postgres from 'postgres';
import type {Phase5PreviewLoader} from './index.ts';
import {assertPreviewDbConfig} from './preview-config.ts';
let client:ReturnType<typeof postgres>|undefined;
function db(){
 const url=assertPreviewDbConfig();
 if(!client)client=postgres(url,{max:2,connect_timeout:5,idle_timeout:10,ssl:'require',prepare:false});
 return client;
}
export const stagingPreview:Phase5PreviewLoader={
 async portfolio(projectId){
  return db().begin(async tx=>{
   await tx`SET TRANSACTION READ ONLY`;
   const projects=await tx`select id,name,goal from scotty_projects where id=${projectId} limit 1`;
   if(!projects.length)throw Error('scope_not_found');
   const tasks=await tx`select id,title,status,assigned_agent_id as "agentId",due_at as "dueAt",updated_at as "updatedAt" from scotty_missions where project_id=${projectId} order by updated_at desc limit 250`;
   return {project:projects[0],tasks};
  });
 },
 async biography(projectId,agentId){
  return db().begin(async tx=>{
   await tx`SET TRANSACTION READ ONLY`;
   const agents=await tx`select a.id,a.name,a.department,a.specialty from scotty_agents a inner join scotty_project_agents pa on pa.agent_id=a.id and pa.project_id=${projectId} where a.id=${agentId} limit 1`;
   if(!agents.length)throw Error('scope_not_found');
   const tasks=await tx`select id,title,status,updated_at as "updatedAt" from scotty_missions where project_id=${projectId} and assigned_agent_id=${agentId} order by updated_at desc limit 250`;
   return {agent:agents[0],tasks};
  });
 }
};
