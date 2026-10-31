import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {operatingSnapshot} from './operations.mjs';
import worker from './worker.mjs';

test('mission operations aggregate only statuses, detect stale work and leave quota unknown',async()=>{
 const sql=new DatabaseSync(':memory:');
 try{
  sql.exec("CREATE TABLE brain_missions(id TEXT PRIMARY KEY,status TEXT,updated_at TEXT)");
  const insert=sql.prepare('INSERT INTO brain_missions VALUES(?,?,?)');
  insert.run('test-running-0000001','running','2026-10-30T10:00:00Z');
  insert.run('test-finished-00001','completed','2026-10-30T10:14:00Z');
  insert.run('test-stopped-00001','incomplete','2026-10-30T10:12:00Z');
  const db={prepare:q=>({bind:(...args)=>({all:async()=>({results:sql.prepare(q).all(...args)})})})};
  const result=await operatingSnapshot(db,new Date('2026-10-30T10:20:00Z'));
  assert.equal(result.total,3);
  assert.deepEqual(result.counts,{completed:1,incomplete:1,running:1});
  assert.equal(result.staleRunningSample.length,1);
  assert.equal(result.staleRunningTotal,1);
  assert.equal(result.requiresOwnerReview,2);
  assert.equal(result.recoveryPolicy.automaticRetry,false);
  assert.equal(result.recoveryPolicy.compareAndSwap,true);
  assert.equal(result.staleRunningSample[0].missionId,'test-running-0000001');
  assert.equal(result.quota,null);
  assert.equal(result.providerCalls,null);
  assert.equal(result.automaticallyRetry,false);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM brain_missions').get().n,3);
 }finally{sql.close()}
});
test('owner operations endpoint never reports inferred usage or accepts anonymous reads',async()=>{
 const token='synthetic-owner-token-12345678901234567890123456';
 const base='https://worker.invalid/api/operations';
 assert.equal((await worker.fetch(new Request(base),{OWNER_BEARER_TOKEN:token})).status,401);
 const response=await worker.fetch(new Request(base,{headers:{authorization:'Bearer '+token}}),{OWNER_BEARER_TOKEN:token});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.memoryReady,false);
 assert.equal(data.quota,null);
 assert.equal(data.providerCalls,null);
});
