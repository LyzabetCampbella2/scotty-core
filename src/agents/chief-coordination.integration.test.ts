import {test,expect} from 'bun:test';
import postgres from 'postgres';
if(process.env.SCOTTY_BRAIN_TEST_DB!=='disposable'||!/^postgres(?:ql)?:\/\/[^/]+@(?:127\.0\.0\.1|localhost):5432\/scotty_brain_ci(?:\?|$)/.test(process.env.DATABASE_URL||''))throw Error('Disposable local CI database required');
process.env.SCOTTY_BRAIN_DB_SSL='disable';const sql=postgres(process.env.DATABASE_URL!,{ssl:false});
const m=await import('./project-missions.ts'),c=await import('./chief-coordination.ts');const {grant,revoke}=await import('./collaboration.ts');const {requestHandoff,decideRequest}=await import('./collaboration-requests.ts');const w=await import('./workload.ts');const {collaborationRequestPage,markRequestRead}=await import('./collaboration-pagination.ts');
const roster=await sql`select * from scotty_agents order by id`;const brains=await sql`select * from scotty_agent_brains order by agent_id`;const memories=await sql`select * from scotty_brain_memories order by id`;
async function setup(maxAttempts=1,p?:string,priority=0){p=p||'p4-'+crypto.randomUUID();await sql`insert into scotty_projects(id) values(${p}) on conflict do nothing`;await grant(p,'chief-0');await grant(p,'chief-1');
 const req=await requestHandoff(p,'chief-0','chief-1','Synthetic review handoff','Review internal draft as unverified evidence');await decideRequest(req.id,'approved');
 const spec={goal:'Synthetic chiefs coordination',steps:[{id:'alpha',agentId:'chief-0',instruction:'Draft analysis',deliverable:'Analysis draft',dependsOn:[],sourceIds:[]},{id:'beta',agentId:'chief-1',instruction:'Review evidence and identify disagreements',deliverable:'Chief review draft',dependsOn:['alpha'],sourceIds:[]}],coordination:{leadChiefId:'chief-1',supportingChiefIds:['chief-0'],handoffs:[{fromStep:'alpha',toStep:'beta',requestId:req.id}],priority,limits:{maxAttempts,maxElapsedMs:120000,maxModelCalls:0}}};
 const plan=await m.createProjectMission(p,spec);await m.approveProjectMission(p,plan.id,1);await c.startCoordination(p,plan.id,1);return {p,id:plan.id,spec};
}
test('cross-chief dependencies require the existing project owner handoff approval',async()=>{
 const f=await setup();await m.controlProjectMission(f.p,f.id,1,'pause');const bad=structuredClone(f.spec);bad.coordination.handoffs=[];await expect(m.reviseProjectMission(f.p,f.id,1,bad)).rejects.toThrow('handoff');
 const wrong=structuredClone(f.spec);wrong.coordination.leadChiefId='chief-2';await expect(m.reviseProjectMission(f.p,f.id,1,wrong)).rejects.toThrow();
});
test('two workers claim one prerequisite once and duplicate completion is refused',async()=>{
 const f=await setup();const claims=await Promise.all([c.claimMissionStep(f.p,f.id,1),c.claimMissionStep(f.p,f.id,1)]);const successful=claims.filter(x=>x.ok);expect(successful).toHaveLength(1);const claim=successful[0];await c.finishMissionStep(f.p,f.id,1,claim.token,{status:'draft',text:'First draft'});await expect(c.finishMissionStep(f.p,f.id,1,claim.token,{status:'draft',text:'duplicate'})).rejects.toThrow('Claim');
 const next=await c.claimMissionStep(f.p,f.id,1);expect(next.step.id).toBe('beta');expect(next.upstream[0].text).toBe('First draft');await c.finishMissionStep(f.p,f.id,1,next.token,{status:'draft',text:'Evidence reviewed; uncertainty remains',unresolved:['Missing source']});
 const snapshot=await c.coordinationSnapshot(f.p,f.id,1);expect(snapshot.status).toBe('needs_review');expect(snapshot.summary.unresolved).toContain('Missing source');expect(snapshot.summary.ownerReviewRequired).toBe(true);expect(snapshot.summary.evidence).toHaveLength(2);
});
test('coordination respects existing global workload capacity and specialist pause',async()=>{
 const f=await setup();await w.saveConcurrency(1);const slot=await w.claimAgent('chief-5');try{const blocked=await c.claimMissionStep(f.p,f.id,1);expect(blocked.ok).toBe(false);expect(blocked.reason).toContain('Concurrency');}finally{await w.releaseAgent(slot.slot);await w.saveConcurrency(2);}
 await w.saveSpecialist('chief-0',{paused:true});try{expect((await c.claimMissionStep(f.p,f.id,1)).reason).toContain('paused');}finally{await w.saveSpecialist('chief-0',{});}
});
test('pause holds in-flight output and blocks new dispatch',async()=>{
 const f=await setup(),claim=await c.claimMissionStep(f.p,f.id,1);await m.controlProjectMission(f.p,f.id,1,'pause');expect((await c.claimMissionStep(f.p,f.id,1)).ok).toBe(false);expect((await c.finishMissionStep(f.p,f.id,1,claim.token,{status:'draft',text:'Late draft'})).status).toBe('held');expect((await m.projectMissionDetail(f.p,f.id)).mission.results).toHaveLength(0);
 await m.controlProjectMission(f.p,f.id,1,'resume');await c.startCoordination(f.p,f.id,1);expect((await c.claimMissionStep(f.p,f.id,1)).ok).toBe(false);
});
test('revocation blocks recovery and holds in-flight drafts without granting chiefs a bypass',async()=>{
 const f=await setup(),claim=await c.claimMissionStep(f.p,f.id,1);await revoke(f.p,'chief-1');await expect(c.recoverCoordination(f.p,f.id,1)).rejects.toThrow('member');expect((await c.finishMissionStep(f.p,f.id,1,claim.token,{status:'draft',text:'Unreleased'})).status).toBe('held');await expect(c.claimMissionStep(f.p,f.id,1)).rejects.toThrow();
});
test('recovery retains completed drafts and never retries uncertain interrupted work',async()=>{
 const f=await setup(2);let claim=await c.claimMissionStep(f.p,f.id,1);await c.finishMissionStep(f.p,f.id,1,claim.token,{status:'draft',text:'Keep this completed work'});claim=await c.claimMissionStep(f.p,f.id,1);await sql`update scotty_mission_jobs set lease_until=now()-interval '1 second' where plan_id=${f.id} and step_id='beta'`;await c.recoverCoordination(f.p,f.id,1);
 const snapshot=await c.coordinationSnapshot(f.p,f.id,1);expect(snapshot.jobs.find((j:any)=>j.step_id==='alpha').output.text).toBe('Keep this completed work');expect(snapshot.jobs.find((j:any)=>j.step_id==='beta').status).toBe('unknown');expect((await c.claimMissionStep(f.p,f.id,1)).ok).toBe(false);await expect(c.finishMissionStep(f.p,f.id,1,claim.token,{status:'draft'})).rejects.toThrow();
});
test('attempt and elapsed-time ceilings cannot reset through recovery',async()=>{
 const f=await setup(2);for(let i=0;i<2;i++){const claim=await c.claimMissionStep(f.p,f.id,1);expect(claim.ok).toBe(true);await c.finishMissionStep(f.p,f.id,1,claim.token,{status:'failed'});await c.recoverCoordination(f.p,f.id,1);}expect((await c.claimMissionStep(f.p,f.id,1)).ok).toBe(false);
 const timeout=await setup();await sql`update scotty_mission_runs set deadline=now()-interval '1 second' where plan_id=${timeout.id}`;expect((await c.claimMissionStep(timeout.p,timeout.id,1)).reason).toContain('ceiling');await m.controlProjectMission(timeout.p,timeout.id,1,'pause');await m.controlProjectMission(timeout.p,timeout.id,1,'resume');await expect(c.startCoordination(timeout.p,timeout.id,1)).rejects.toThrow('ceiling');
});
test('project queue honors priority without dispatching another project',async()=>{
 const low=await setup(1,undefined,0),high=await setup(1,low.p,3);const foreign=await setup(1,undefined,3);const tick=await c.simulateProjectQueueTick(low.p);expect(tick.planId).toBe(high.id);expect((await c.coordinationSnapshot(foreign.p,foreign.id,1)).jobs.every((j:any)=>j.status==='queued')).toBe(true);
});
test('owner reconciliation records a held draft without retrying it or releasing it automatically',async()=>{
 const f=await setup(),claim=await c.claimMissionStep(f.p,f.id,1);await m.controlProjectMission(f.p,f.id,1,'pause');await c.finishMissionStep(f.p,f.id,1,claim.token,{status:'draft',text:'Retained analysis'});await m.controlProjectMission(f.p,f.id,1,'resume');await c.startCoordination(f.p,f.id,1);
 await expect(c.reconcileMissionStep(f.p,f.id,1,'alpha','accept_draft','')).rejects.toThrow('note');await c.reconcileMissionStep(f.p,f.id,1,'alpha','accept_draft','Owner checked retained simulated draft');
 const s=await c.coordinationSnapshot(f.p,f.id,1);expect(s.jobs.find((j:any)=>j.step_id==='alpha').attempts).toBe(1);expect((await m.projectMissionDetail(f.p,f.id)).mission.results[0].status).toBe('draft');
 const next=await c.claimMissionStep(f.p,f.id,1);expect(next.step.id).toBe('beta');await c.finishMissionStep(f.p,f.id,1,next.token,{status:'draft',text:'Chief review'});
});
test('inbox keyset pagination reaches every tied-timestamp request beyond 100',async()=>{
 const f=await setup();for(let i=0;i<137;i++)await sql`insert into scotty_collab_requests(id,project_id,source_agent_id,recipient_agent_id,kind,title,summary,created_at) values(${crypto.randomUUID()},${f.p},'chief-0','chief-1','handoff',${'Synthetic '+i},'Synthetic queue test','2026-10-18 00:00:00.123456+00')`;
 const ids:string[]=[];let cursor:string|undefined,pages=0;do{if(++pages>20)throw Error('Queue cursor did not advance');const page=await collaborationRequestPage(f.p,cursor,17);ids.push(...page.requests.map((r:any)=>r.id));cursor=page.nextCursor||undefined;}while(cursor);expect(ids).toHaveLength(137);expect(new Set(ids).size).toBe(137);
 const first=await collaborationRequestPage(f.p,undefined,17);expect(first.unreadCount).toBe(137);await markRequestRead(first.requests[0].id);expect((await collaborationRequestPage(f.p)).unreadCount).toBe(136);await revoke(f.p,'chief-0');expect((await collaborationRequestPage(f.p)).requests[0].blocked_reason).toContain('membership');await expect(collaborationRequestPage(f.p,'invalid')).rejects.toThrow('cursor');
});
test('all roster brain and approved memory records survive bounded coordination unchanged',async()=>{
 expect(await sql`select * from scotty_agents order by id`).toEqual(roster);expect(await sql`select * from scotty_agent_brains order by agent_id`).toEqual(brains);expect(await sql`select * from scotty_brain_memories order by id`).toEqual(memories);
});
