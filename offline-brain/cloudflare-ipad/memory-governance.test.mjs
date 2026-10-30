import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {noteChange,noteAudit,findNoteConflicts} from './memory-governance.mjs';
function fixture(){
 const sql=new DatabaseSync(':memory:');
 sql.exec("CREATE TABLE brain_notes(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL,scope TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,url TEXT,reviewed_at TEXT NOT NULL,expires_at TEXT NOT NULL);");
 sql.exec("CREATE TABLE brain_note_change_audit(id TEXT PRIMARY KEY,note_id TEXT NOT NULL,action TEXT NOT NULL,old_reviewed_at TEXT NOT NULL,new_reviewed_at TEXT,changed_at TEXT NOT NULL)");
 const api={
  prepare:q=>({bind:(...args)=>({first:async()=>sql.prepare(q).get(...args),all:async()=>({results:sql.prepare(q).all(...args)}) ,run:async()=>({meta:sql.prepare(q).run(...args)})})}),
  batch:async statements=>{
   sql.exec('BEGIN TRANSACTION');
   try{
    const out=statements.map(stmt=>({meta:{changes:sql.prepare(stmt.q).run(...stmt.args).changes}}));
    sql.exec('COMMIT');return out;
   }catch(e){sql.exec('ROLLBACK');throw e;}
  }
 };
 // batch requires SQL text+args from prepared binds, so define a facade.
 api.prepare=q=>({bind:(...args)=>({q,args,first:async()=>sql.prepare(q).get(...args),all:async()=>({results:sql.prepare(q).all(...args)})})});
 const id='00000000-0000-4000-8000-000000000001';
 sql.prepare("INSERT INTO brain_notes VALUES(?,?,?,?,?,?,?,?)").run(id,'agent-alpha','agent','Reviewed demo','Some old synthetic note','https://example.org/','2026-10-01T00:00:00.000Z','2099-01-01T00:00:00.000Z');
 return {sql,db:api,id,close:()=>sql.close()};
}
const NOW=new Date('2026-10-30T10:00:00.000Z');
test('preview does not write and apply requires explicit consent plus preview hash',async()=>{
 const t=fixture();try{
  const payload={noteId:t.id,stage:'preview',action:'correct',title:'Corrected synthetic fact',content:'Revised reviewed synthetic text'};
  const before=t.sql.prepare('SELECT content FROM brain_notes').get().content;
  const preview=await noteChange(t.db,payload,{now:NOW});
  assert.equal(preview.stage,'preview');
  assert.equal(t.sql.prepare('SELECT content FROM brain_notes').get().content,before);
  await assert.rejects(()=>noteChange(t.db,{...payload,stage:'apply',previewToken:preview.previewToken},{now:NOW}),/OWNER_APPROVAL/);
  const applied=await noteChange(t.db,{...payload,stage:'apply',previewToken:preview.previewToken,approved:true,reviewAcknowledged:true,noPrivateDataConfirmed:true},{now:NOW});
  assert.equal(applied.verified,true);assert.equal(applied.productionWrites,0);
  assert.equal(t.sql.prepare('SELECT content FROM brain_notes').get().content,payload.content);
  assert.equal((await noteAudit(t.db,t.id)).changes.length,1);
  assert.ok(!(JSON.stringify(await noteAudit(t.db,t.id))).includes(before));
  await assert.rejects(()=>noteChange(t.db,{...payload,stage:'apply',previewToken:preview.previewToken,approved:true,reviewAcknowledged:true,noPrivateDataConfirmed:true},{now:NOW}));
 }finally{t.close();}
});
test('delete removes text and source, retains only content-free audit record',async()=>{
 const t=fixture();try{
  const preview=await noteChange(t.db,{noteId:t.id,stage:'preview',action:'delete'},{now:NOW});
  const done=await noteChange(t.db,{noteId:t.id,stage:'apply',action:'delete',previewToken:preview.previewToken,approved:true,reviewAcknowledged:true,noPrivateDataConfirmed:true},{now:NOW});
  assert.equal(done.verified,true);assert.equal(done.deleted,true);
  assert.equal(t.sql.prepare('SELECT count(*) AS n FROM brain_notes').get().n,0);
  const audit=await noteAudit(t.db,t.id);
  assert.equal(audit.changes[0].action,'delete');
  assert.ok(!JSON.stringify(audit).includes('Some old synthetic note'));
  assert.ok(!JSON.stringify(audit).includes('https://example.org/'));
 }finally{t.close();}
});
test('archive expires note without losing audit and rejects unapproved project leakage',async()=>{
 const t=fixture();try{
  const p=await noteChange(t.db,{stage:'preview',action:'archive',noteId:t.id},{now:NOW});
  const out=await noteChange(t.db,{stage:'apply',action:'archive',noteId:t.id,previewToken:p.previewToken,approved:true,reviewAcknowledged:true,noPrivateDataConfirmed:true},{now:NOW});
  assert.equal(out.verified,true);
  assert.equal(t.sql.prepare('SELECT expires_at FROM brain_notes').get().expires_at,NOW.toISOString());
  assert.equal(t.sql.prepare('SELECT agent_id FROM brain_notes').get().agent_id,'agent-alpha');
 }finally{t.close();}
});
test('missing governance schema prevents any write',async()=>{
 const t=fixture();try{
  t.sql.exec('DROP TABLE brain_note_change_audit');
  await assert.rejects(()=>noteChange(t.db,{stage:'preview',action:'delete',noteId:t.id},{now:NOW}),/MIGRATION_REQUIRED/);
  assert.equal(t.sql.prepare('SELECT count(*) AS n FROM brain_notes').get().n,1);
 }finally{t.close();}
});
test('conflicts remain owner review candidates not automatically overwritten',()=>{
 const base={scope:'agent',agentId:'alpha',title:'Delivery status',expiresAt:'2099-01-01'};
 const conflicts=findNoteConflicts([{...base,id:'1',content:'open'},{...base,id:'2',content:'closed'},{...base,id:'3',content:'open',agentId:'beta'}]);
 assert.equal(conflicts.length,1);
 assert.equal(conflicts[0].automaticallyResolved,false);
});
