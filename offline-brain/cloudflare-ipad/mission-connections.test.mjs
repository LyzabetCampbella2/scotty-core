import {INSTALLATION_SCHEMA} from './brain-readiness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {connectedRoster} from './connected-roster.mjs';
import {selectTeam,runTeam} from './team-runtime.mjs';
import {MEMORY_SCHEMA,normalizeNote,memoryStore} from './brain-memory.mjs';
import {MISSION_SCHEMA,missionMemory} from './mission-memory.mjs';
import worker from './worker.mjs';
const roster=connectedRoster();
function database(){const sql=new DatabaseSync(':memory:');sql.exec(MEMORY_SCHEMA+MISSION_SCHEMA+INSTALLATION_SCHEMA);return {sql,prepare:q=>({bind:(...args)=>({run:async()=>({meta:{changes:Number(sql.prepare(q).run(...args).changes)}}),all:async()=>({results:sql.prepare(q).all(...args)})})})};}
const TOKEN='synthetic-test-owner-12345678901234567890123';
const question='frontend engineering budgeting pricing';
const consent={ownerApproved:true,shareWithCloudflare:true,noPrivateDataConfirmed:true};
const req=(path,body)=>new Request('https://test.invalid'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+TOKEN,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
test('selects distinct departments; never exceeds two chiefs and five calls',async()=>{const p=selectTeam(roster,question,2);assert.equal(p.assignments.length,2);assert.equal(new Set(p.assignments.map(a=>a.chiefId)).size,2);let calls=0;const r=await runTeam({roster,question,teamSize:2,approved:true,AI:{run:async()=>({response:'Finding '+ ++calls})}});assert.equal(calls,5);assert.equal(r.results.filter(a=>a.role==='department chief').length,2);assert.equal(r.results.at(-1).name,'SCOTTY');assert.throws(()=>selectTeam(roster,question,3));});
test('raw individual knowledge never enters other specialists/chiefs/SCOTTY prompts',async()=>{const p=selectTeam(roster,question,2),first=p.assignments[0].agentId,calls=[];await runTeam({roster,question,teamSize:2,approved:true,getEvidence:async a=>a.id===first?[{id:'private-note',content:'PRIVATE_AGENT_MARKER'}]:[],AI:{run:async(model,payload)=>{calls.push(payload);return {response:'No private quotations'};}}});assert.ok(calls[0].messages[1].content.includes('PRIVATE_AGENT_MARKER'));assert.ok(calls.slice(1).every(c=>!c.messages[1].content.includes('PRIVATE_AGENT_MARKER')));});
test('writes checkpoints after every finding; storage failure stops further inference',async()=>{let calls=0,checkpoints=0;const r=await runTeam({roster,question,approved:true,onCheckpoint:async()=>{checkpoints++;throw Error('Storage unavailable');},AI:{run:async()=>{calls++;return {response:'Preserved finding'};}}});assert.equal(calls,1);assert.equal(r.status,'incomplete');assert.equal(r.results.length,1);assert.equal(r.error,'CHECKPOINT_UNAVAILABLE');assert.equal(r.checkpointSaved,false);assert.equal(checkpoints,2);});
test('claim/replay/conflict and recent records persist through real SQLite',async()=>{const db=database(),s=missionMemory(db),id='test-mission-00000001';assert.equal((await s.claim(id,question,2)).claimed,true);assert.equal((await s.claim(id,question,2)).claimed,false);await assert.rejects(()=>s.claim(id,'different',2));await s.checkpoint(id,{status:'completed',results:[{text:'saved'}]});const replay=await s.claim(id,question,2);assert.equal(replay.status,'completed');assert.equal(replay.result.results[0].text,'saved');assert.equal((await s.recent()).length,1);db.sql.close();});
test('same API mission ID reuses results without additional AI calls',async()=>{const db=database();let calls=0;const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,AI:{run:async()=>({response:'Saved '+ ++calls})}};const body={question,teamSize:2,missionId:'mission-api-replay-00001',...consent};const a=await worker.fetch(req('/api/team',body),env);assert.equal(a.status,200);assert.equal((await a.json()).missionPersisted,true);const b=await worker.fetch(req('/api/team',body),env);assert.equal(b.status,200);assert.equal((await b.json()).cached,true);assert.equal(calls,5);const recent=await worker.fetch(req('/api/missions'),env);assert.equal((await recent.json()).missions.length,1);db.sql.close();});
test('concurrent duplicate submission is refused while first request runs',async()=>{const db=database();let release;const wait=new Promise(r=>{release=r;});let calls=0;const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,AI:{run:async()=>{calls++;await wait;return {response:'x'};}}};const body={question,teamSize:1,missionId:'mission-concurrent-00001',...consent};const a=worker.fetch(req('/api/team',body),env);for(let i=0;i<12;i++)await Promise.resolve();const b=await worker.fetch(req('/api/team',body),env);assert.equal(b.status,409);release();await a;assert.equal(calls,3);db.sql.close();});
test('missing mission table fails before any model call and missing binding is explicit',async()=>{const db=database();db.sql.exec('DROP TABLE brain_missions');let calls=0;const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,AI:{run:async()=>{calls++;return {response:'x'};}}};assert.equal((await worker.fetch(req('/api/team',{question,...consent}),env)).status,503);assert.equal(calls,0);assert.equal((await worker.fetch(req('/api/missions'),{OWNER_BEARER_TOKEN:TOKEN})).status,503);db.sql.close();});

