import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import worker from './worker.mjs';
import {handlePhase1Workbench,isPhase1WorkbenchPath} from './phase1-agent-workbench-api.mjs';
import {proposeAgentProfileRevision} from './agent-brain-revisions.mjs';
import {createPhase1ProfileReview,decidePhase1ProfileReview} from './phase1-profile-review-store.mjs';

const token='scotty-test-owner-bearer-token-1234567890';
const ownerId='owner-scotty-0001';
const now=new Date('2026-11-07T18:00:00.000Z');
const schema=fs.readFileSync(new URL('./phase1-profile-review-ledger-v1.sql',import.meta.url),'utf8');
function store(){
 const native=new DatabaseSync(':memory:');
 native.exec('PRAGMA foreign_keys=ON');native.exec(schema);
 const db={
  prepare(query){const stmt=native.prepare(query);return {
   bind(...params){return {
    first:async()=>stmt.get(...params)||null,
    all:async()=>({results:stmt.all(...params)}),
    run:async()=>({meta:{changes:Number(stmt.run(...params).changes)}})
   };},all:async()=>({results:stmt.all()})};},
  async batch(statements){native.exec('BEGIN IMMEDIATE');try{
   const r=[];for(const s of statements)r.push(await s.run());
   native.exec('COMMIT');return r;
  }catch(e){native.exec('ROLLBACK');throw e;}}
 };
 return {db,native,close:()=>native.close()};
}
function env(db,overrides={}){
 return {OWNER_BEARER_TOKEN:token,BRAIN_DB:db,
  SCOTTY_PHASE1_REVIEW_READ_ENABLED:'false',
  SCOTTY_PHASE1_REVIEW_OWNER_ID:ownerId,...overrides};
}
const req=(path,secret=token,method='GET')=>new Request('https://isolated-scotty.invalid'+path,{
 method,headers:secret?{authorization:'Bearer '+secret}:{}
});
const path='/api/phase1/agent-workbench';
async function approved(db){
 const agentId='agent-geordi-02',requestId='phase1-workbench-review-0001';
 const actor={authenticated:true,verifiedByScotty:true,role:'owner',
  provenance:'scotty-server-side-session',
  ownerId,allowedAgentIds:[agentId]};
 const proposal=await proposeAgentProfileRevision({
  agentId,requestId,patch:{voice:'Friendly and meticulous when explaining accessible interface tests.'}
 });
 await createPhase1ProfileReview(db,{
  actor,proposal,expectedHeadVersion:0,
  idempotencyKey:'phase1-workbench-review-key-0001',
  expiresAt:'2026-11-07T19:00:00.000Z',
  classification:'public-or-synthetic',containsPrivateData:false,now
 });
 await decidePhase1ProfileReview(db,{
  actor,requestId,changeDigest:proposal.changeDigest,
  expectedVersion:1,decision:'approved',confirmed:true,now
 });
 return proposal;
}
test('workbench remains owner-authenticated, GET-only, rejects query pollution',async()=>{
 const x=store();
 try{
  assert.equal(isPhase1WorkbenchPath(path),true);
  assert.equal(isPhase1WorkbenchPath('/api/phase1/agent-workbench/other'),false);
  assert.equal((await worker.fetch(req(path,null),env(x.db))).status,401);
  assert.equal((await worker.fetch(req(path,'incorrect-but-long-enough-token-abcdefgh'),env(x.db))).status,401);
  assert.equal((await handlePhase1Workbench(req(path),env(x.db))).status,401);
  assert.equal((await worker.fetch(req(path,token,'POST'),env(x.db))).status,405);
  for(const p of [
   path+'?agentId=',
   path+'?agentId=../private',
   path+'?agentId=chief-riker&agentId=chief-geordi',
   path+'?agentId=chief-riker&scope=private',
   path+'?unknown=chief-riker'
  ])assert.equal((await worker.fetch(req(p),env(x.db))).status,400,p);
  assert.equal((await worker.fetch(req(path+'?agentId=chief-troi'),env(x.db))).status,404);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_reviews_v1').get().n,0);
 }finally{x.close();}
});
test('owner overview lists exactly 185 canonical agents with honest certification and provenance',async()=>{
 const x=store();
 try{
  const res=await worker.fetch(req(path),env(x.db));
  assert.equal(res.status,200);
  assert.equal(res.headers.get('cache-control'),'no-store');
  const data=await res.json();
  assert.equal(data.status,'PHASE1_DEVELOPMENT_REVIEW_WORKBENCH');
  assert.equal(data.count.profiles,185);
  assert.equal(data.count.chiefs,25);
  assert.equal(data.count.specialists,160);
  assert.equal(data.count.sourceBackedChiefProfiles,8);
  assert.equal(data.count.generatedProfilesRequiringOwnerReview,177);
  assert.equal(data.count.evaluationCasesPrepared,555);
  assert.equal(data.count.modelBehaviorCertified,0);
  assert.equal(data.pendingOwnerAcceptance,185);
  assert.equal(data.agents.length,185);
  assert.equal(new Set(data.agents.map(x=>x.id)).size,185);
  assert.equal(data.agents.filter(x=>x.role==='chief').length,25);
  assert.ok(data.agents.every(x=>x.certificationStatus==='NOT_CERTIFIED'));
  assert.equal(data.agents.some(x=>x.id==='chief-troi'),false);
  assert.equal(data.optionalCreativeDepartmentIncluded,false);
  assert.equal(data.canExecute,false);
  assert.equal(data.modelCalls,0);
  assert.equal(data.toolGrants,0);
 }finally{x.close();}
});
test('owner can inspect individual chief brains and all three unexecuted evaluation scenarios',async()=>{
 const x=store();
 try{
  const ids=['chief-riker','chief-geordi','chief-expansion-troi','agent-geordi-02'];
  const detail=[];
  for(const id of ids){
   const r=await worker.fetch(req(path+'?agentId='+id),env(x.db));
   assert.equal(r.status,200);
   const data=await r.json();
   detail.push(data);
   assert.equal(data.agentId,id);
   assert.equal(data.status,'DEVELOPMENT_BRAIN_PREVIEW');
   assert.equal(data.evaluation.cases.length,3);
   assert.deepEqual(data.evaluation.cases.map(x=>x.type),['COMMON','SPECIALTY','ADVERSARIAL']);
   assert.equal(data.evaluation.modelResultsRecorded,0);
   assert.ok(data.evaluation.cases.every(c=>!c.graded&&!c.executedByThisEndpoint));
   assert.ok(data.method.length>=4);
   assert.ok(data.completionStandards.length>=3);
   assert.ok(data.limitations.length>=5);
   assert.ok(data.suggestedTools.every(t=>t.granted===false));
   assert.equal(data.ownerCompiledAcceptance,false);
   assert.equal(data.activeProfileRevision,null);
   assert.equal(data.privateMemoryExposed,false);
   assert.equal(data.canCertify,false);
   assert.equal(data.canExecute,false);
   assert.equal(data.modelCalls,0);
   assert.equal(data.toolGrants,0);
   assert.equal(data.reviewHistory.state,'REVIEW_LEDGER_NOT_CONNECTED');
   assert.deepEqual(data.reviewHistory.entries,[]);
  }
  assert.equal(new Set(detail.slice(0,3).map(d=>d.reasoningInstructions)).size,3);
  assert.equal(detail[2].reportsTo,'scotty');
  assert.equal(detail[3].reportsTo,'chief-geordi');
 }finally{x.close();}
});
test('approved review metadata is read only for configured owner and never exposes proposed voice text',async()=>{
 const x=store();
 try{
  const proposal=await approved(x.db);
  const e=env(x.db,{SCOTTY_PHASE1_REVIEW_READ_ENABLED:'true'});
  const res=await worker.fetch(req(path+'?agentId=agent-geordi-02'),e);
  assert.equal(res.status,200);
  const d=await res.json();
  assert.equal(d.reviewHistory.connected,true);
  assert.equal(d.reviewHistory.state,'REVIEW_METADATA_ONLY');
  assert.equal(d.reviewHistory.entries.length,1);
  assert.equal(d.reviewHistory.entries[0].status,'approved');
  assert.equal(d.reviewHistory.entries[0].currentlyReviewedDraft,true);
  assert.equal(d.reviewHistory.currentReviewId,proposal.requestId);
  assert.equal(d.ownerCompiledAcceptance,false);
  assert.equal(d.reviewStatus,'NOT_CERTIFIED');
  assert.equal(d.evaluation.certificationStatus,'NOT_EVALUATED');
  assert.equal(d.canExecute,false);
  assert.equal(JSON.stringify(d).includes(proposal.patch.voice),false);
  const unrelated=await worker.fetch(req(path+'?agentId=chief-riker'),e);
  assert.deepEqual((await unrelated.json()).reviewHistory.entries,[]);
  const otherOwner=await worker.fetch(req(path+'?agentId=agent-geordi-02'),
    env(x.db,{SCOTTY_PHASE1_REVIEW_READ_ENABLED:'true',
     SCOTTY_PHASE1_REVIEW_OWNER_ID:'other-owner-0001'}));
  const other=await otherOwner.json();
  assert.deepEqual(other.reviewHistory.entries,[]);
  assert.equal(other.reviewHistory.currentReviewId,null);
  assert.equal(other.reviewHistory.headVersion,null);
  assert.equal(JSON.stringify(other).includes(proposal.requestId),false);
 }finally{x.close();}
});
test('without D1 or owner configuration no review history is invented',async()=>{
 const x=store();
 try{
  const missing=await worker.fetch(req(path+'?agentId=agent-geordi-02'),
   env(null,{SCOTTY_PHASE1_REVIEW_READ_ENABLED:'true'}));
  assert.equal(missing.status,200);
  const d=await missing.json();
  assert.equal(d.reviewHistory.connected,false);
  assert.equal(d.reviewHistory.state,'ISOLATED_D1_CONNECTION_REQUIRED');
  const noOwner=await worker.fetch(req(path+'?agentId=agent-geordi-02'),
   env(x.db,{SCOTTY_PHASE1_REVIEW_READ_ENABLED:'true',
    SCOTTY_PHASE1_REVIEW_OWNER_ID:''}));
  assert.equal((await noOwner.json()).reviewHistory.state,'OWNER_ID_NOT_CONFIGURED');
 }finally{x.close();}
});
test('HUD includes searchable Phase 1 workbench and delivered script is syntactically valid and read-only',async()=>{
 const html=await worker.fetch(req('/',null));
 assert.equal(html.status,200);
 const body=await html.text();
 for(const id of ['phase1-workbench','phase1-load-roster','phase1-agent-selector',
  'phase1-inspect','phase1-overview','phase1-inspection']){
  assert.ok(body.includes(id),id);
 }
 const js=await worker.fetch(req('/ui.js',null));
 assert.equal(js.status,200);
 const source=await js.text();
 assert.match(source,/phase1-load-roster/);
 assert.match(source,/phase1-agent-workbench|agent-workbench/);
 assert.match(source,/phase1-inspect/);
 assert.doesNotMatch(source,/phase1\.real-evidence-ingest/);
 assert.doesNotMatch(source,/owner-test-token-long-enough/);
 assert.doesNotMatch(source,/phase1\/agent-workbench.*POST/);
 assert.doesNotThrow(()=>new vm.Script(source));
});
