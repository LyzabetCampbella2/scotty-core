import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {proposeAgentProfileRevision} from './agent-brain-revisions.mjs';
import {agentBrain} from './individual-agent-brains.mjs';
import {
 phase1ProfileLedgerReadiness,createPhase1ProfileReview,
 decidePhase1ProfileReview,readPhase1ProfileReview
} from './phase1-profile-review-store.mjs';

const sql=fs.readFileSync(new URL('./phase1-profile-review-ledger-v1.sql',import.meta.url),'utf8');
const now=new Date('2026-11-07T18:00:00.000Z');
function isolated({migrated=true}={}){
 const native=new DatabaseSync(':memory:');
 native.exec('PRAGMA foreign_keys=ON');
 if(migrated)native.exec(sql);
 const db={
  prepare(statement){
   const prepared=native.prepare(statement);
   return {
    bind(...params){return {
      first:async()=>prepared.get(...params)||null,
      all:async()=>({results:prepared.all(...params)}),
      run:async()=>({meta:{changes:Number(prepared.run(...params).changes)}})
    };},
    all:async()=>({results:prepared.all()})
   };
  },
  async batch(steps){
   native.exec('BEGIN IMMEDIATE');
   try{
    const results=[];
    for(const item of steps)results.push(await item.run());
    native.exec('COMMIT');
    return results;
   }catch(e){native.exec('ROLLBACK');throw e;}
  }
 };
 return {native,db,close:()=>native.close()};
}
const actor={authenticated:true,verifiedByScotty:true,
 provenance:'scotty-server-side-session',
 role:'owner',ownerId:'owner-demo-0001',
 allowedAgentIds:['chief-riker','agent-geordi-02','chief-geordi']};
