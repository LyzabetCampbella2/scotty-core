import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {memoryStore} from './brain-memory.mjs';
import {selectRelevantNotes} from './relevant-recall.mjs';
import {discoverFeed} from './source-discovery.mjs';
import {PUBLIC_FEEDS} from '../update-sources.mjs';

test('query-aware recall retrieves relevant older note beyond the newest four',async()=>{
 const sql=new DatabaseSync(':memory:');
 try{
  sql.exec("CREATE TABLE brain_notes(id TEXT PRIMARY KEY,agent_id TEXT,scope TEXT,title TEXT,content TEXT,url TEXT,reviewed_at TEXT,expires_at TEXT)");
  const put=sql.prepare('INSERT INTO brain_notes VALUES(?,?,?,?,?,?,?,?)');
  put.run('old','agent-one','agent','Architecture fault','Solar panel thermal cycling procedure',null,'2026-01-01T00:00:00Z','2099-01-01T00:00:00Z');
  for(let i=0;i<12;i++)put.run('recent-'+i,'agent-one','agent','Unrelated '+i,'luggage notes',null,'2026-10-'+String(10+i).padStart(2,'0')+'T00:00:00Z','2099-01-01T00:00:00Z');
  put.run('other-agent','agent-two','agent','Thermal cycling', 'other private note',null,'2026-10-29T00:00:00Z','2099-01-01T00:00:00Z');
  put.run('other-chief','chief-two','department','Solar panel','other dept',null,'2026-10-29T00:00:00Z','2099-01-01T00:00:00Z');
  const db={prepare:q=>({bind:(...values)=>({all:async()=>({results:sql.prepare(q).all(...values)}),run:async()=>sql.prepare(q).run(...values)})})};
  const notes=await memoryStore(db).read({id:'agent-one',chiefId:'chief-one'},'Solar panel thermal cycling');
  assert.equal(notes[0].id,'old');
  assert.ok(notes[0].retrievalReason.includes('Matched task terms'));
  assert.ok(!notes.some(n=>n.id==='other-agent'||n.id==='other-chief'));
  assert.ok(notes.length<=12);
 }finally{sql.close();}
});
test('search excludes expired records and preserves latest-first behavior for empty query',()=>{
 const notes=[{id:'old',title:'One',content:'solar',scope:'shared',reviewedAt:'2025-01-01'},{id:'new',title:'Two',content:'air',scope:'shared',reviewedAt:'2026-01-01'},{id:'expired',title:'Solar',content:'solar',scope:'shared',reviewedAt:'2026-09-01',expiresAt:'2026-01-01'}];
 const now=new Date('2026-10-29T00:00:00Z');
 assert.deepEqual(selectRelevantNotes(notes,'',4,now).map(x=>x.id),['new','old']);
 assert.equal(selectRelevantNotes(notes,'solar',4,now)[0].id,'old');
});

test('publisher discovery reports source date and never promotes an unreviewed headline',async()=>{
 const id=PUBLIC_FEEDS[0].id;
 const xml='<rss><channel><item><title>Example finding</title><link>https://example.org/finding</link><pubDate>Wed, 28 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>';
 const result=await discoverFeed(id,async()=>new Response(xml,{status:200}));
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].publishedAt,'2026-10-28T12:00:00.000Z');
 assert.equal(result.items[0].verified,false);
 assert.equal(result.items[0].reviewRequired,true);
 assert.equal(result.automaticallySaved,false);
});