test('SCOTTY synthesizes only chief reviews with traceable specialist handoffs',async()=>{
 const calls=[];
 const result=await runTeam({roster,question,teamSize:2,approved:true,AI:{run:async(model,payload)=>{calls.push(payload);return {response:'Finding '+calls.length};}}});
 assert.equal(result.status,'completed');
 for(const index of [1,3]){
  const prior=JSON.parse(calls[index].messages[1].content).priorFindings;
  assert.equal(prior.length,1);assert.equal(prior[0].role,'specialist');
  assert.deepEqual(result.results[index].reviewedAgentIds,[result.results[index-1].agentId]);
 }
 const synthesis=JSON.parse(calls[4].messages[1].content).priorFindings;
 assert.deepEqual(synthesis.map(r=>r.role),['department chief','department chief']);
 assert.deepEqual(synthesis.map(r=>r.text),['Finding 2','Finding 4']);
 assert.ok(synthesis.every(r=>r.reviewedAgentIds.length===1));
 assert.equal(JSON.parse(calls[2].messages[1].content).priorFindings.length,0);
 assert.match(calls[4].messages[0].content,/Disagreements/);
});

test('every preserved and expanded brain has skills, a reporting link and review rules',()=>{
 assert.equal(roster.filter(a=>a.isChief).length,25);
 assert.equal(roster.filter(a=>!a.isChief).length,160);
 for(const a of roster){
  assert.equal(a.brain.version,3);assert.ok(a.brain.expertise.skills.length>0);
  assert.equal(a.brain.reporting.reportsTo,a.isChief?'scotty':a.chiefId);
  assert.equal(a.brain.learning.automaticPromotion,false);
  assert.equal(a.brain.learning.generatedFindingsAreFacts,false);
  assert.equal(a.brain.outputSections.length,4);
 }
});

test('all brains require useful deliverables while preserving evidence boundaries',async()=>{
 for(const agent of roster){
  assert.equal(agent.brain.completionPolicy.deliverableFirst,true);
  assert.equal(agent.brain.completionPolicy.inventSources,false);
  assert.equal(agent.brain.completionPolicy.automaticQualityVerification,false);
 }
 const calls=[];
 const result=await runTeam({roster,question:'Plan three backend engineering tests for a fictional task-list app.',approved:true,AI:{run:async(_,payload)=>{calls.push(payload);return {response:'Synthetic test response, not a quality evaluation.'};}}});
 assert.equal(result.verified,false);
 assert.equal(calls.length,3);
 assert.match(JSON.parse(calls[0].messages[1].content).task,/failure, procedure and expected result/);
 assert.match(JSON.parse(calls[1].messages[1].content).task,/complete corrected department answer/);
 assert.match(JSON.parse(calls[2].messages[1].content).task,/Do not claim the task was answered/);
 assert.ok(calls.every(c=>c.max_tokens===480&&c.messages[0].content.includes('Never invent facts')));
});

