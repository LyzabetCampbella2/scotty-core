import {test,expect} from 'bun:test';
import {runAgentTask} from './agents';
import {actionGate} from './actions';
import {reliability} from './core';
test('agent write task requires approval',async()=>{
 const action={id:'stage4-write',agent:'chief',provider:'mock',operation:'save',risk:'write' as const,payload:null};
 await expect(runAgentTask({action,execute:async()=>42})).rejects.toThrow('approval');
 actionGate.approve({actionId:action.id,approved:true,approvedBy:'owner',expiresAt:Date.now()+30000});
 expect(await runAgentTask({action,execute:async()=>42})).toBe(42);
});
test('emergency stop prevents new agent task',async()=>{
 reliability.emergencyStop();
 try{
  await expect(runAgentTask({action:{id:'stage4-stop',agent:'chief',provider:'mock',operation:'read',risk:'read',payload:null},execute:async()=>true})).rejects.toThrow('Emergency stop');
 }finally{reliability.resume();}
});
