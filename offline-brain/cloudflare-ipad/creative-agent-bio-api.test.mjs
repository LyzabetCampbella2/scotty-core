import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.mjs';
import {handleCreativeBio,isCreativeBioPath} from './creative-agent-bio-api.mjs';
import {pageHtml} from './page.mjs';

const ownerToken='synthetic-owner-token-for-creative-hud-1234567890';
const portfolio=fs.readFileSync(new URL('./agent-portfolio-v1.sql',import.meta.url),'utf8');
const creative=fs.readFileSync(new URL('./creative-agent-state-v1.sql',import.meta.url),'utf8');
function local(){
 const native=new DatabaseSync(':memory:');
 native.exec('PRAGMA foreign_keys=ON');
 native.exec(portfolio);native.exec(creative);
 const db={
  prepare(query){const stmt=native.prepare(query);return {
   bind(...args){return {
    first:async()=>stmt.get(...args)||null,
    all:async()=>({results:stmt.all(...args)}),
    run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})
   };},all:async()=>({results:stmt.all()})};},
  async batch(stmts){native.exec('BEGIN IMMEDIATE');try{
    const out=[];for(const stmt of stmts)out.push(await stmt.run());
    native.exec('COMMIT');return out;
   }catch(e){native.exec('ROLLBACK');throw e;}}
 };
 return {native,db,close:()=>native.close()};
}
const env=db=>({
 OWNER_BEARER_TOKEN:ownerToken,
 BRAIN_DB:db,
 SCOTTY_CREATIVE_BIOS_ENABLED:'true',
 SCOTTY_CREATIVE_PROJECT_ALLOWLIST:'golden-hour-creative'
});
function request(path,token=ownerToken,method='GET'){
 return new Request('https://isolated-scotty.invalid'+path,{
  method,headers:token?{authorization:'Bearer '+token}:{}
 });
}
const bio=(agent='agent-creative-pulse',project='golden-hour-creative')=>
 '/api/creative-agent-bio?agentId='+agent+'&projectId='+project;
test('creative media interactive HUD has all four controls but no tokens or external links',async()=>{
 const html=pageHtml();
 assert.match(html,/creative-media-bios/);
 for(const id of ['chief-lumen','agent-creative-pulse','agent-creative-frame','agent-creative-iris'])
  assert.match(html,new RegExp(id));
 assert.match(html,/creative-bio-view/);
 const root=await worker.fetch(request('/',null));
 assert.equal(root.status,200);
 const ui=await worker.fetch(request('/ui.js',null));
 assert.equal(ui.status,200);
 const source=await ui.text();
 assert.match(source,/creative-bio-view/);
 assert.match(source,/creative-agent-directory/);
 assert.doesNotMatch(source,/synthetic-owner-token-for-creative-hud/);
});
test('read-only owner API always blocks anonymous, bearer-forged and post requests',async()=>{
 const s=local();
 try{
  assert.equal(isCreativeBioPath('/api/creative-agent-bio'),true);
  assert.equal((await worker.fetch(request(bio(),null),env(s.db))).status,401);
  assert.equal((await worker.fetch(request(bio(),'some-other-token-very-long-9999999999'),env(s.db))).status,401);
  assert.equal((await handleCreativeBio(request(bio()),env(s.db))).status,401);
  assert.equal((await worker.fetch(request(bio(),ownerToken,'POST'),env(s.db))).status,405);
  assert.equal((await worker.fetch(request(bio('invalid-agent')),env(s.db))).status,400);
  assert.equal((await worker.fetch(request('/api/creative-agent-directory?foo=true'),env(s.db))).status,400);
 }finally{s.close();}
});
test('disabled module returns static individual bio without inventing project history',async()=>{
 const s=local();
 try{
  const res=await worker.fetch(request(bio('agent-creative-iris')),{...env(s.db),SCOTTY_CREATIVE_BIOS_ENABLED:'false'});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.mode,'PUBLIC_BIO_ONLY');
  assert.equal(data.profile.name,'IRIS');
  assert.equal(data.realProjectMembershipVerified,false);
  assert.deepEqual(data.projectAssignments,[]);
  assert.deepEqual(data.activity,[]);
  assert.equal(data.publishedPosts,0);
  assert.equal(data.modelCalls,0);
  assert.equal(data.memoryWrites,0);
 }finally{s.close();}
});
test('verified project link allows owner to see only its matching activity metadata',async()=>{
 const s=local();
 try{
  const timestamp='2026-11-07T16:00:00.000Z';
  s.native.prepare('INSERT INTO agent_project_links(agent_id,project_id,assigned_at) VALUES(?,?,?)')
   .run('agent-creative-pulse','golden-hour-creative',timestamp);
  s.native.prepare(
   "INSERT INTO scotty_creative_runs_v1 (claim_id,project_id,agent_id,mission_id,revision,idempotency_key,intent_digest,status,result_text,evidence_ids_json,review_chief_id,claimed_at,updated_at,model_calls) VALUES(?,?,?,?,?,?,?,'AWAITING_CHIEF_REVIEW',?,'[]','chief-lumen',?,?,1)"
  ).run('claim-test-0001','golden-hour-creative','agent-creative-pulse','mission-pulse-0001','r1','request-pulse-0001','a'.repeat(64),'Fictional creative result should be hidden from activity summaries',timestamp,timestamp);
  const res=await worker.fetch(request(bio()),env(s.db));
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.mode,'OWNER_SCOPED_CREATIVE_BIO');
  assert.equal(data.realProjectMembershipVerified,true);
  assert.equal(data.projectAssignments.length,1);
  assert.equal(data.activity.length,1);
  assert.equal(data.activity[0].status,'AWAITING_CHIEF_REVIEW');
  assert.equal(JSON.stringify(data).includes('Fictional creative result should be hidden'),false);
  const other=await worker.fetch(request(bio('agent-creative-iris')),env(s.db));
  assert.equal((await other.json()).mode,'NO_VERIFIED_AGENT_PROJECT_MEMBERSHIP');
  const different=await worker.fetch(request(bio('agent-creative-pulse','eirden-atelier')),env(s.db));
  assert.equal(different.status,403);
 }finally{s.close();}
});
test('owner can view all 4 definitions without AI calls even when no migration is applied',async()=>{
 const dir=await worker.fetch(request('/api/creative-agent-directory'),{
  OWNER_BEARER_TOKEN:ownerToken
 });
 assert.equal(dir.status,200);
 const result=await dir.json();
 assert.deepEqual(result.profiles.map(x=>x.name),['LUMEN','PULSE','FRAME','IRIS']);
 assert.ok(result.profiles.every(x=>!x.running&&!x.providerConnected&&x.projects.length===0));
 assert.equal(result.modelCalls,0);
 assert.equal(result.memoryWrites,0);
});
