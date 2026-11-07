import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {creativeD1Readiness,createCreativeD1Store} from './creative-agent-d1-store.mjs';
import {invokeCreativeAgent} from './creative-agent-engine.mjs';

const sql=fs.readFileSync(new URL('./creative-agent-state-v1.sql',import.meta.url),'utf8');
const now=new Date('2026-11-07T16:00:00.000Z');
const actors=['agent-creative-pulse','agent-creative-frame','agent-creative-iris','chief-lumen'];
function local({migrated=true}={}){
 const native=new DatabaseSync(':memory:');
 native.exec('PRAGMA foreign_keys=ON');
 if(migrated)native.exec(sql);
 const db={
  prepare(query){
   const statement=native.prepare(query);
   return {bind(...params){
     return {
      first:async()=>statement.get(...params)||null,
      all:async()=>({results:statement.all(...params)}),
      run:async()=>({meta:{changes:Number(statement.run(...params).changes)}})
     };
   },all:async()=>({results:statement.all()})};
  },
  async batch(actions){
   native.exec('BEGIN IMMEDIATE');
   try{
    const outcome=[];
    for(const a of actions)outcome.push(await a.run());
    native.exec('COMMIT');return outcome;
   }catch(e){native.exec('ROLLBACK');throw e;}
  }
 };
 return {db,native,store:createCreativeD1Store(db,{clock:()=>now}),close:()=>native.close()};
}
function input(agentId='agent-creative-pulse'){
 const task={
  projectId:'golden-hour-creative',agentId,missionId:'creative-mission-0001',
  revision:'r1',idempotencyKey:'reviewed-'+agentId,
  intentDigest:'a'.repeat(64),description:'Write a safe fictional UGC shoot plan',
  classification:'public-or-synthetic',containsPrivateData:false,requestedExternalAction:false
 };
 const context={source:'scotty-protected-server',now,
  session:{verifiedByScotty:true,provenance:'scotty-server-side-session',
   role:'owner',ownerId:'owner-demo-0001'},
  project:{source:'scotty-server-project-store',active:true,
   id:task.projectId,allowedAgentIds:actors},
  executionGrant:{source:'scotty-server-execution-grant',
   approvalKind:'mission.execute',ownerReviewConfirmed:true,revoked:false,committed:false,
   ownerId:'owner-demo-0001',projectId:task.projectId,missionId:task.missionId,
   revision:task.revision,idempotencyKey:task.idempotencyKey,intentDigest:task.intentDigest,
   approvedAgentIds:[agentId],maxCalls:1,paidProviderAllowed:true,
   externalActionsAllowed:false,memoryWritesAllowed:false,
   expiresAt:'2026-11-07T16:30:00.000Z'}
 };
 return {task,context};
}
function model(){
 const calls=[];
 return {calls,async run(args){
  calls.push(args);
  return {text:'Public fictional creative response for '+args.agentId+' reviewed by its assigned chief.'};
 }};
}
function seedNote(native,{noteId='note-pulse-001',ownerAgentId='agent-creative-pulse',
 scope='agent',allowed=['agent-creative-pulse'],project='golden-hour-creative',
 reviewed=1,reviewState='approved',expires=null}={}){
 native.prepare(
  'INSERT INTO scotty_creative_memory_v1(note_id,project_id,owner_agent_id,department_id,scope,allowed_agent_ids_json,title,content_text,classification,owner_reviewed,review_state,source_ref,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
 ).run(noteId,project,ownerAgentId,'chief-lumen',scope,JSON.stringify(allowed),
  'Public camera requirement','9:16 framing is a requested planning preference.',
  'public-or-synthetic',reviewed,reviewState,'public-reference-001',expires,now.toISOString());
}
test('optional D1 schema readiness is read only, blocked without migration',async()=>{
 const absent=local({migrated:false});
 try{
  const state=await creativeD1Readiness(absent.db);
  assert.equal(state.ready,false);
  assert.equal(state.canExecute,false);
 }finally{absent.close();}
 const present=local();
 try{
  const result=await creativeD1Readiness(present.db);
  assert.equal(result.ready,true);
  assert.equal(result.canExecute,false);
 }finally{present.close();}
});
test('real in-memory SQLite persists an individually reviewed model call and separate audit',async()=>{
 const l=local(),ai=model();
 try{
  const args=input();
  const out=await invokeCreativeAgent({...args,store:l.store,model:ai});
  assert.equal(out.status,'AWAITING_REVIEW');
  assert.equal(out.checkpointVerified,true);
  assert.equal(out.modelCalls,1);
  assert.equal(out.memoryWrites,0);
  const row=l.native.prepare('SELECT status,agent_id,model_calls,review_chief_id FROM scotty_creative_runs_v1').get();
  assert.deepEqual(row,{status:'AWAITING_CHIEF_REVIEW',agent_id:'agent-creative-pulse',
    model_calls:1,review_chief_id:'chief-lumen'});
  assert.equal(l.native.prepare('SELECT COUNT(*) AS n FROM scotty_creative_run_audit_v1').get().n,2);
  const bios=await l.store.biographyActivity({projectId:'golden-hour-creative',agentId:'agent-creative-pulse'});
  assert.equal(bios.length,1);
  assert.equal(bios[0].status,'AWAITING_CHIEF_REVIEW');
  assert.equal(JSON.stringify(bios).includes('Public fictional creative response'),false);
  const replay=await invokeCreativeAgent({...args,store:l.store,model:ai});
  assert.equal(replay.status,'ALREADY_RESERVED_NO_RETRY');
  assert.equal(ai.calls.length,1);
  assert.equal(l.native.prepare('SELECT COUNT(*) AS n FROM scotty_creative_run_audit_v1').get().n,2);
 }finally{l.close();}
});
test('independently scoped agents produce separate durable project histories',async()=>{
 const l=local(),ai=model();
 try{
  for(const agentId of actors)await invokeCreativeAgent({...input(agentId),store:l.store,model:ai});
  assert.equal(ai.calls.length,4);
  assert.equal(l.native.prepare('SELECT COUNT(*) AS n FROM scotty_creative_runs_v1').get().n,4);
  assert.equal(l.native.prepare('SELECT COUNT(*) AS n FROM scotty_creative_run_audit_v1').get().n,8);
  for(const agentId of actors){
   const history=await l.store.biographyActivity({agentId,projectId:'golden-hour-creative'});
   assert.equal(history.length,1);
   assert.equal(history[0].agentId,agentId);
  }
  const empty=await l.store.biographyActivity({agentId:'agent-creative-iris',projectId:'eirden-atelier'});
  assert.equal(empty.length,0);
 }finally{l.close();}
});
test('only owner-reviewed public notes for the exact recipient reach the right agent',async()=>{
 const l=local(),ai=model();
 try{
  seedNote(l.native);
  seedNote(l.native,{noteId:'note-iris-001',ownerAgentId:'agent-creative-iris',allowed:['agent-creative-iris']});
  seedNote(l.native,{noteId:'note-revoked-001',reviewed:1,reviewState:'revoked'});
  seedNote(l.native,{noteId:'note-pending-001',reviewed:0,reviewState:'pending'});
  seedNote(l.native,{noteId:'note-expired-001',expires:'2026-10-01T00:00:00Z'});
  const pulse=await invokeCreativeAgent({...input('agent-creative-pulse'),store:l.store,model:ai});
  assert.deepEqual(pulse.evidenceIds,['note-pulse-001']);
  const iris=await invokeCreativeAgent({...input('agent-creative-iris'),store:l.store,model:ai});
  assert.deepEqual(iris.evidenceIds,['note-iris-001']);
  assert.equal(ai.calls[0].input.evidence.length,1);
  assert.equal(ai.calls[1].input.evidence.length,1);
  assert.notEqual(ai.calls[0].input.evidence[0].id,ai.calls[1].input.evidence[0].id);
 }finally{l.close();}
});
test('duplicate idempotency key used for a different agent or request is rejected',async()=>{
 const l=local();
 try{
  const a=input();
  const first=await l.store.claim({
   projectId:a.task.projectId,agentId:a.task.agentId,missionId:a.task.missionId,
   revision:a.task.revision,intentDigest:a.task.intentDigest,
   idempotencyKey:a.task.idempotencyKey,maxCalls:1
  });
  assert.equal(first.status,'CLAIMED');
  await assert.rejects(()=>l.store.claim({
   projectId:'golden-hour-creative',agentId:'agent-creative-iris',
   missionId:a.task.missionId,revision:a.task.revision,
   idempotencyKey:a.task.idempotencyKey,intentDigest:a.task.intentDigest,maxCalls:1
  }),/CREATIVE_CLAIM_IDEMPOTENCY_CONFLICT/);
  assert.equal(l.native.prepare('SELECT COUNT(*) AS n FROM scotty_creative_runs_v1').get().n,1);
 }finally{l.close();}
});
test('failed provider consumes its claim and stays non-retryable with an audit record',async()=>{
 const l=local();
 try{
  const ai={calls:0,async run(){this.calls++;throw Error('synthetic provider outage')}};
  const args=input('agent-creative-frame');
  await assert.rejects(()=>invokeCreativeAgent({...args,store:l.store,model:ai}),/CREATIVE_MODEL_OR_CHECKPOINT_FAILED/);
  assert.equal(ai.calls,1);
  const row=l.native.prepare('SELECT status FROM scotty_creative_runs_v1').get();
  assert.equal(row.status,'FAILED_NO_RETRY');
  assert.equal(l.native.prepare('SELECT COUNT(*) AS n FROM scotty_creative_run_audit_v1').get().n,2);
  const retry=await invokeCreativeAgent({...args,store:l.store,model:ai});
  assert.equal(retry.modelCalls,0);
  assert.equal(ai.calls,1);
 }finally{l.close();}
});
