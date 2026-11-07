import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {assignCreativeProject} from './creative-project-assignment.mjs';
const schema=fs.readFileSync(new URL('./agent-portfolio-v1.sql',import.meta.url),'utf8');
const now=new Date('2026-11-07T16:00:00Z');
function local(){
 const native=new DatabaseSync(':memory:');native.exec('PRAGMA foreign_keys=ON');native.exec(schema);
 const db={prepare(q){const st=native.prepare(q);return {
  bind(...values){return {first:async()=>st.get(...values)||null,
    all:async()=>({results:st.all(...values)}),
    run:async()=>({meta:{changes:Number(st.run(...values).changes)}})};},
  all:async()=>({results:st.all()})};},
  async batch(steps){native.exec('BEGIN IMMEDIATE');try{
    const out=[];for(const step of steps)out.push(await step.run());
    native.exec('COMMIT');return out;
   }catch(e){native.exec('ROLLBACK');throw e;}}};
 return {native,db,close:()=>native.close()};
}
const input={
 projectId:'golden-hour-creative',agentId:'agent-creative-frame',
 referenceId:'assignment-creative-001',title:'Golden Hour Creative — motion and shot planning',
 classification:'public-or-synthetic',containsPrivateData:false,startMission:false
};
const owner={verifiedByScotty:true,provenance:'scotty-server-side-session',
 role:'owner',ownerId:'owner-demo-0001',allowedProjects:['golden-hour-creative']};
const project={source:'scotty-server-project-store',active:true,
 id:'golden-hour-creative',allowedAgentIds:['agent-creative-frame']};
const grant={source:'scotty-server-assignment-grant',
 approvalKind:'project.assign',ownerReviewConfirmed:true,revoked:false,
 committed:false,ownerId:'owner-demo-0001',agentId:input.agentId,
 projectId:input.projectId,referenceId:input.referenceId,
 scope:'public-or-synthetic',privateDataAllowed:false,
 aiCallsAllowed:false,externalActionsAllowed:false,expiresAt:'2026-11-07T16:30:00Z'};
const args={owner,project,grant,input,now};
test('a separately trusted project grant can record only a public isolated project membership',async()=>{
 const x=local();
 try{
  const result=await assignCreativeProject(x.db,args);
  assert.equal(result.status,'OWNER_REVIEWED_PROJECT_LINK_RECORDED');
  assert.equal(result.missionStarted,false);
  assert.equal(result.aiCalls,0);assert.equal(result.memoryWrites,0);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM agent_project_links').get().n,1);
  assert.equal(x.native.prepare('SELECT source FROM agent_activity').get().source,'owner-assigned');
  const replay=await assignCreativeProject(x.db,args);
  assert.equal(replay.status,'ALREADY_ASSIGNED');
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM agent_activity').get().n,1);
 }finally{x.close();}
});
test('preview approval and client bool cannot assign anyone',async()=>{
 const x=local();
 try{
  for(const changed of [
   {grant:{...grant,approvalKind:'mission.preview'}},
   {owner:{...owner,provenance:'activepieces-json'}},
   {grant:{...grant,revoked:true}},
   {grant:{...grant,aiCallsAllowed:true}},
   {input:{...input,ownerApproved:true,startMission:true}},
   {input:{...input,containsPrivateData:true}},
   {project:{...project,allowedAgentIds:[]}},
   {input:{...input,agentId:'agent-unknown'}}
  ]){
   await assert.rejects(()=>assignCreativeProject(x.db,{...args,...changed}));
  }
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM agent_activity').get().n,0);
 }finally{x.close();}
});
test('changed title with same reference cannot replace a recorded assignment',async()=>{
 const x=local();
 try{
  await assignCreativeProject(x.db,args);
  await assert.rejects(()=>assignCreativeProject(x.db,{
   ...args,input:{...input,title:'Completely changed job'}
  }),/ASSIGNMENT_IDENTITY_CONFLICT/);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM agent_activity').get().n,1);
 }finally{x.close();}
});
