import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {connectedRoster} from './connected-roster.mjs';
import {fieldKnowledge,FIELD_CARDS} from './field-knowledge.mjs';
import {MEMORY_SCHEMA,memoryStore} from './brain-memory.mjs';
import {runTeam} from './team-runtime.mjs';
const roster=connectedRoster(),scotty={id:'scotty',name:'SCOTTY'},all=[...roster,scotty];
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(MEMORY_SCHEMA);
 const insert=sql.prepare('INSERT INTO brain_notes VALUES(?,?,?,?,?,?,?,?)');
 const add=(id,agent,scope,expires='2099-01-01T00:00:00.000Z',reviewed='2020-01-01T00:00:00.000Z')=>insert.run(id,agent,scope,id,'MARKER:'+id,null,reviewed,expires);
 for(const a of all)add('own-'+a.id,a.id,'agent');
 for(const a of roster.filter(a=>a.isChief))add('dept-'+a.id,a.id,'department');
 add('shared','shared','shared');
 add('expired','shared','shared','2020-01-02T00:00:00.000Z');
 add('future','shared','shared','2099-01-02T00:00:00.000Z','2099-01-01T00:00:00.000Z');
 // Invalid shared-owner rows must not be exposed as globally shared.
 add('malformed-shared',roster[0].id,'shared');
 const db={prepare:q=>({bind:(...args)=>({all:async()=>({results:sql.prepare(q).all(...args)}),run:async()=>sql.prepare(q).run(...args)})})};
 return {sql,store:memoryStore(db),add};
}
const expected=a=>['own-'+a.id,...(a.id==='scotty'?[]:['dept-'+(a.chiefId||a.id)]),'shared'];
test('all 185 agents and SCOTTY have substantive field cards, examples and honest provenance',()=>{
 assert.equal(roster.length,185);assert.equal(Object.keys(FIELD_CARDS).length,25);
 for(const a of all){const k=fieldKnowledge(a);assert.equal(k.id,'field-'+a.id);assert.equal(k.externalVerification,false);assert.ok(k.content.length>200);if(a.id!=='scotty'){assert.match(k.content,/Foundation:.*Procedure:.*Synthetic example:/);assert.equal(k.department,a.department);}}
});
test('SQLite scope matrix: 186 readers receive only their own, department and shared notes',async()=>{
 const f=fixture();try{
  for(const a of all){const notes=await f.store.read(a);assert.deepEqual(notes.map(n=>n.id),expected(a),a.id);}
 }finally{f.sql.close();}
});
test('shared-note flooding cannot evict individual or department memory',async()=>{
 const f=fixture();try{
  for(let i=0;i<30;i++)f.add('new-'+i,'shared','shared','2099-01-01T00:00:00.000Z','2021-01-01T00:00:00.000Z');
  const a=roster.find(a=>!a.isChief),notes=await f.store.read(a);
  assert.ok(notes.some(n=>n.id==='own-'+a.id));assert.ok(notes.some(n=>n.id==='dept-'+a.chiefId));assert.equal(notes.filter(n=>n.scope==='shared').length,4);
 }finally{f.sql.close();}
});
test('every specialist workflow injects its field card and the exact allowed scoped notes at all three stages',async()=>{
 const f=fixture();try{
  for(const a of roster.filter(a=>!a.isChief)){
   const chief=roster.find(c=>c.id===a.chiefId),called=[];
   const result=await runTeam({roster:[chief,a],question:a.specialty,approved:true,getEvidence:agent=>f.store.read(agent),AI:{run:async(_,payload)=>{called.push(JSON.parse(payload.messages[1].content));return {response:'Synthetic finding without private note quotations.'};}}});
   assert.equal(result.status,'completed',a.id);assert.equal(called.length,3);
   for(const [i,reader] of [a,chief,scotty].entries()){
    assert.deepEqual(called[i].references.map(r=>r.id),expected(reader),reader.id);
    assert.equal(called[i].fieldKnowledge.id,'field-'+reader.id);
    assert.deepEqual(result.results[i].knowledgeIds,['field-'+reader.id]);
   }
  }
 }finally{f.sql.close();}
});
