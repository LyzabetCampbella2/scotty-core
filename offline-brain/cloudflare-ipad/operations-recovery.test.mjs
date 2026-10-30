import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {staleMissionReview} from './operations.mjs';
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
 const db={prepare(q){return {bind(...args){return {
  async all(){return {results:sqlite.prepare(q).all(...args)}},
  async run(){return {meta:{changes:sqlite.prepare(q).run(...args).changes}}}
 }}}}};
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