async function makeRequest({
 agentId='agent-geordi-02',
 requestId='profile-geordi-0001',
 idempotencyKey=requestId,
 expectedHeadVersion=0,
 patch={voice:'Clear, attentive and precise about engineering constraints.'},
 editedAt=now,
 expiresAt='2026-11-07T19:00:00.000Z'
}={}){
 const proposal=await proposeAgentProfileRevision({
  agentId,requestId,patch,
  editorNote:'Synthetic public preference for review only'
 });
 return {
  actor,proposal,expectedHeadVersion,idempotencyKey,expiresAt,
  classification:'public-or-synthetic',containsPrivateData:false,now:editedAt
 };
}
function decide(args,decision,expectedVersion=1){
 return {
  actor,requestId:args.proposal.requestId,
  changeDigest:args.proposal.changeDigest,
  expectedVersion,decision,confirmed:true,now
 };
}
test('optional schema exists only in isolated SQLite and never grants activation',async()=>{
 const no=isolated({migrated:false});
 try{
  assert.deepEqual((await phase1ProfileLedgerReadiness(no.db)).ready,false);
  assert.equal((await phase1ProfileLedgerReadiness(no.db)).canActivate,false);
 }finally{no.close();}
 const yes=isolated();
 try{
  yes.native.exec(sql);
  const readiness=await phase1ProfileLedgerReadiness(yes.db);
  assert.equal(readiness.ready,true);
  assert.equal(readiness.canActivate,false);
  assert.equal(yes.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_reviews_v1').get().n,0);
 }finally{yes.close();}
});
test('create, approve and revoke only profile-review metadata; preserve full immutable audit',async()=>{
 const x=isolated();
 try{
  const req=await makeRequest();
  const created=await createPhase1ProfileReview(x.db,req);
  assert.equal(created.created,true);
  assert.equal(created.reviewStatus,'pending');
  assert.equal(created.ownerAcceptedEntireBrain,false);
  assert.equal(created.runtimePromptActivated,false);
  assert.equal(created.canExecute,false);
  assert.equal(created.toolsGranted,0);
  assert.equal(created.memoryWrites,0);
  assert.equal(created.modelCalls,0);
  const approved=await decidePhase1ProfileReview(x.db,decide(req,'approved'));
  assert.equal(approved.profileReviewApproved,true);
  assert.equal(approved.currentHeadVersion,1);
  assert.equal(approved.currentApprovedRequestId,req.proposal.requestId);
  assert.equal(approved.ownerAcceptedEntireBrain,false);
  assert.equal(approved.runtimePromptActivated,false);
  assert.equal(agentBrain(req.proposal.agentId).persona.voice!==req.proposal.patch.voice,true);
  const read=await readPhase1ProfileReview(x.db,{actor,requestId:req.proposal.requestId});
  assert.equal(read.auditVerified,true);
  assert.equal(read.reviewVersion,2);
  const revoked=await decidePhase1ProfileReview(x.db,decide(req,'revoked',2));
  assert.equal(revoked.reviewStatus,'revoked');
  assert.equal(revoked.currentHeadVersion,2);
  assert.equal(revoked.currentApprovedRequestId,null);
  assert.equal(revoked.runtimePromptActivated,false);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_audit_v1').get().n,3);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_reviews_v1').get().n,1);
  assert.throws(()=>x.native.prepare('DELETE FROM scotty_phase1_agent_profile_audit_v1').run(),/PROFILE_AUDIT_IMMUTABLE/);
  assert.throws(()=>x.native.prepare("UPDATE scotty_phase1_agent_profile_audit_v1 SET event_type='created'").run(),/PROFILE_AUDIT_IMMUTABLE/);
  assert.throws(()=>x.native.prepare('DELETE FROM scotty_phase1_agent_profile_reviews_v1').run(),/PROFILE_REVIEWS_APPEND_ONLY/);
 }finally{x.close();}
});
test('same approved public profile request can be read safely, but duplicate approval is forbidden',async()=>{
 const x=isolated();
 try{
  const req=await makeRequest();
  await createPhase1ProfileReview(x.db,req);
  await decidePhase1ProfileReview(x.db,decide(req,'approved'));
  const read=await readPhase1ProfileReview(x.db,{actor,requestId:req.proposal.requestId});
  assert.equal(read.reviewStatus,'approved');
  await assert.rejects(()=>decidePhase1ProfileReview(x.db,decide(req,'approved',1)),/PROFILE_REVIEW_TRANSITION_FORBIDDEN|PROFILE_REVIEW_VERSION_OR_DIGEST_CONFLICT/);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_audit_v1').get().n,2);
 }finally{x.close();}
});
test('reject transitions do not update current approved head or runtime identity',async()=>{
 const x=isolated();
 try{
  const req=await makeRequest();
  await createPhase1ProfileReview(x.db,req);
  const rejected=await decidePhase1ProfileReview(x.db,decide(req,'rejected'));
  assert.equal(rejected.reviewStatus,'rejected');
  assert.equal(rejected.currentHeadVersion,0);
  assert.equal(rejected.currentApprovedRequestId,null);
  await assert.rejects(()=>decidePhase1ProfileReview(x.db,decide(req,'approved',2)),/PROFILE_REVIEW_TRANSITION_FORBIDDEN/);
  assert.deepEqual(agentBrain(req.proposal.agentId).grantedToolIds,[]);
 }finally{x.close();}
});
test('competing pending revisions cannot both be approved against the same head version',async()=>{
 const x=isolated();
 try{
  const a=await makeRequest();
  const b=await makeRequest({requestId:'profile-geordi-0002',
   patch:{voice:'Friendly but rigorous with interface review and accessibility.'}});
  await createPhase1ProfileReview(x.db,a);
  await createPhase1ProfileReview(x.db,b);
  await decidePhase1ProfileReview(x.db,decide(a,'approved'));
  await assert.rejects(()=>decidePhase1ProfileReview(x.db,decide(b,'approved')),/PROFILE_REVIEW_HEAD_STALE_OR_ACTIVE/);
  assert.equal((await readPhase1ProfileReview(x.db,{actor,requestId:b.proposal.requestId})).reviewStatus,'pending');
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_audit_v1').get().n,3);
  await decidePhase1ProfileReview(x.db,decide(a,'revoked',2));
  await assert.rejects(()=>decidePhase1ProfileReview(x.db,decide(b,'approved')),/PROFILE_REVIEW_HEAD_STALE_OR_ACTIVE/);
  const c=await makeRequest({requestId:'profile-geordi-0003',expectedHeadVersion:2});
  await createPhase1ProfileReview(x.db,c);
  const accepted=await decidePhase1ProfileReview(x.db,decide(c,'approved'));
  assert.equal(accepted.currentHeadVersion,3);
 }finally{x.close();}
});
test('exact idempotency only; same key with changed owner request, role or patch never becomes replay',async()=>{
 const x=isolated();
 try{
  const first=await makeRequest();
  await createPhase1ProfileReview(x.db,first);
  const replay=await createPhase1ProfileReview(x.db,first);
  assert.equal(replay.replayed,true);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_audit_v1').get().n,1);
  const changed=await makeRequest({requestId:'profile-geordi-0002',
   idempotencyKey:first.idempotencyKey});
  await assert.rejects(()=>createPhase1ProfileReview(x.db,changed),/PROFILE_REVIEW_IDEMPOTENCY_CONFLICT/);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_reviews_v1').get().n,1);
 }finally{x.close();}
});
test('forged session or permission, stale head, unverified data or tampered digest fail closed',async()=>{
 const x=isolated();
 try{
  const base=await makeRequest();
  for(const changed of [
   {actor:{...actor,verifiedByScotty:false}},
   {actor:{...actor,provenance:'activepieces-json'}},
   {actor:{...actor,role:'client'}},
   {actor:{...actor,allowedAgentIds:[]}},
   {expectedHeadVersion:7},
   {classification:'private'},
   {containsPrivateData:true},
   {proposal:{...base.proposal,changeDigest:'c'.repeat(64)}},
   {proposal:{...base.proposal,existingChief:'chief-unknown'}},
   {proposal:{...base.proposal,patch:{...base.proposal.patch,admin:'enabled'}}}
  ]){
   await assert.rejects(()=>createPhase1ProfileReview(x.db,{...base,...changed}));
  }
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_reviews_v1').get().n,0);
  assert.equal(x.native.prepare('SELECT COUNT(*) AS n FROM scotty_phase1_agent_profile_audit_v1').get().n,0);
 }finally{x.close();}
});
test('audit corruption, unauthorized access and protected field mutation are detected',async()=>{
 const x=isolated();
 try{
  const a=await makeRequest();
  await createPhase1ProfileReview(x.db,a);
  await assert.rejects(()=>readPhase1ProfileReview(x.db,{
   actor:{...actor,allowedAgentIds:[]},requestId:a.proposal.requestId
  }),/VERIFIED_OWNER_AGENT_SCOPE_REQUIRED/);
  assert.throws(()=>x.native.prepare(
   "UPDATE scotty_phase1_agent_profile_reviews_v1 SET patch_json='{}' WHERE request_id=?"
  ).run(a.proposal.requestId),/PROFILE_REVIEW_STATE_INVALID/);
  x.native.prepare(
   "INSERT INTO scotty_phase1_agent_profile_audit_v1(event_id,request_id,actor_id,event_type,previous_status,new_status,occurred_at) VALUES(?,?,?,'created',NULL,'pending',?)"
  ).run('forged-audit-001',a.proposal.requestId,actor.ownerId,now.toISOString());
  await assert.rejects(()=>readPhase1ProfileReview(x.db,{
   actor,requestId:a.proposal.requestId
  }),/PROFILE_REVIEW_AUDIT_INCOMPLETE/);
 }finally{x.close();}
});
