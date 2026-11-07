/**
 * Runs exact optional SCOTTY approval migration against an IN-MEMORY SQLite
 * database only. Never contacts Cloudflare, Activepieces or any live SCOTTY DB.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {reviewLedgerReadiness} from './activepieces-review-readiness.mjs';
import {createOwnerPreviewReview,decideOwnerPreviewReview,readOwnerPreviewReview} from './activepieces-review-store.mjs';

const migration=fs.readFileSync(new URL('./activepieces-review-ledger-v1.sql',import.meta.url),'utf8');
const now=new Date('2026-11-07T04:00:00.000Z');
const proposal={
 requestId:'review-demo-0001',projectId:'eirden-atelier',
 missionId:'demo-mission-0001',idempotencyKey:'idempotency-demo-0001',
 revision:'r1',intentDigest:'a'.repeat(64),
 agentIds:['agent-geordi-02','agent-expansion-012'],
 scope:'mission.preview',classification:'public-or-synthetic',
 containsPrivateData:false,paidProviderRequested:false,
 expiresAt:'2026-11-07T04:30:00.000Z'
};
const actor={
 authenticated:true,verifiedByScotty:true,provenance:'scotty-server-side-session',
 role:'owner',ownerId:'owner-demo-0001',allowedProjects:['eirden-atelier']
};
const project={
 origin:'scotty-server-project-store',id:'eirden-atelier',active:true,
 allowedAgentIds:['agent-geordi-02','agent-expansion-012']
};
function isolatedDatabase(){
 const native=new DatabaseSync(':memory:');
 native.exec(migration);
 // Map Cloudflare D1's async API to an actual local SQLite transaction.
 const db={
  prepare(sql){
   const stmt=native.prepare(sql);
   return {bind(...args){
    return {
     first:async()=>stmt.get(...args)||null,
     all:async()=>({results:stmt.all(...args)}),
     run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})
    };
   },all:async()=>({results:stmt.all()})};
  },
  async batch(statements){
   native.exec('BEGIN IMMEDIATE');
   try{
    const out=[];
    for(const step of statements)out.push(await step.run());
    native.exec('COMMIT');
    return out;
   }catch(e){native.exec('ROLLBACK');throw e;}
  }
 };
 return {db,native,close:()=>native.close()};
}
const request=(x)=>({actor,project,proposal,now,...x});
const decision=(x)=>({actor,project,requestId:proposal.requestId,
 revision:proposal.revision,intentDigest:proposal.intentDigest,
 expectedVersion:1,decision:'approved',confirmed:true,now,...x});

test('real in-memory SQLite supports safe draft and idempotent replay',async()=>{
 const s=isolatedDatabase();
 try{
  assert.equal((await reviewLedgerReadiness(s.db)).ready,true);
  const first=await createOwnerPreviewReview(s.db,request());
  assert.equal(first.created,true);
  assert.equal(first.reviewStatus,'pending');
  assert.equal(first.canExecute,false);
  assert.equal(first.privateMemoryWrites,0);
  assert.equal(s.native.prepare('SELECT COUNT(*) n FROM scotty_activepieces_review_audit_v1').get().n,1);
  const again=await createOwnerPreviewReview(s.db,request());
  assert.equal(again.replayed,true);
  assert.equal(again.created,false);
  assert.equal(s.native.prepare('SELECT COUNT(*) n FROM scotty_activepieces_review_requests_v1').get().n,1);
  assert.equal(s.native.prepare('SELECT COUNT(*) n FROM scotty_activepieces_review_audit_v1').get().n,1);
 }finally{s.close();}
});

test('owner review approve -> revoke is audited, never becomes mission execution',async()=>{
 const s=isolatedDatabase();
 try{
  await createOwnerPreviewReview(s.db,request());
  const approved=await decideOwnerPreviewReview(s.db,decision());
  assert.equal(approved.reviewStatus,'approved');
  assert.equal(approved.reviewVersion,2);
  assert.equal(approved.canExecute,false);
  assert.equal(approved.agentExecutionAuthorized,false);
  await assert.rejects(()=>decideOwnerPreviewReview(s.db,decision()),/REVIEW_REVISION_CONFLICT/);
  const revoked=await decideOwnerPreviewReview(s.db,decision({expectedVersion:2,decision:'revoked'}));
  assert.equal(revoked.reviewStatus,'revoked');
  assert.equal(revoked.reviewVersion,3);
  assert.equal(revoked.canExecute,false);
  assert.equal(s.native.prepare('SELECT COUNT(*) n FROM scotty_activepieces_review_audit_v1').get().n,3);
  assert.deepEqual(s.native.prepare('SELECT event_type FROM scotty_activepieces_review_audit_v1 ORDER BY occurred_at,event_id').all().map(x=>x.event_type).sort(),
    ['approved','created','revoked']);
 }finally{s.close();}
});

test('reject then approve is forbidden; different owner and project rejected',async()=>{
 const s=isolatedDatabase();
 try{
  await createOwnerPreviewReview(s.db,request());
  await assert.rejects(()=>decideOwnerPreviewReview(s.db,decision({actor:{...actor,ownerId:'other-owner-0001'}})),/REVIEW_OWNER_MISMATCH/);
  await assert.rejects(()=>decideOwnerPreviewReview(s.db,decision({project:{...project,active:false}})),/VERIFIED_PROJECT_MEMBERSHIP_REQUIRED/);
  await assert.rejects(()=>decideOwnerPreviewReview(s.db,decision({intentDigest:'b'.repeat(64)})),/REVIEW_REVISION_CONFLICT/);
  const denied=await decideOwnerPreviewReview(s.db,decision({decision:'rejected'}));
  assert.equal(denied.reviewStatus,'rejected');
  assert.equal(denied.canExecute,false);
  await assert.rejects(()=>decideOwnerPreviewReview(s.db,decision({decision:'approved',expectedVersion:2})),/ILLEGAL_REVIEW_TRANSITION/);
  assert.equal(s.native.prepare('SELECT COUNT(*) n FROM scotty_activepieces_review_audit_v1').get().n,2);
 }finally{s.close();}
});

test('no owner session, private request, expired or mismatched idempotency cannot write',async()=>{
 const s=isolatedDatabase();
 try{
  await assert.rejects(()=>createOwnerPreviewReview(s.db,request({actor:null})),/VERIFIED_OWNER_SESSION_REQUIRED/);
  await assert.rejects(()=>createOwnerPreviewReview(s.db,request({proposal:{...proposal,containsPrivateData:true}})),/INVALID_PUBLIC_REVIEW_PROPOSAL/);
  await assert.rejects(()=>createOwnerPreviewReview(s.db,request({proposal:{...proposal,expiresAt:'2026-11-07T03:00:00.000Z'}})),/INVALID_REVIEW_EXPIRATION/);
  assert.equal(s.native.prepare('SELECT COUNT(*) n FROM scotty_activepieces_review_requests_v1').get().n,0);
  await createOwnerPreviewReview(s.db,request());
  await assert.rejects(()=>createOwnerPreviewReview(s.db,request({proposal:{...proposal,requestId:'review-demo-0002'}})),/REVIEW_IDEMPOTENCY_KEY_CONFLICT/);
  await assert.rejects(()=>createOwnerPreviewReview(s.db,request({proposal:{...proposal,requestId:'review-demo-0002',intentDigest:'b'.repeat(64)}})),/REVIEW_IDEMPOTENCY_KEY_CONFLICT/);
  assert.equal(s.native.prepare('SELECT COUNT(*) n FROM scotty_activepieces_review_requests_v1').get().n,1);
 }finally{s.close();}
});


test('trusted owner can verify the exact preview audit, never read secret content',async()=>{
 const s=isolatedDatabase();
 try{
   await createOwnerPreviewReview(s.db,request());
   let review=await readOwnerPreviewReview(s.db,{actor,project,requestId:proposal.requestId});
   assert.equal(review.reviewStatus,'pending');
   assert.equal(review.auditVerified,true);
   assert.equal(review.auditEventCount,1);
   assert.equal(review.canExecute,false);
   assert.equal(JSON.stringify(review).includes('agent_ids_json'),false);
   await decideOwnerPreviewReview(s.db,decision());
   review=await readOwnerPreviewReview(s.db,{actor,project,requestId:proposal.requestId});
   assert.equal(review.reviewStatus,'approved');
   assert.equal(review.auditEventCount,2);
   assert.equal(review.agentExecutionAuthorized,false);
   await assert.rejects(()=>readOwnerPreviewReview(s.db,{actor:{...actor,ownerId:'different-owner-0001'},project,requestId:proposal.requestId}),/REVIEW_OWNER_MISMATCH/);
   await assert.rejects(()=>readOwnerPreviewReview(s.db,{actor:null,project,requestId:proposal.requestId}),/VERIFIED_OWNER_SESSION_REQUIRED/);
   await assert.rejects(()=>readOwnerPreviewReview(s.db,{actor,project:{...project,allowedAgentIds:['agent-geordi-02']},requestId:proposal.requestId}),/VERIFIED_PROJECT_MEMBERSHIP_REQUIRED/);
 }finally{s.close();}
});
test('missing, forged or malformed audit entries are detected instead of claiming success',async()=>{
 const s=isolatedDatabase();
 try{
   await createOwnerPreviewReview(s.db,request());
   s.native.prepare("DELETE FROM scotty_activepieces_review_audit_v1 WHERE event_type='created'").run();
   await assert.rejects(()=>readOwnerPreviewReview(s.db,{actor,project,requestId:proposal.requestId}),/REVIEW_AUDIT_INCOMPLETE/);
   await assert.rejects(()=>createOwnerPreviewReview(s.db,request()),/REVIEW_AUDIT_INCOMPLETE/);
 }finally{s.close();}
 const s2=isolatedDatabase();
 try{
   await createOwnerPreviewReview(s2.db,request());
   s2.native.prepare("UPDATE scotty_activepieces_review_audit_v1 SET actor_id=? WHERE request_id=?").run('forged-actor-0001',proposal.requestId);
   await assert.rejects(()=>readOwnerPreviewReview(s2.db,{actor,project,requestId:proposal.requestId}),/REVIEW_AUDIT_INCONSISTENT/);
 }finally{s2.close();}
});
test('manual audit deletion or inconsistent review state does not produce verified authorization',async()=>{
 const s=isolatedDatabase();
 try{
   await createOwnerPreviewReview(s.db,request());
   s.native.prepare("UPDATE scotty_activepieces_review_requests_v1 SET status='approved',decided_at=?,version=2 WHERE request_id=?").run(now.toISOString(),proposal.requestId);
   await assert.rejects(()=>readOwnerPreviewReview(s.db,{actor,project,requestId:proposal.requestId}),/REVIEW_AUDIT_INCOMPLETE/);
   await assert.rejects(()=>decideOwnerPreviewReview(s.db,decision({expectedVersion:2,decision:'revoked'})),/REVIEW_AUDIT_INCOMPLETE/);
 }finally{s.close();}
});


test('version or audit timestamp tampering fails closed before owner readback',async()=>{
 for(const [sql,args,reason] of [
  ["UPDATE scotty_activepieces_review_requests_v1 SET version=8 WHERE request_id=?",['review-demo-0001'],/REVIEW_VERSION_AUDIT_MISMATCH/],
  ["UPDATE scotty_activepieces_review_audit_v1 SET occurred_at=? WHERE request_id=?",['2026-11-07T05:00:00.000Z','review-demo-0001'],/REVIEW_AUDIT_TIMESTAMP_MISMATCH/],
  ["UPDATE scotty_activepieces_review_requests_v1 SET created_at=? WHERE request_id=?",['2026-11-07T03:00:00.000Z','review-demo-0001'],/REVIEW_AUDIT_TIMESTAMP_MISMATCH/]
 ]){
  const s=isolatedDatabase();
  try{
   await createOwnerPreviewReview(s.db,request());
   s.native.prepare(sql).run(...args);
   await assert.rejects(()=>readOwnerPreviewReview(s.db,{actor,project,requestId:proposal.requestId}),reason);
  }finally{s.close();}
 }
});
test('malformed stored expiration does not permit a review decision',async()=>{
 const s=isolatedDatabase();
 try{
  await createOwnerPreviewReview(s.db,request());
  s.native.prepare("UPDATE scotty_activepieces_review_requests_v1 SET expires_at=? WHERE request_id=?").run('not-a-date',proposal.requestId);
  await assert.rejects(()=>decideOwnerPreviewReview(s.db,decision()),/REVIEW_EXPIRED/);
  assert.equal(s.native.prepare("SELECT status FROM scotty_activepieces_review_requests_v1 WHERE request_id=?").get(proposal.requestId).status,'pending');
 }finally{s.close();}
});
