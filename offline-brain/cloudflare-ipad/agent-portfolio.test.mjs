import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {connectedRoster} from './connected-roster.mjs';
import {MEMORY_SCHEMA} from './brain-memory.mjs';
import {MISSION_SCHEMA} from './mission-memory.mjs';
import {INSTALLATION_SCHEMA} from './brain-readiness.mjs';
import worker from './worker.mjs';
import {PORTFOLIO_SCHEMA,STARTER_PROJECTS,seedStarterProjects,
 createProject,recordAssignment,agentBio,listProjects,portfolioReadiness} from './agent-portfolio.mjs';

const TOKEN='synthetic-agent-bio-test-token-abcdefghijklmnopqrstuvwxyz';
const roster=connectedRoster();
function database({portfolio=true}={}){
 const sql=new DatabaseSync(':memory:');
 sql.exec(MEMORY_SCHEMA+MISSION_SCHEMA+INSTALLATION_SCHEMA+(portfolio?PORTFOLIO_SCHEMA:''));
 const db={
  prepare(query){return {bind(...args){return {
   async all(){return {results:sql.prepare(query).all(...args)};},
   async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}
  };}};},
  async batch(statements){
   sql.exec('BEGIN');
   try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results;}
   catch(e){sql.exec('ROLLBACK');throw e;}
  }
 };
 return {sql,db};
}
function req(path,data,token=TOKEN){
 return new Request('https://synthetic.invalid'+path,{method:data?'POST':'GET',
 headers:{authorization:'Bearer '+token,...(data?{'content-type':'application/json'}:{})},
 ...(data?{body:JSON.stringify(data)}:{})});
}
const env=db=>({OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'false',BRAIN_DB:db});
const project=(id)=>STARTER_PROJECTS.find(p=>p.id===id);
test('project starters reflect the owner work areas, but are not assignments',async()=>{
 const {sql,db}=database();await seedStarterProjects(db);
 const list=await listProjects(db,roster);
 assert.equal(list.projects.length,5);
 for(const p of list.projects){assert.equal(p.memberCount,0);assert.ok(p.proposedTeam.length>=3);assert.ok(p.proposedTeam.every(x=>x.status==='suggested-not-assigned'));}
 assert.ok(list.projects.some(p=>p.name==='Eirden Atelier'));
 assert.ok(list.projects.some(p=>p.name==='Bloodpool Trilogy'));
 assert.ok(list.projects.some(p=>p.name==='Golden Hour Creative'));
 assert.ok(list.projects.some(p=>p.name==='SCOTTY AIOS'));
 sql.close();
});
test('owner assignment changes ALL assigned agent bios and project directory, not other agents',async()=>{
 const {sql,db}=database();await seedStarterProjects(db);
 const ids=['agent-geordi-01','chief-geordi','agent-zora-01'];
 const input={kind:'project',projectId:'eirden-atelier',agentIds:ids,title:'Review application navigation',referenceId:'synthetic-activity-001',ownerApproved:true,noPrivateDataConfirmed:true};
 const first=await recordAssignment(db,roster,input);
 assert.equal(first.recorded,true);
 assert.equal((await recordAssignment(db,roster,input)).replayed,true);
 for(const id of ids){const a=roster.find(x=>x.id===id);const bio=await agentBio(db,a,roster);
  assert.equal(bio.projects.length,1);assert.equal(bio.projects[0].name,'Eirden Atelier');assert.equal(bio.activity.length,1);
  assert.equal(bio.assignedTeammates.length,2);
  assert.equal(bio.verifiedCollaborators.length,0);
 }
 const outsider=await agentBio(db,roster.find(x=>x.id==='agent-keiko-01'),roster);
 assert.equal(outsider.projects.length,0);assert.equal(outsider.activity.length,0);
 assert.equal((await listProjects(db,roster)).projects.find(x=>x.id==='eirden-atelier').memberCount,3);
 await assert.rejects(()=>recordAssignment(db,roster,{...input,agentIds:['agent-geordi-01']}),/ASSIGNMENT_ID_CONFLICT/);
 sql.close();
});
test('only verified executed mission activity qualifies as worked-with',async()=>{
 const {sql,db}=database();await seedStarterProjects(db);
 const ids=['agent-geordi-01','chief-geordi','scotty'];
 await recordAssignment(db,roster,{kind:'mission',projectId:'scotty-aios',agentIds:ids,title:'Verified synthetic mission',referenceId:'synthetic-mission-001'},{verifiedRun:true});
 const result=await agentBio(db,roster.find(x=>x.id==='agent-geordi-01'),roster);
 assert.deepEqual(result.verifiedCollaborators.map(x=>x.agentId).sort(),['chief-geordi','scotty']);
 await recordAssignment(db,roster,{kind:'mission',projectId:'scotty-aios',agentIds:['agent-geordi-01','agent-zora-01'],title:'Proposed review mission',referenceId:'synthetic-mission-002',ownerApproved:true,noPrivateDataConfirmed:true});
 const again=await agentBio(db,roster.find(x=>x.id==='agent-geordi-01'),roster);
 assert.equal(again.verifiedCollaborators.some(x=>x.agentId==='agent-zora-01'),false);
 sql.close();
});
test('malformed, unapproved and sensitive-looking metadata cannot create assignments',async()=>{
 const {sql,db}=database();await seedStarterProjects(db);
 const base={kind:'question',projectId:'bloodpool-trilogy',agentIds:['agent-zora-01'],title:'Chapter outline',referenceId:'synthetic-question-001',ownerApproved:true,noPrivateDataConfirmed:true};
 for(const bad of [{ownerApproved:false},{noPrivateDataConfirmed:false},{agentIds:['unknown']},{projectId:'wrong-project'},{kind:'other'},{title:'private\nmessage'}]){
  await assert.rejects(()=>recordAssignment(db,roster,{...base,...bad}));
 }
 await assert.rejects(()=>createProject(db,{name:'Invalid',focus:'content',category:'Writing',classification:'public-or-synthetic',ownerApproved:false,noPrivateDataConfirmed:true}));
 const added=await createProject(db,{name:'Public Demo',category:'Writing',focus:'research and editing',classification:'public-or-synthetic',ownerApproved:true,noPrivateDataConfirmed:true});
 assert.ok(added.id.startsWith('project-'));
 sql.close();
});
test('API protects bios and refuses missing migration without affecting core catalog',async()=>{
 const {sql,db}=database({portfolio:false});
 assert.equal((await portfolioReadiness(db)).ready,false);
 const unauth=await worker.fetch(req('/api/agent-bio?agentId=agent-zora-01',undefined,'wrong'),env(db));
 assert.equal(unauth.status,401);
 const unavailable=await worker.fetch(req('/api/agent-bio?agentId=agent-zora-01'),env(db));
 assert.equal(unavailable.status,503);
 const catalog=await worker.fetch(req('/api/catalog'),env(db));assert.equal(catalog.status,200);
 sql.close();
});
test('owner-only portfolio API adds questions and projects and exposes scoped biography',async()=>{
 const {sql,db}=database();await seedStarterProjects(db);
 const response=await worker.fetch(req('/api/agent-assignment',{agentIds:['agent-zora-01'],kind:'question',projectId:'bloodpool-trilogy',title:'Outline review',referenceId:'test-question-20261105',ownerApproved:true,noPrivateDataConfirmed:true}),env(db));
 assert.equal(response.status,200,await response.text());
 const bioResponse=await worker.fetch(req('/api/agent-bio?agentId=agent-zora-01'),env(db));
 assert.equal(bioResponse.status,200);const bio=await bioResponse.json();
 assert.equal(bio.projects[0].name,'Bloodpool Trilogy');
 assert.equal(bio.activity[0].kind,'question');
 assert.equal(bio.suggestedPartners[0].relationship,'suggested-not-observed');
 assert.ok(!JSON.stringify(bio).includes('test password'));
 const other=await worker.fetch(req('/api/agent-bio?agentId=agent-geordi-01'),env(db));
 assert.equal((await other.json()).activity.length,0);
 sql.close();
});
test('successful team missions write verified activity for actual specialist, chief and SCOTTY',async()=>{
 const {sql,db}=database();await seedStarterProjects(db);
 let calls=0;
 const response=await worker.fetch(req('/api/team',{
  question:'frontend engineering testing',teamSize:1,missionId:'synthetic-team-run-20261105',
  ownerApproved:true,shareWithCloudflare:true,noPrivateDataConfirmed:true
 }),{...env(db),AI_ENABLED:'true',AI:{run:async()=>{calls++;return {response:'Synthetic stage '+calls};}}});
 const body=await response.json();
 assert.equal(response.status,200,JSON.stringify(body));
 assert.equal(body.missionPersisted,true);
 assert.equal(body.biographyRecorded,true);
 const specialist=body.results.find(x=>x.role==='specialist');
 const a=roster.find(x=>x.id===specialist.agentId);
 const bio=await agentBio(db,a,roster);
 assert.ok(bio.activity.some(x=>x.kind==='mission'));
 assert.ok(bio.verifiedCollaborators.some(x=>x.agentId===a.chiefId));
 assert.ok(bio.verifiedCollaborators.some(x=>x.agentId==='scotty'));
 assert.equal(calls,3);
 sql.close();
});
