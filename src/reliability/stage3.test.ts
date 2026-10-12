import {test,expect} from 'bun:test';
import {Watchdog} from './watchdog';
import {ReliabilityController,reliability} from './core';
import {SnapshotStore} from './recovery';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('watchdog marks stale operation degraded',()=>{
 const watchdog=new Watchdog();
 const finish=watchdog.begin('slow-voice','voice',100);
 watchdog.inspect(Date.now()+1000);
 expect(reliability.snapshot().services.find(x=>x.service==='voice')?.status).toBe('degraded');
 finish();
});
test('snapshot round-trip validates data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'scotty-test-'));
 try{
  const store=new SnapshotStore<{items:string[]}>(join(dir,'state.json'),(x):x is {items:string[]}=>!!x&&typeof x==='object'&&Array.isArray((x as any).items));
  expect(await store.restore()).toBeNull();
  await store.save({items:['node-1']});
  expect(await store.restore()).toEqual({items:['node-1']});
 }finally{await rm(dir,{recursive:true,force:true});}
});
