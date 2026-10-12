import { test, expect } from 'bun:test';
import { ReliabilityController, reliability } from './core';
import { ActionGate } from './actions';
import { handleReliability } from './http';
test('service health transitions', () => {
 const r = new ReliabilityController();
 r.report('voice','degraded','timeout');
 expect(r.snapshot().services[0]?.status).toBe('degraded');
 r.report('voice','healthy');
 expect(r.snapshot().services[0]?.status).toBe('healthy');
});
test('write actions require explicit approval', async () => {
 const gate = new ActionGate();
 const action = {id:'test-approval',agent:'test',provider:'mock',operation:'write',risk:'write' as const,payload:null};
 let calls = 0;
 await expect(gate.execute(action,async()=>++calls)).rejects.toThrow();
 gate.approve({actionId:action.id,approved:true,approvedBy:'test',expiresAt:Date.now()+10000});
 expect(await gate.execute(action,async()=>++calls)).toBe(1);
 expect(await gate.execute(action,async()=>++calls)).toBe(1);
 expect(calls).toBe(1);
});
test('emergency stop blocks new gated actions', async () => {
 const gate = new ActionGate();
 reliability.emergencyStop();
 try {
  await expect(gate.execute({id:'stop-test',agent:'test',provider:'mock',operation:'read',risk:'read',payload:null},async()=>true)).rejects.toThrow('Emergency stop');
 } finally { reliability.resume(); }
});
test('control endpoint rejects requests without key', async () => {
 const response = await handleReliability(new Request('http://localhost/api/control/health'),new URL('http://localhost/api/control/health'));
 expect(response.status).toBe(401);
});
