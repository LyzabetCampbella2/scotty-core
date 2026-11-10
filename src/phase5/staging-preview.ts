/** Read-only adapter over existing SCOTTY workspace schema.
 * Requires a DEDICATED staging database URL (no fallback). Does not create schemas.
 */
import postgres from 'postgres';
import type {Phase5PreviewLoader} from './index.ts';
let client:ReturnType<typeof postgres>|undefined;
function db(){
  const url=process.env.SCOTTY_PHASE5_STAGING_DATABASE_URL;
  if(!url)throw new Error('isolated_staging_database_unconfigured');
  if(!client)client=postgres(url,{max:2,connect_timeout:5,idle_timeout:10,ssl:'require',prepare:false});
  return client;
}
export const stagingPreview:Phase5PreviewLoader={
  async portfolio(projectId){
    const q=db();
    const projects=await q`select id,name,goal from scotty_projects where id=${projectId} limit 1`;
    if(!projects.length)throw new Error('scope_not_found');
    const tasks=await q`select id,title,status,assigned_agent_id as "agentId",due_at as "dueAt",updated_at as "updatedAt"
      from scotty_missions where project_id=${projectId} order by updated_at desc limit 250`;
    return {project:projects[0],tasks};
  },
  async biography(projectId,agentId){
    const q=db();
    const agents=await q`select a.id,a.name,a.department,a.specialty from scotty_agents a
      inner join scotty_project_agents pa on pa.agent_id=a.id and pa.project_id=${projectId}
      where a.id=${agentId} limit 1`;
    if(!agents.length)throw new Error('scope_not_found');
    const tasks=await q`select id,title,status,updated_at as "updatedAt" from scotty_missions
      where project_id=${projectId} and assigned_agent_id=${agentId} order by updated_at desc limit 250`;
    return {agent:agents[0],tasks};
  }
};
