/** Database-neutral Phase 5 transaction contract.
 * Implementations MUST provide rollback, row locks, and version compare-and-swap.
 * Caller-provided Context is never proof of identity; verify actor server-side.
 */
import {proposeTask,transition,Denied,type Context,type Task,type TaskEvent,type Action} from './lifecycle.ts';
export interface AssignmentTransaction{
 getTask(projectId:string,taskId:string):Promise<Task|null>;
 insertTask(task:Task):Promise<void>;
 compareAndSwapTask(previous:Task,next:Task):Promise<boolean>;
 appendEvent(event:TaskEvent):Promise<void>;
}
export interface AssignmentStore{transaction<T>(fn:(tx:AssignmentTransaction)=>Promise<T>):Promise<T>}
export async function createProposedTask(store:AssignmentStore,input:{id:string;projectId:string;title:string;chiefId:string},ctx:Context){
 const {task,event}=proposeTask(input,ctx);
 return store.transaction(async tx=>{
  if(await tx.getTask(task.projectId,task.id))throw new Denied('duplicate_task');
  await tx.insertTask(task);await tx.appendEvent(event);return task;
 });
}
export async function changeTask(store:AssignmentStore,taskId:string,action:Action,ctx:Context){
 if(typeof taskId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(taskId))throw new Denied('invalid_task');
 return store.transaction(async tx=>{
  const current=await tx.getTask(ctx.projectId,taskId);
  if(!current)throw new Denied('task_not_found');
  const {task,event}=transition(current,action,ctx);
  if(!await tx.compareAndSwapTask(current,task))throw new Denied('concurrent_update');
  await tx.appendEvent(event);return task;
 });
}
