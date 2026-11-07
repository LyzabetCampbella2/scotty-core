/**
 * Runs exact optional SCOTTY approval migration against an IN-MEMORY SQLite
 * database only. Never contacts Cloudflare, Activepieces or any live SCOTTY DB.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {reviewLedgerReadiness} from './activepieces-review-readiness.mjs';
import {createOwnerPreviewReview,decideOwnerPreviewReview} from './activepieces-review-store.mjs';

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
  await assert.rejects(()=>createOwnerPreviewReview(s.db,request({proposal:{...proposal,requestId:'review-demo-0002',intentDigest:'b'.repeat(64)}})),/REVIEW_IDEMPOTENCY_KEY_CONFLICT/);
  assert.equal(s.native.prepare('SELECT COUNT(*) n FROM scotty_activepieces_review_requests_v1').get().n,1);
 }finally{s.close();}
});
