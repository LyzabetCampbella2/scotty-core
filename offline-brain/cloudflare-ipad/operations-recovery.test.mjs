import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {staleMissionReview} from './operations.mjs';
import {missionRecoveryAuditReady,missionRecoveryIncidents} from './mission-recovery-audit.mjs';
import {missionMemory} from './mission-memory.mjs';
import worker from './worker.mjs';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(`CREATE TABLE brain_missions(id TEXT PRIMARY KEY, question TEXT NOT NULL,
  team_size INTEGER NOT NULL,status TEXT NOT NULL,result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`);
 const id='test-running-recovery-00001',updated='2026-10-30T10:00:00.000Z';
 const original={status:'running',results:[{agentId:'test-specialist',role:'specialist',text:'Synthetic draft'}],
  attemptedCalls:1,qualityReview:null};
 sqlite.prepare('INSERT INTO brain_missions VALUES(?,?,?,?,?,?,?)')
  .run(id,'fictional example',1,'running',JSON.stringify(original),updated,updated);
 sqlite.exec(readFileSync(new URL('./mission-recovery-v1.sql',import.meta.url),'utf8'));
 sqlite.exec(`CREATE TABLE brain_notes(id TEXT PRIMARY KEY,agent_id TEXT,scope TEXT,title TEXT,
  content TEXT,url TEXT,reviewed_at TEXT,expires_at TEXT);
  CREATE TABLE brain_installation(id INTEGER PRIMARY KEY,lab_name TEXT,schema_version INTEGER);
  INSERT INTO brain_installation VALUES(1,'scotty-independent-ipad-brain-lab',1);`);

 const db={
  prepare(q){return {bind(...args){return {
   _q:q,_args:args,
   async all(){return {results:sqlite.prepare(q).all(...args)}},
   async run(){return {meta:{changes:sqlite.prepare(q).run(...args).changes}}}
  }}}},
  async batch(statements){
   sqlite.exec('BEGIN IMMEDIATE');
   try{
    const results=statements.map(stmt=>({meta:{changes:sqlite.prepare(stmt._q).run(...stmt._args).changes}}));
    sqlite.exec('COMMIT');
    return results;
   }catch(e){sqlite.exec('ROLLBACK');throw e}
  }
 };
 return {sqlite,db,id,updated,original,close:()=>sqlite.close()};
}
const now=new Date('2026-10-30T10:20:00.000Z');
test('review preview exposes no saved story text, starts no retry and writes nothing',async()=>{
 const f=fixture();
 try{
  const prior=f.sqlite.prepare('SELECT result_json FROM brain_missions').get().result_json;
  const preview=await staleMissionReview(f.db,{stage:'preview',missionId:f.id},now);
  assert.equal(preview.expectedUpdatedAt,f.updated);
  assert.equal(preview.willRunAI,false);
  assert.equal(preview.willDeleteSavedResults,false);
  assert.ok(!JSON.stringify(preview).includes('Synthetic draft'));
  assert.equal(f.sqlite.prepare('SELECT result_json FROM brain_missions').get().result_json,prior);
 }finally{f.close()}
});
test('explicit owner-reviewed recovery preserves all specialist findings with independent readback',async()=>{
 const f=fixture();
 try{
  const r=await staleMissionReview(f.db,{
   stage:'apply',missionId:f.id,expectedUpdatedAt:f.updated,
   ownerApproved:true,reviewAcknowledged:true
  },now);
  assert.equal(r.status,'incomplete');
  assert.equal(r.verified,true);
  assert.equal(r.auditVerified,true);
  assert.equal(typeof r.auditEventId,'string');
  assert.equal(r.preservedStages,1);
  assert.equal(r.retryAttempted,false);
  assert.equal(r.modelCalls,0);
  const saved=f.sqlite.prepare('SELECT status,result_json,updated_at FROM brain_missions').get();
  assert.equal(saved.status,'incomplete');
  assert.equal(saved.updated_at,now.toISOString());
  const body=JSON.parse(saved.result_json);
  assert.deepEqual(body.results,f.original.results);
  assert.equal(body.error,'OWNER_REVIEWED_STALE_MISSION');
  assert.equal(body.retryAttempted,false);
  await assert.rejects(()=>staleMissionReview(f.db,{
   stage:'apply',missionId:f.id,expectedUpdatedAt:f.updated,
   ownerApproved:true,reviewAcknowledged:true
  },now),/MISSION_NOT_STALE_OR_ALREADY_UPDATED/);
 }finally{f.close()}
});
test('missing consent, wrong checkpoint, recent activity and invalid ID cannot alter missions',async()=>{
 const f=fixture();
 try{
  const before=f.sqlite.prepare('SELECT result_json FROM brain_missions').get().result_json;
  for(const input of [
   {stage:'apply',missionId:f.id,expectedUpdatedAt:f.updated,ownerApproved:true},
   {stage:'apply',missionId:f.id,expectedUpdatedAt:f.updated,reviewAcknowledged:true},
   {stage:'apply',missionId:f.id,expectedUpdatedAt:'2026-10-30T09:59:00.000Z',ownerApproved:true,reviewAcknowledged:true},
   {stage:'apply',missionId:'../untrusted',expectedUpdatedAt:f.updated,ownerApproved:true,reviewAcknowledged:true}
  ])await assert.rejects(()=>staleMissionReview(f.db,input,now));
  await assert.rejects(()=>staleMissionReview(f.db,{stage:'preview',missionId:f.id},
   new Date('2026-10-30T10:05:00.000Z')),/NOT_STALE/);
  assert.equal(f.sqlite.prepare('SELECT result_json FROM brain_missions').get().result_json,before);
 }finally{f.close()}
});
test('anonymous remote recovery and unready database are fail-closed without AI calls',async()=>{
 const token='synthetic-owner-secret-12345678901234567890',url='https://worker.invalid/api/mission-recovery';
 const anon=await worker.fetch(new Request(url,{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({stage:'preview',missionId:'test-running-recovery-00001'})}),{OWNER_BEARER_TOKEN:token});
 assert.equal(anon.status,401);
 const denied=await worker.fetch(new Request(url,{method:'POST',headers:{
  authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({stage:'preview',missionId:'test-running-recovery-00001'})}),{OWNER_BEARER_TOKEN:token});
 assert.equal(denied.status,503);
 const d=await denied.json();
 assert.equal(d.error,'MISSION_STORAGE_NOT_READY');
});

test('late AI worker cannot reopen or overwrite an owner-reviewed stale mission',async()=>{
 const f=fixture();
 try{
  await staleMissionReview(f.db,{stage:'apply',missionId:f.id,
   expectedUpdatedAt:f.updated,ownerApproved:true,reviewAcknowledged:true},now);
  await assert.rejects(()=>missionMemory(f.db).checkpoint(f.id,{
   status:'completed',answer:'Delayed synthetic response',results:[{text:'Unsafe delayed completion'}]
  }),/MISSION_CHECKPOINT_CLOSED_OR_MISSING/);
  const row=f.sqlite.prepare('SELECT status,result_json FROM brain_missions WHERE id=?').get(f.id);
  assert.equal(row.status,'incomplete');
  assert.equal(JSON.parse(row.result_json).results[0].text,'Synthetic draft');
  assert.equal(row.result_json.includes('Unsafe delayed completion'),false);
 }finally{f.close()}
});

test('all owner recoveries produce redacted permanent event history without mission text',async()=>{
 const f=fixture();
 try{
  const readiness=await missionRecoveryAuditReady(f.db);
  assert.equal(readiness.ready,true);
  const before=await missionRecoveryIncidents(f.db,{missionId:f.id});
  assert.equal(before.incidents.length,0);
  const saved=await staleMissionReview(f.db,{stage:'apply',missionId:f.id,
   expectedUpdatedAt:f.updated,ownerApproved:true,reviewAcknowledged:true},now);
  const history=await missionRecoveryIncidents(f.db,{missionId:f.id});
  assert.equal(history.incidents.length,1);
  assert.equal(history.incidents[0].eventId,saved.auditEventId);
  assert.equal(history.incidents[0].preservedStageCount,1);
  assert.equal(history.incidents[0].actorType,'authenticated-owner');
  assert.equal(history.containsPrivateOutputs,false);
  assert.equal(history.modelCalls,0);
  assert.ok(!JSON.stringify(history).includes('Synthetic draft'));
  await assert.rejects(()=>missionRecoveryIncidents(f.db,{missionId:'bad/other'}),/INVALID_MISSION_ID/);
 }finally{f.close()}
});
test('missing audit migration and missing transactional batch block recovery without any mission writes',async()=>{
 const f=fixture();
 try{
  f.sqlite.exec('DROP TABLE brain_mission_recovery_audit');
  const x=await missionRecoveryAuditReady(f.db);
  assert.equal(x.ready,false);
  await assert.rejects(()=>staleMissionReview(f.db,{stage:'apply',missionId:f.id,
   expectedUpdatedAt:f.updated,ownerApproved:true,reviewAcknowledged:true},now),/MIGRATION_REQUIRED/);
  assert.equal(f.sqlite.prepare('SELECT status FROM brain_missions').get().status,'running');
  f.sqlite.exec(`CREATE TABLE brain_mission_recovery_audit(
   event_id TEXT PRIMARY KEY,mission_id TEXT NOT NULL,event_type TEXT,
   previous_status TEXT,new_status TEXT,expected_updated_at TEXT,
   completed_at TEXT,preserved_stage_count INTEGER,actor_type TEXT)`);
  const unsafe={prepare:f.db.prepare};
  await assert.rejects(()=>staleMissionReview(unsafe,{stage:'apply',missionId:f.id,
   expectedUpdatedAt:f.updated,ownerApproved:true,reviewAcknowledged:true},now),/ATOMIC_BATCH_UNAVAILABLE/);
  assert.equal(f.sqlite.prepare('SELECT status FROM brain_missions').get().status,'running');
 }finally{f.close()}
});
test('failed audit insert rolls back mission status and retains all checkpoints',async()=>{
 const f=fixture();
 try{
  f.sqlite.exec("CREATE TRIGGER stop_audit BEFORE INSERT ON brain_mission_recovery_audit BEGIN SELECT RAISE(FAIL, 'synthetic audit insert failed'); END;");
  await assert.rejects(()=>staleMissionReview(f.db,{stage:'apply',missionId:f.id,
   expectedUpdatedAt:f.updated,ownerApproved:true,reviewAcknowledged:true},now),/MISSION_RECOVERY_TRANSACTION_FAILED/);
  const saved=f.sqlite.prepare('SELECT status,result_json,updated_at FROM brain_missions').get();
  assert.equal(saved.status,'running');
  assert.equal(saved.updated_at,f.updated);
  assert.equal(saved.result_json,JSON.stringify(f.original));
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS c FROM brain_mission_recovery_audit').get().c,0);
 }finally{f.close()}
});
test('stale checkpoint racing to new timestamp has no recovery audit or status change',async()=>{
 const f=fixture();
 try{
  f.sqlite.prepare('UPDATE brain_missions SET updated_at=? WHERE id=?').run('2026-10-30T10:19:00.000Z',f.id);
  await assert.rejects(()=>staleMissionReview(f.db,{stage:'apply',missionId:f.id,
   expectedUpdatedAt:f.updated,ownerApproved:true,reviewAcknowledged:true},now));
  assert.equal(f.sqlite.prepare('SELECT status FROM brain_missions').get().status,'running');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS c FROM brain_mission_recovery_audit').get().c,0);
 }finally{f.close()}
});

test('authenticated Worker incident history performs redacted readback with no AI inference',async()=>{
 const f=fixture();
 const token='synthetic-owner-recovery-token-123456789012345';
 const base='https://worker.invalid/api';
 const req=(path,body)=>new Request(base+path,{method:body?'POST':'GET',
  headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
 try{
  const env={OWNER_BEARER_TOKEN:token,BRAIN_DB:f.db,AI_ENABLED:'false'};
  const preview=await worker.fetch(req('/mission-recovery',{missionId:f.id,stage:'preview'}),env);
  assert.equal(preview.status,200);
  const pre=await preview.json();
  assert.equal(pre.canApply,true);
  const commit=await worker.fetch(req('/mission-recovery',{
   missionId:f.id,stage:'apply',expectedUpdatedAt:pre.expectedUpdatedAt,
   ownerApproved:true,reviewAcknowledged:true
  }),env);
  assert.equal(commit.status,200);
  const result=await commit.json();
  assert.equal(result.auditVerified,true);
  const history=await worker.fetch(req('/mission-incidents?missionId='+f.id),env);
  assert.equal(history.status,200);
  const payload=await history.json();
  assert.equal(payload.incidents.length,1);
  assert.equal(payload.incidents[0].eventId,result.auditEventId);
  assert.equal(payload.modelCalls,0);
  assert.ok(!JSON.stringify(payload).includes('Synthetic draft'));
  const anonymous=await worker.fetch(new Request(base+'/mission-incidents'),env);
  assert.equal(anonymous.status,401);
  const malformed=await worker.fetch(req('/mission-incidents?missionId=bad/id'),env);
  assert.equal(malformed.status,400);
 }finally{f.close()}
});
