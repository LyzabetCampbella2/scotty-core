import {INSTALLATION_SCHEMA} from './brain-readiness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {connectedRoster,legacySourceRoster} from './connected-roster.mjs';
import {runTeam} from './team-runtime.mjs';
import {MEMORY_SCHEMA,normalizeNote,memoryStore} from './brain-memory.mjs';
import {MISSION_SCHEMA} from './mission-memory.mjs';
import {discoverFeed} from './source-discovery.mjs';
import worker from './worker.mjs';
const roster=connectedRoster();
const TOKEN='synthetic-owner-token-123456789012345678901234567890';
function dbAdapter(){const sql=new DatabaseSync(':memory:');sql.exec(MEMORY_SCHEMA+MISSION_SCHEMA+INSTALLATION_SCHEMA);return {sql,prepare:q=>({bind:(...args)=>({run:async()=>({meta:{changes:Number(sql.prepare(q).run(...args).changes)}}),all:async()=>({results:sql.prepare(q).all(...args)})})})};}
const req=(path,data,token=TOKEN)=>new Request('https://test.invalid'+path,{method:data?'POST':'GET',headers:{authorization:'Bearer '+token,...(data?{'content-type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
const consent={ownerApproved:true,shareWithCloudflare:true,noPrivateDataConfirmed:true};
test('runtime preserves all 128 fallback IDs/names/chief links and gives all 185 a brain',()=>{const old=legacySourceRoster();assert.equal(old.length,128);for(const a of old){const b=roster.find(b=>b.id===a.id);assert.equal(b.name,a.name);assert.equal(b.chiefId,a.chiefId);}assert.equal(roster.filter(a=>a.isChief).length,25);assert.equal(roster.filter(a=>!a.isChief).length,160);assert.equal(new Set(roster.map(a=>a.brain.memory.privateNamespace)).size,185);assert.equal(roster.find(a=>a.id==='agent-spock-01').name,"O'Brien");});
test('specialist, its chief and SCOTTY run in order, with no tools or fallback',async()=>{const calls=[];const r=await runTeam({roster,question:'frontend engineering testing',approved:true,AI:{run:async(m,p)=>{calls.push({m,p});return {response:'Reviewed finding '+calls.length};}}});assert.equal(r.status,'completed');assert.equal(calls.length,3);assert.equal(r.results[1].agentId,roster.find(a=>a.id===r.results[0].agentId).chiefId);assert.equal(r.results[2].name,'SCOTTY');assert.ok(calls[1].p.messages[1].content.includes('Reviewed finding 1'));assert.ok(calls.every(c=>c.p.max_tokens===480));});
test('provider failures preserve completed findings and never retry or synthesize fake answer',async()=>{let n=0;const r=await runTeam({roster,question:'frontend engineering',approved:true,AI:{run:async()=>{if(++n===2)throw Error('429');return {response:'First finding'};}}});assert.equal(n,2);assert.equal(r.status,'incomplete');assert.equal(r.results.length,1);assert.equal(r.answer,null);assert.equal(r.retryAttempted,false);});
test('unknown fields and missing approvals do not consume calls',async()=>{let calls=0;const AI={run:async()=>{calls++;return {response:'x'};}};assert.equal((await runTeam({roster,question:'zzzzzz',approved:true,AI})).status,'needs-clarification');await assert.rejects(()=>runTeam({roster,question:'engineering',AI}));assert.equal(calls,0);});
test('real SQLite persistence enforces agent/department/shared isolation and freshness',async()=>{const db=dbAdapter(),store=memoryStore(db),a=roster.find(a=>!a.isChief),b=roster.find(a=>!a.isChief&&a.chiefId!==roster.find(a=>!a.isChief).chiefId);const save=(scope,agentId,title,now)=>store.save(normalizeNote({scope,agentId,title,content:'Reviewed reference',approved:true,validDays:30},roster,now));await save('agent',a.id,'Private A');await save('department',a.chiefId,'Department A');await save('shared',null,'Shared');await save('shared',null,'Expired',new Date('2020-01-01'));assert.deepEqual((await store.read(a)).map(n=>n.title).sort(),['Department A','Private A','Shared']);assert.deepEqual((await store.read(b)).map(n=>n.title),['Shared']);db.sql.close();});
test('memory rejects unapproved notes, invalid audiences and non-HTTPS citations',()=>{const base={scope:'agent',agentId:roster[0].id,title:'t',content:'c',approved:true};assert.throws(()=>normalizeNote({...base,approved:false},roster));assert.throws(()=>normalizeNote({...base,agentId:'missing'},roster));assert.throws(()=>normalizeNote({...base,url:'javascript:alert(1)'},roster));assert.throws(()=>normalizeNote({...base,scope:'department',agentId:roster.find(a=>!a.isChief).id},roster));});
test('source discovery uses an exact allowlisted feed, rejects redirects/oversize, saves nothing',async()=>{const called=[];const f=async(url,opt)=>{called.push({url,opt});return new Response('<rss><channel><item><title>Update</title><link>https://science.nasa.gov/article</link></item></channel></rss>');};const r=await discoverFeed('nasa-science',f);assert.equal(called[0].url,'https://science.nasa.gov/feed/');assert.equal(called[0].opt.redirect,'error');assert.equal(r.items.length,1);assert.equal(r.automaticallySaved,false);assert.equal(r.items[0].verified,false);await assert.rejects(()=>discoverFeed('https://evil.invalid',f));await assert.rejects(()=>discoverFeed('nasa-science',async()=>new Response('x'.repeat(150001))));});
test('all new endpoints require owner auth; AI and memory fail closed without bindings',async()=>{for(const path of ['/api/team','/api/memory','/api/discover'])assert.equal((await worker.fetch(req(path,{question:'engineering'},'bad'),{OWNER_BEARER_TOKEN:TOKEN})).status,401);const off=await worker.fetch(req('/api/team',{question:'engineering',...consent}),{OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'false'});assert.equal(off.status,409);const mem=await worker.fetch(req('/api/memory?agentId=chief-spock'),{OWNER_BEARER_TOKEN:TOKEN});assert.equal(mem.status,503);});
test('worker executes approved team and supports isolated D1 note round-trip',async()=>{const db=dbAdapter();const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,AI:{run:async()=>({response:'Stubbed reviewed answer'})}};let r=await worker.fetch(req('/api/memory',{scope:'agent',agentId:'agent-geordi-01',title:'Backend checklist',content:'Validate request input',approved:true}),env);assert.equal(r.status,200);r=await worker.fetch(req('/api/memory?agentId=agent-geordi-01'),env);assert.equal((await r.json()).notes[0].title,'Backend checklist');r=await worker.fetch(req('/api/team',{question:'backend engineering',...consent}),env);assert.equal(r.status,200);assert.equal((await r.json()).results.length,3);db.sql.close();});
test('iPad controller unlocks, shows brains, runs a team and clears owner session',async()=>{
 const {runInNewContext}=await import('node:vm');const {browserScript}=await import('./browser-script.mjs');
 const els=new Map();const element=id=>{if(!els.has(id))els.set(id,{value:'',checked:false,disabled:false,textContent:'',events:{},addEventListener(n,fn){this.events[n]=fn;},replaceChildren(){},appendChild(){}});return els.get(id);};
 const db=dbAdapter();const env={OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:'true',BRAIN_DB:db,AI:{run:async()=>({response:'Reviewed mock result'})}};
 runInNewContext(browserScript,{document:{getElementById:element,createElement:()=>({appendChild(){}})},Option:function(){},crypto,fetch:async(path,opt)=>worker.fetch(new Request('https://test.invalid'+path,opt),env)});
 element('owner-token').value=TOKEN;await element('connect').events.click();assert.match(element('status').textContent,/25 chiefs/);assert.equal(element('team').disabled,false);assert.equal(element('save-note').disabled,false);
 element('agent').value='scotty';element('agent').events.change();assert.equal(element('ask').disabled,true);element('profile').events.click();assert.match(element('answer').textContent,/overseer/);
 element('agent').value='chief-spock';element('profile').events.click();assert.match(element('answer').textContent,/SPOCK/);
 element('question').value='backend engineering';for(const id of ['approved','share','safe'])element(id).checked=true;await element('team').events.click();assert.match(element('answer').textContent,/Reviewed mock result/);assert.equal(element('approved').checked,false);
 element('disconnect').events.click();assert.equal(element('team').disabled,true);assert.equal(element('agent').disabled,true);
 db.sql.close();
});

test('SCOTTY is a separate overseer profile and publisher manifest describes on-demand discovery',async()=>{
 const env={OWNER_BEARER_TOKEN:TOKEN};const catalog=await (await worker.fetch(req('/api/catalog'),env)).json();
 assert.equal(catalog.agents.length,185);assert.equal(catalog.overseer.brain.role,'overseer');assert.equal(catalog.overseer.brain.memory.departmentNamespace,null);
 const sources=await (await worker.fetch(req('/api/sources'),env)).json();assert.equal(sources.onDemandDiscovery,true);assert.equal(sources.liveRefresh,false);assert.equal(sources.feeds.length,14);
});
test('SCOTTY private notes persist and reach only synthesis; calls use profiles and track supplied references',async()=>{
 const db=dbAdapter(),store=memoryStore(db);const env={OWNER_BEARER_TOKEN:TOKEN,BRAIN_DB:db};
 const response=await worker.fetch(req('/api/memory',{scope:'agent',agentId:'scotty',title:'Owner synthesis preference',content:'SCOTTY_ONLY_MARKER',approved:true}),env);assert.equal(response.status,200);
 const saved=(await response.json()).note;
 const read=await (await worker.fetch(req('/api/memory?agentId=scotty'),env)).json();assert.equal(read.notes[0].id,saved.id);
 const calls=[];const result=await runTeam({roster,question:'backend engineering',approved:true,getEvidence:a=>store.read(a),AI:{run:async(m,p)=>{calls.push(p);return {response:'A finding'};}}});
 assert.equal(result.status,'completed');assert.equal(calls.length,3);
 for(let i=0;i<2;i++){assert.ok(!calls[i].messages[1].content.includes('SCOTTY_ONLY_MARKER'));assert.deepEqual(result.results[i].referenceIds,[]);}
 assert.match(calls[0].messages[0].content,/complete assigned scope/);assert.match(calls[1].messages[0].content,/review evidence and disagreements/);assert.match(calls[2].messages[0].content,/synthesize chief-reviewed findings/);
 assert.match(calls[2].messages[1].content,/SCOTTY_ONLY_MARKER/);assert.deepEqual(result.results[2].referenceIds,[saved.id]);assert.equal(result.results[2].brainRole,'overseer');
 assert.throws(()=>normalizeNote({scope:'department',agentId:'scotty',title:'x',content:'y',approved:true},roster),/CHIEF_REQUIRED/);db.sql.close();
});
