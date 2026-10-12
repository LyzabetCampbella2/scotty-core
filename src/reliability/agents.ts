import { reliability } from './core';
import { actionGate, type ProposedAction } from './actions';
import { watchdog } from './watchdog';
import { recordAudit } from './audit';
export interface AgentTask<T> { action: ProposedAction; timeoutMs?: number; execute: (signal:AbortSignal)=>Promise<T> }
export async function runAgentTask<T>(task:AgentTask<T>):Promise<T> {
 reliability.assertRunning();
 const {action}=task;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),task.timeoutMs??30000);
 const finish=watchdog.begin(action.id,'agents',task.timeoutMs??30000);
 try {
  const result=await actionGate.execute(action,async()=>{
   const value=await task.execute(controller.signal);
   if(controller.signal.aborted)throw new Error('Agent task timed out');
   return value;
  });
  await recordAudit({type:'agent-task',service:'agents',actionId:action.id,outcome:'completed'});
  return result;
 }catch(error){
  await recordAudit({type:'agent-task',service:'agents',actionId:action.id,outcome:'failed'}).catch(()=>{});
  throw error;
 }finally{clearTimeout(timeout);finish();}
}
// Providers must honor AbortSignal and implement durable idempotency for side effects.
