import {test,expect} from 'bun:test';
import postgres from 'postgres';
import {agentBio} from './agent-bio.ts';
const enabled=process.env.SCOTTY_BRAIN_TEST_DB==='disposable';
(enabled?test:test.skip)('bio reads new questions, project missions, reviewers and revoked membership directly from PostgreSQL',async()=>{
 const q=postgres(process.env.DATABASE_URL!,{max:1,ssl:false});
 try{
 await q`create temp table scotty_projects(id text,name text)`;
 await q`create temp table scotty_collab_grants(project_id text,agent_id text)`;
 await q`create temp table scotty_team_missions(id text,title text,plan jsonb,status text,project_id text)`;
 await q`create temp table scotty_project_mission_specs(plan_id text,project_id text,spec jsonb,status text)`;
 await q`create temp table scotty_agent_missions(id text,task text,agents jsonb,status text,project_managed boolean)`;
 await q`create temp table scotty_tasks(id text,title text,assigned_agent_id text,project_id text,status text)`;
 await q`create temp table scotty_missions(id text,title text,status text)`;
 await q`create temp table scotty_mission_steps(mission_id text,assigned_chief_id text,assigned_agent_ids jsonb)`;
 await q`insert into scotty_projects values('p','Bloodpool')`;
 await q`insert into scotty_collab_grants values('p','a'),('p','b')`;
 const roster=[{id:'a',name:'A'},{id:'b',name:'B'}];
 expect((await agentBio(q,'a',roster)).projects[0].teammates).toEqual(['b']);
 await q`insert into scotty_team_missions values('t','Review',${q.json({assignments:[{agentId:'b'}],reviewer:{id:'a'}})},'queued','p')`;
 await q`insert into scotty_agent_missions values('r','Question',${q.json(['a'])},'completed',false)`;
 await q`insert into scotty_project_mission_specs values('s','p',${q.json({goal:'Outline',steps:[{agentId:'a',deliverable:'Chapter'}]})},'awaiting_approval')`;
 const bio=await agentBio(q,'a',roster);expect(bio.assignments.length).toBe(3);expect(bio.assignments.find((a:any)=>a.id==='team:t').role).toBe('Reviewer');expect(bio.collaborators[0].name).toBe('B');
 await q`delete from scotty_collab_grants where agent_id='a'`;
 expect((await agentBio(q,'a',roster)).projects[0].reasons).toEqual(['Recorded assignment']);
 expect(await agentBio(q,'unknown',roster)).toBeNull();
 }finally{await q.end();}
});
