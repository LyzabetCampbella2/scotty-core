/** Staging-only Postgres adapter. NOT wired to any public route.
 * Separate database, verified owner/provider authentication, explicit migration
 * and authorization approval are required before this module may be used.
 */
import type {AssignmentStore,AssignmentTransaction} from './assignment-store.ts';
import {Denied,type Task,type TaskEvent} from './lifecycle.ts';
export function assertStageDatabaseConfig(env:NodeJS.ProcessEnv=process.env):string{
 if(env.SCOTTY_ENV!=='staging'||env.SCOTTY_PHASE5_STAGING_ENABLED!=='true'||
    env.SCOTTY_PHASE5_WRITES_ENABLED!=='true'||env.SCOTTY_PHASE5_EMERGENCY_STOP!=='false')throw new Denied('staging_write_disabled');
 const url=env.SCOTTY_PHASE5_STAGING_DATABASE_URL;
 if(!url||url===env.DATABASE_URL||url===env.SCOTTY_DATABASE_URL||url===env.SCOTTY_WORKSPACE_DATABASE_URL)throw new Denied('database_not_isolated');
 try{const parsed=new URL(url);if(!['postgres:','postgresql:'].includes(parsed.protocol)||!parsed.hostname||!parsed.username||!parsed.pathname||parsed.pathname==='/')throw new Error('invalid_url');}
 catch{throw new Denied('invalid_database_config');}
 return url;
}
export async function createStagingPostgresStore():Promise<AssignmentStore>{
 const url=assertStageDatabaseConfig();
 const postgres=(await import('postgres')).default;
 const sql=postgres(url,{ssl:'require',max:2,connect_timeout:5,idle_timeout:10,prepare:false});
 return {
  async transaction<T>(run:(tx:AssignmentTransaction)=>Promise<T>):Promise<T>{
   assertStageDatabaseConfig();
   return sql.begin(async db=>{
    await db`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`;
    const tx:AssignmentTransaction={
     async getTask(projectId,taskId){
      const rows=await db`select id,project_id as "projectId",title,agent_id as "agentId",chief_id as "chiefId",state,version,approval_ref as "approvalRef" from scotty_p5_tasks where project_id=${projectId} and id=${taskId} for update`;
      return (rows[0] as Task|undefined)??null;
     },
     async insertTask(task){
      await db`insert into scotty_p5_tasks(id,project_id,title,agent_id,chief_id,state,version,approval_ref) values(${task.id},${task.projectId},${task.title},${task.agentId},${task.chiefId},${task.state},${task.version},${task.approvalRef})`;
     },
     async compareAndSwapTask(previous,next){
      const rows=await db`update scotty_p5_tasks set state=${next.state},agent_id=${next.agentId},approval_ref=${next.approvalRef},version=${next.version},updated_at=NOW() where id=${previous.id} and project_id=${previous.projectId} and version=${previous.version} returning id`;
      return rows.length===1;
     },
     async appendEvent(e:TaskEvent){
      await db`insert into scotty_p5_task_events(task_id,project_id,version,event_type,actor_id,actor_role,from_state,to_state,agent_id,approval_ref,occurred_at) values(${e.taskId},${e.projectId},${e.version},${e.event},${e.actorId},${e.actorRole},${e.from},${e.to},${e.agentId},${e.approvalRef},${e.timestamp})`;
     }
    };
    return await run(tx);
   });
  }
 };
}