test('team route refuses inference without dedicated D1 even when AI consent and binding exist',async()=>{
 let calls=0;
 const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',AI:{run:async()=>{calls++;return {response:'Unsafe stateless team run'};}}};
 const res=await worker.fetch(req('/api/team',{question,...consent}),env);
 assert.equal(res.status,503);
 const body=await res.json();
 assert.equal(body.error,'MISSION_STORAGE_NOT_READY');
 assert.equal(calls,0);
});
test('successful D1 readback confirms exact stored answer and completed stage count',async()=>{
 const db=database();let calls=0;
 try{
  const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,AI:{run:async()=>({response:'Synthetic field finding '+ ++calls})}};
  const id='verified-readback-00000001';
  const res=await worker.fetch(req('/api/team',{question,teamSize:1,missionId:id,...consent}),env);
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.missionPersisted,true);
  assert.equal(body.missionReadbackVerified,true);
  const row=db.sql.prepare('SELECT status,result_json FROM brain_missions WHERE id=?').get(id);
  assert.equal(row.status,'completed');
  const saved=JSON.parse(row.result_json);
  assert.equal(saved.answer,body.answer);
  assert.deepEqual(saved.results,body.results);
  assert.equal(calls,3);
 }finally{db.sql.close()}
});
test('missing independent readback cannot masquerade as persisted success',async()=>{
 const fixture=database();let calls=0;
 try{
  const db={prepare:q=>q.startsWith('SELECT id,question,team_size,status,result_json,updated_at FROM brain_missions WHERE id=')
   ?{bind:()=>({all:async()=>({results:[]})})}:fixture.prepare(q)};
  const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,AI:{run:async()=>({response:'Synthetic answer '+ ++calls})}};
  const res=await worker.fetch(req('/api/team',{question,missionId:'unverified-readback-00001',...consent}),env);
  assert.equal(res.status,502);
  const body=await res.json();
  assert.equal(body.status,'completed');
  assert.equal(body.missionPersisted,false);
  assert.equal(body.missionReadbackVerified,false);
  assert.match(body.readbackWarning,/independently verified/);
  assert.equal(calls,3);
 }finally{fixture.sql.close()}
});
test('ambiguous or invalid specialist selection is checkpointed without any AI',async()=>{
 const db=database();let calls=0;
 try{
  const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,AI:{run:async()=>{calls++;return {response:'not expected'};}}};
  const res=await worker.fetch(req('/api/team',{question:'Use specialist Invented Name: Review fictional plan',missionId:'no-team-00000000000001',...consent}),env);
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.status,'needs-clarification');
  assert.equal(body.missionPersisted,true);
  assert.equal(body.results.length,0);
  assert.equal(calls,0);
 }finally{db.sql.close()}
});

test('project-scoped mission IDs never replay cached answers across different sources or projects',async()=>{
 const db=database(),plan=selectTeam(roster,question,1),assignment=plan.assignments[0];
 let calls=0;
 const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,
  AI:{run:async()=>({response:'Safe synthetic project result '+ ++calls})}};
 const context=(projectId,content)=>({
  projectId,approved:true,noPrivateDataConfirmed:true,classification:'public-or-synthetic',
  assignedAgentIds:[assignment.agentId,assignment.chiefId,'scotty'],
  sources:[{id:'sample-doc-1',projectId,title:'Synthetic checklist',content,
   ownerApproved:true,classification:'public-or-synthetic',
   allowedAgentIds:[assignment.agentId,assignment.chiefId,'scotty']}]
 });
 const id='mission-scoped-replay-0001';
 try{
  const initial=context('synthetic-project-1','Private-looking but fully synthetic example alpha');
  const body={question,missionId:id,teamSize:1,...consent,projectContext:initial};
  const first=await worker.fetch(req('/api/team',body),env);
  assert.equal(first.status,200);
  assert.equal((await first.json()).missionReadbackVerified,true);
  assert.equal(calls,3);
  const key=db.sql.prepare('SELECT question FROM brain_missions WHERE id=?').get(id).question;
  assert.ok(key.includes('approved-context-sha256:'));
  assert.ok(!key.includes('synthetic example alpha'));
  const identical=await worker.fetch(req('/api/team',body),env);
  assert.equal(identical.status,200);
  assert.equal((await identical.json()).cached,true);
  assert.equal(calls,3);
  for(const changed of [context('synthetic-project-1','Different synthetic evidence beta'),
                         context('synthetic-project-2','Private-looking but fully synthetic example alpha')]){
   const changedResult=await worker.fetch(req('/api/team',{...body,projectContext:changed}),env);
   assert.equal(changedResult.status,409);
   assert.equal((await changedResult.json()).error,'MISSION_STORAGE_CONFLICT');
   assert.equal(calls,3);
  }
 }finally{db.sql.close();}
});
test('a project source missing approval for chief/SCOTTY is rejected before inference or writes',async()=>{
 const db=database(),assignment=selectTeam(roster,question,1).assignments[0];
 let calls=0;
 const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,
  AI:{run:async()=>{calls++;return {response:'should never run'};}}};
 const projectContext={projectId:'fictional-project-1',approved:true,classification:'public-or-synthetic',
  noPrivateDataConfirmed:true,assignedAgentIds:[assignment.agentId],
  sources:[{id:'dummy-file-1',projectId:'fictional-project-1',title:'Synthetic notes',
   content:'Harmless example',ownerApproved:true,classification:'public-or-synthetic',
   allowedAgentIds:[assignment.agentId]}]};
 try{
  const res=await worker.fetch(req('/api/team',{question,...consent,projectContext}),env);
  assert.equal(res.status,403);
  assert.equal((await res.json()).error,'PROJECT_REVIEW_CHAIN_DENIED');
  assert.equal(calls,0);
  assert.equal(db.sql.prepare('SELECT count(*) AS n FROM brain_missions').get().n,0);
 }finally{db.sql.close();}
});
