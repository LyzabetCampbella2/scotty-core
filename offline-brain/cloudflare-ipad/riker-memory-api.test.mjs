import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rikerRoute,isRikerRoute} from './riker-memory-api.mjs';
const url=new URL('https://example.invalid/api/riker/memory');
const request=new Request(url);
test('RIKER route classification excludes unrelated APIs',()=>{
 assert.equal(isRikerRoute('/api/riker/memory'),true);
 assert.equal(isRikerRoute('/api/riker/memory/review'),true);
 assert.equal(isRikerRoute('/api/ask'),false);
});
test('unauthorized access fails before touching storage',async()=>{
 const response=await rikerRoute(request,{BRAIN_DB:{prepare(){throw Error('DATABASE_ACCESSED')}}},url,false);
 assert.equal(response.status,401);
});
test('unbound isolated storage fails closed',async()=>{
 const response=await rikerRoute(request,{},url,true);
 assert.equal(response.status,503);
});
test('schema not migrated fails closed',async()=>{
 const db={prepare(){throw Error('NOT_MIGRATED')},batch(){}};
 const response=await rikerRoute(request,{BRAIN_DB:db},url,true);
 assert.equal(response.status,503);
});
