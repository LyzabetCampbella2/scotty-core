import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {approveCreativePublicNote,fingerprintCreativeNote} from './creative-memory-approval.mjs';
import {createCreativeD1Store} from './creative-agent-d1-store.mjs';
const schema=fs.readFileSync(new URL('./creative-agent-state-v1.sql',import.meta.url),'utf8');
const now=new Date('2026-11-07T16:00:00.000Z');
function local(){
 const native=new DatabaseSync(':memory:');native.exec('PRAGMA foreign_keys=ON');native.exec(schema);
 const db={prepare(q){const st=native.prepare(q);return {
  bind(...params){return {first:async()=>st.get(...params)||null,
   all:async()=>({results:st.all(...params)}),
   run:async()=>({meta:{changes:Number(st.run(...params).changes)}})};},
  all:async()=>({results:st.all()})};},
  async batch(xs){native.exec('BEGIN IMMEDIATE');try{
    const results=[];for(const x of xs)results.push(await x.run());
    native.exec('COMMIT');return results;
   }catch(e){native.exec('ROLLBACK');throw e;}}};
 return {db,native,close:()=>native.close()};
}
const note={noteId:'note-creative-001',projectId:'golden-hour-creative',
 agentId:'agent-creative-pulse',scope:'agent',allowedAgentIds:['agent-creative-pulse'],
 title:'Approved hook preference',content:'Use an original, clearly labeled fictional example.',
 sourceRef:'public-brief-0001',expiresAt:'2026-11-14T16:00:00.000Z',
 classification:'public-or-synthetic',containsPrivateData:false};
const owner={verifiedByScotty:true,provenance:'scotty-server-side-session',
 role:'owner',ownerId:'owner-demo-0001',allowedProjects:['golden-hour-creative']};
const project={source:'scotty-server-project-store',active:true,
 id:'golden-hour-creative',allowedAgentIds:['agent-creative-pulse','agent-creative-iris']};
const make=async()=>({source:'scotty-server-memory-approval-grant',
 approvalKind:'memory.approve',ownerReviewConfirmed:true,revoked:false,
 ownerId:owner.ownerId,noteId:note.noteId,projectId:note.projectId,
 contentDigest:await fingerprintCreativeNote(note),classification:'public-or-synthetic',
 privateDataAllowed:false,externalActionsAllowed:false,
 expiresAt:'2026-11-07T16:30:00.000Z'});
test('explicitly approved public note persists and only correct agent can recall it',async()=>{
 const s=local();
 try{
  const grant=await make();
  const args={owner,project,grant,note,now};
  const first=await approveCreativePublicNote(s.db,args);
  assert.equal(first.status,'OWNER_REVIEWED_PUBLIC_MEMORY_STORED');
  assert.equal(first.memoryWrites,1);
  assert.equal(first.modelCalls,0);
  const duplicate=await approveCreativePublicNote(s.db,args);
  assert.equal(duplicate.status,'ALREADY_OWNER_REVIEWED');
  assert.equal(duplicate.memoryWrites,0);
  assert.equal(s.native.prepare('SELECT COUNT(*) AS n FROM scotty_creative_memory_v1').get().n,1);
  const store=createCreativeD1Store(s.db,{clock:()=>now});
  const own=await store.approvedEvidence({agentId:'agent-creative-pulse',departmentId:'chief-lumen',
    projectId:note.projectId,maxNotes:8,ownerReviewRequired:true});
  assert.deepEqual(own.map(x=>x.id),[note.noteId]);
  const notOwned=await store.approvedEvidence({agentId:'agent-creative-iris',departmentId:'chief-lumen',
    projectId:note.projectId,maxNotes:8,ownerReviewRequired:true});
  assert.deepEqual(notOwned,[]);
 }finally{s.close();}
});
test('forgeable boolean cannot promote unreviewed agent memory',async()=>{
 const s=local();try{
  const grant=await make();
  for(const patch of [
   {grant:{...grant,approvalKind:'mission.preview'}},
   {grant:{...grant,contentDigest:'a'.repeat(64)}},
   {grant:{...grant,revoked:true}},
   {note:{...note,containsPrivateData:true}},
   {note:{...note,agentId:'agent-creative-iris'}},
   {note:{...note,allowedAgentIds:['agent-creative-iris']}},
   {owner:{...owner,provenance:'activepieces-json'}},
   {project:{...project,allowedAgentIds:['agent-creative-iris']}}
  ]){
   await assert.rejects(()=>approveCreativePublicNote(s.db,{owner,project,grant,note,now,...patch}));
  }
  assert.equal(s.native.prepare('SELECT COUNT(*) AS n FROM scotty_creative_memory_v1').get().n,0);
 }finally{s.close();}
});
test('changed note ID or content cannot reuse the original owner-reviewed grant',async()=>{
 const s=local();try{
  const grant=await make();
  await approveCreativePublicNote(s.db,{owner,project,grant,note,now});
  await assert.rejects(()=>approveCreativePublicNote(s.db,{owner,project,grant,
   note:{...note,content:'Changed content'},now}),/OWNER_REVIEWED_MEMORY_GRANT_REQUIRED/);
  await assert.rejects(()=>approveCreativePublicNote(s.db,{owner,project,grant,
   note:{...note,noteId:'note-creative-002'},now}),/OWNER_REVIEWED_MEMORY_GRANT_REQUIRED/);
 }finally{s.close();}
});
