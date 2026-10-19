import {test,expect,mock} from 'bun:test';
import postgres from 'postgres';
if(process.env.SCOTTY_BRAIN_TEST_DB!=='disposable'||!/^postgres(?:ql)?:\/\/[^/]+@(?:127\.0\.0\.1|localhost):5432\/scotty_brain_ci(?:\?|$)/.test(process.env.DATABASE_URL||''))throw Error('Disposable local CI database required');
process.env.SCOTTY_BRAIN_DB_SSL='disable';const sql=postgres(process.env.DATABASE_URL!,{ssl:false});let providerCalls=0;
mock.module('../brain/cloud.ts',()=>({groqThink:async()=>{providerCalls++;throw Error('Provider forbidden in isolation test');},addActivity:async()=>{}}));
mock.module('../memory/knowledge.ts',()=>({knowledgeContext:async()=>{throw Error('Legacy context forbidden in isolation test');},spaceAccess:async()=>false}));
const {handleCloudAgents}=await import('./cloud.ts');const m=await import('./project-missions.ts');const {grant}=await import('./collaboration.ts');
test('legacy run, continuation, recovery and interruption paths cannot bypass project review',async()=>{
 const roster=await sql`select * from scotty_agents order by id`,marker=(await sql`select value from scotty_agent_meta where key='roster_source'`)[0].value;const p='legacy-guard-'+crypto.randomUUID();await sql`insert into scotty_projects(id) values(${p})`;await grant(p,'agent-12');
 const plan=await m.createProjectMission(p,{goal:'Synthetic legacy bypass guard',steps:[{id:'draft',agentId:'agent-12',instruction:'Draft only',deliverable:'Reviewable draft',dependsOn:[],sourceIds:[]}]});const realFetch=globalThis.fetch;let networkCalls=0;
 async function call(path:string,body?:any){const u=new URL('https://scotty.example'+path);return handleCloudAgents(new Request(u,body?{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{}),u);}
 try{await sql`update scotty_agent_meta set value='legacy' where key='roster_source'`;globalThis.fetch=(async()=>{networkCalls++;throw Error('Network forbidden in isolation test');}) as typeof fetch;
  expect((await call('/api/hud/agents/run',{approvedPlanId:plan.id})).status).toBe(409);await m.approveProjectMission(p,plan.id,1);await m.simulateProjectMission(p,plan.id,1);
  expect((await call('/api/hud/agents/missions/'+plan.id,{feedback:'Bypass approval'})).status).toBe(409);
  await sql`update scotty_agent_missions set status='interrupted' where id=${plan.id}`;expect((await call('/api/hud/agents/run',{agents:['agent-12'],task:'Recover',recoverySourceMissionId:plan.id})).status).toBe(409);
  await sql`update scotty_agent_missions set status='running',updated_at=now()-interval '2 hours' where id=${plan.id}`;await call('/api/hud/agents/missions');expect((await sql`select status from scotty_agent_missions where id=${plan.id}`)[0].status).toBe('running');
  expect(providerCalls).toBe(0);expect(networkCalls).toBe(0);expect(await sql`select * from scotty_agents order by id`).toEqual(roster);
 }finally{globalThis.fetch=realFetch;await sql`update scotty_agent_meta set value=${marker} where key='roster_source'`;}
});
