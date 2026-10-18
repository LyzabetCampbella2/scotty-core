import {test,expect} from 'bun:test';
import postgres from 'postgres';
if(process.env.SCOTTY_BRAIN_TEST_DB!=='disposable'||!/^postgres(?:ql)?:\/\/[^/]+@(?:127\.0\.0\.1|localhost):5432\/scotty_brain_ci(?:\?|$)/.test(process.env.DATABASE_URL||''))throw Error('Disposable local CI database required');
process.env.SCOTTY_BRAIN_DB_SSL='disable';
const sql=postgres(process.env.DATABASE_URL!,{ssl:false});
const {grant,revoke,share,revokeShare}=await import('./collaboration.ts');
const {propose,review}=await import('./postgres-store.ts');
const m=await import('./project-missions.ts');
const before=await sql`select * from scotty_agents order by id`;
if(before.length!==128)throw Error('Run the Part 2 fixture suite first');
const spec=(sources:string[]=[])=>({goal:'Synthetic project draft',steps:[{id:'research',agentId:'agent-12',instruction:'Use only selected project evidence',deliverable:'A reviewed draft',dependsOn:[],sourceIds:sources}]});
async function fixture(){const p='p3-'+crypto.randomUUID();await sql`insert into scotty_projects(id) values(${p})`;for(const id of ['agent-12','agent-13','chief-0'])await grant(p,id);return p;}
async function memory(p:string,scope='project',status='approved',agent='agent-13'){const v=await propose(agent,{text:'Synthetic '+crypto.randomUUID(),source:'CI evidence',scope,projectId:p});if(status==='approved')await review(v.id,'approved','owner');return (await sql`select id from scotty_brain_memories where proposal_id=${v.id}`)[0]?.id||v.id;}
test('project plan adapters reuse existing records and isolate project lookups',async()=>{
 const p=await fixture(),other=await fixture(),plan=await m.createProjectMission(p,spec());
 expect((await sql`select project_managed from scotty_agent_plans where id=${plan.id}`)[0].project_managed).toBe(true);
 await expect(m.projectMissionDetail(other,plan.id)).rejects.toThrow('not found');
 await expect(m.approveProjectMission(other,plan.id,1)).rejects.toThrow('not found');
});
test('chief status and source existence do not grant access',async()=>{
 const p=await fixture(),other=await fixture();const own=await memory(p),privateId=await memory(p,'private'),pending=await memory(p,'project','pending'),wrong=await memory(other);
 for(const source of [own,privateId,pending,wrong])await expect(m.createProjectMission(p,spec([source]))).rejects.toThrow('source');
 const chiefSpec=spec();chiefSpec.steps[0].agentId='chief-1';await expect(m.createProjectMission(p,chiefSpec)).rejects.toThrow('member');
 await share(p,own,'agent-12');expect((await m.createProjectMission(p,spec([own]))).revision).toBe(1);
});
test('only selected authorized memories reach each step context',async()=>{
 const p=await fixture(),selected=await memory(p),unselected=await memory(p);await share(p,selected,'agent-12');await share(p,unselected,'agent-12');
 const plan=await m.createProjectMission(p,spec([selected]));const context=await m.withProjectMission(p,plan.id,(q,row)=>m.missionAuthorization(q,p,row.spec));
 expect(context.contexts.research.map((x:any)=>x.id)).toEqual([selected]);expect(context.contexts.research[0].approvedBy).toBe('owner');expect(context.contexts.research[0].source).toBe('CI evidence');
});
test('concurrent owner approval and simulation each commit once',async()=>{
 const p=await fixture(),plan=await m.createProjectMission(p,spec());
 const approvals=await Promise.allSettled([m.approveProjectMission(p,plan.id,1),m.approveProjectMission(p,plan.id,1)]);expect(approvals.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 const runs=await Promise.allSettled([m.simulateProjectMission(p,plan.id,1),m.simulateProjectMission(p,plan.id,1)]);expect(runs.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 expect((await sql`select count(*)::int n from scotty_collab_audit where action='mission.simulate' and detail->>'planId'=${plan.id}`)[0].n).toBe(1);
});
test('edits invalidate old approval and preserve plan history',async()=>{
 const p=await fixture(),plan=await m.createProjectMission(p,spec());await m.approveProjectMission(p,plan.id,1);await m.controlProjectMission(p,plan.id,1,'pause');
 await m.reviseProjectMission(p,plan.id,1,{...spec(),goal:'Revised scope'});await expect(m.simulateProjectMission(p,plan.id,1)).rejects.toThrow();await expect(m.approveProjectMission(p,plan.id,1)).rejects.toThrow();
 expect((await m.projectMissionDetail(p,plan.id)).history).toHaveLength(2);
});
test('revocation followed by regrant does not resurrect an approved plan',async()=>{
 const p=await fixture(),plan=await m.createProjectMission(p,spec());await m.approveProjectMission(p,plan.id,1);await revoke(p,'agent-12');await grant(p,'agent-12');
 await expect(m.simulateProjectMission(p,plan.id,1)).rejects.toThrow('changed');
});
test('source revocation after drafting holds unreleased outputs',async()=>{
 const p=await fixture(),source=await memory(p);await share(p,source,'agent-12');const plan=await m.createProjectMission(p,spec([source]));await m.approveProjectMission(p,plan.id,1);await m.simulateProjectMission(p,plan.id,1);
 const s=(await sql`select id from scotty_collab_shares where project_id=${p} and memory_id=${source}`)[0];await revokeShare(p,s.id);
 await expect(m.reviewMissionDraft(p,plan.id,1,'research','approved','')).rejects.toThrow('source');
 expect((await m.projectMissionDetail(p,plan.id)).mission.results[0].status).toBe('draft');
});
test('review revisions retain drafts and never promote outputs to memories',async()=>{
 const p=await fixture(),plan=await m.createProjectMission(p,spec());const count=(await sql`select count(*)::int n from scotty_brain_memories`)[0].n;
 await m.approveProjectMission(p,plan.id,1);await m.simulateProjectMission(p,plan.id,1);await m.reviewMissionDraft(p,plan.id,1,'research','revision_requested','Cite evidence');await m.reviseProjectMission(p,plan.id,1,spec());
 const detail=await m.projectMissionDetail(p,plan.id);expect(detail.history[0].results[0].text).toContain('SIMULATION');expect(detail.history[0].reviews[0].note).toBe('Cite evidence');expect((await sql`select count(*)::int n from scotty_brain_memories`)[0].n).toBe(count);
});
test('pause cancel and stale releases cannot dispatch or release',async()=>{
 const p=await fixture(),plan=await m.createProjectMission(p,spec());await m.approveProjectMission(p,plan.id,1);await m.controlProjectMission(p,plan.id,1,'pause');await expect(m.simulateProjectMission(p,plan.id,1)).rejects.toThrow();await m.controlProjectMission(p,plan.id,1,'resume');await m.controlProjectMission(p,plan.id,1,'cancel');await expect(m.simulateProjectMission(p,plan.id,1)).rejects.toThrow();
});
test('audit failure rolls back approval',async()=>{
 const p=await fixture(),plan=await m.createProjectMission(p,spec());await sql`create function ci_fail_mission_audit() returns trigger language plpgsql as $$ begin if new.action='mission.plan.approve' then raise exception 'CI audit failure'; end if; return new; end $$`;await sql`create trigger ci_fail_mission before insert on scotty_collab_audit for each row execute function ci_fail_mission_audit()`;
 try{await expect(m.approveProjectMission(p,plan.id,1)).rejects.toThrow('CI audit failure');expect((await m.projectMissionDetail(p,plan.id)).plan.status).toBe('awaiting_approval');}finally{await sql`drop trigger ci_fail_mission on scotty_collab_audit`;await sql`drop function ci_fail_mission_audit()`;}
});
test('project mission HTTP requires feature gate, owner bridge and same origin',async()=>{
 const {handleRenderAgentBrains}=await import('./render-bridge.ts');const u=new URL('https://scotty.example/api/agent-brains/project-missions/project');process.env.SCOTTY_AGENT_BRAINS_ENABLED='true';delete process.env.SCOTTY_PROJECT_MISSIONS_ENABLED;
 expect((await handleRenderAgentBrains(new Request(u),u,async()=>true))?.status).toBe(503);process.env.SCOTTY_PROJECT_MISSIONS_ENABLED='true';expect((await handleRenderAgentBrains(new Request(u),u,async()=>false))?.status).toBe(401);
 expect((await handleRenderAgentBrains(new Request(u,{method:'POST',body:'{}'}),u,async()=>true))?.status).toBe(403);
 delete process.env.SCOTTY_PROJECT_MISSIONS_ENABLED;delete process.env.SCOTTY_AGENT_BRAINS_ENABLED;
});
test('all roster fields remain identical through project mission workflows',async()=>{expect(await sql`select * from scotty_agents order by id`).toEqual(before);});
