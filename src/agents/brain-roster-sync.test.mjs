import test from 'node:test';
import assert from 'node:assert/strict';
import {planBrainRoster,syncBrainRoster,fetchBrainCatalog} from './brain-roster-sync.mjs';
const catalog=Array.from({length:185},(_,i)=>({id:'agent-'+i,name:'Name '+i,department:'Department '+(i%25),isChief:i<25,chiefId:i<25?null:'agent-'+(i%25),brain:{agentId:'agent-'+i,version:3}}));
const original=catalog.slice(0,128).map(a=>({...a,state:'working',memoryLinks:4}));
test('adds only missing identities and leaves all originals untouched',()=>{
 const before=JSON.stringify(original);assert.equal(planBrainRoster(original,catalog).length,57);assert.equal(JSON.stringify(original),before);assert.equal(planBrainRoster(catalog,catalog).length,0);
});
test('refuses missing, renamed, reparented or malformed identities',()=>{
 for(const mutation of [a=>a.name='changed',a=>a.chiefId='different',a=>a.department='different',a=>a.id='unknown']){
  const rows=structuredClone(original);mutation(rows[0]);assert.throws(()=>planBrainRoster(rows,catalog));
 }
 assert.throws(()=>planBrainRoster(original,catalog.slice(1)));
 assert.throws(()=>planBrainRoster([],catalog));
});
test('serializes migration in one transaction and inserts only additions',async()=>{
 const writes=[];
 const tx=async(strings,...values)=>{const query=strings.join('?');if(query.startsWith('select'))return original;writes.push({query,values});return [];};tx.json=x=>x;
 const result=await syncBrainRoster({begin:async fn=>fn(tx)},catalog);
 assert.equal(result.added,57);assert.match(writes[0].query,/lock table/);assert.equal(writes.length,58);
 assert.ok(writes.slice(1).every(w=>w.query.startsWith('insert into')));
 assert.equal(result.existingRecordsUpdated,false);
});
test('catalog fetch uses only pinned Worker and server-side credential',async()=>{
 let calls=0;
 const env={SCOTTY_INDEPENDENT_BRAIN_ENABLED:'true',SCOTTY_INDEPENDENT_BRAIN_TOKEN:'synthetic-owner-token',SCOTTY_INDEPENDENT_BRAIN_URL:'https://scotty-independent-ipad-brain-lab.lizzybee246.workers.dev'};
 const fetcher=async(url,options)=>{calls++;assert.equal(options.headers.authorization,'Bearer synthetic-owner-token');assert.equal(options.redirect,'error');return Response.json({agents:catalog});};
 assert.equal((await fetchBrainCatalog(env,fetcher)).length,185);
 await assert.rejects(()=>fetchBrainCatalog({...env,SCOTTY_INDEPENDENT_BRAIN_URL:'https://untrusted.example'},fetcher));assert.equal(calls,1);
});
