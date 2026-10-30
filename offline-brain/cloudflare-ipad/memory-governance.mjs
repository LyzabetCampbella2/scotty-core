/** Owner-approved isolated D1 governance. No production DB, no model calls.
 * Requires optional memory-governance-v2.sql migration and transactional D1 batch.
 */
const actions=new Set(['correct','replace','expire','archive','delete']);
const clean=(s,n)=>typeof s==='string'?s.trim().slice(0,n):'';
const future=(date,now)=>{const t=new Date(date).getTime();return Number.isFinite(t)&&t>now.getTime()&&t<=now.getTime()+365*86400000};
export function changePlan(note,request,now=new Date()){
 if(!note||!note.id)throw Error('NOTE_NOT_FOUND');
 const action=request?.action;
 if(!actions.has(action))throw Error('INVALID_CHANGE_ACTION');
 if(typeof request.noteId!=='string'||request.noteId!==note.id)throw Error('NOTE_ID_MISMATCH');
 if(action!=='delete'&&new Date(note.expires_at).getTime()<=now.getTime())throw Error('NOTE_ALREADY_EXPIRED');
 const old={id:note.id,agentId:note.agent_id,scope:note.scope,title:note.title,content:note.content,url:note.url,reviewedAt:note.reviewed_at,expiresAt:note.expires_at};
 const next={...old};
 if(action==='correct'||action==='replace'){
  if(!clean(request.title,160)||!clean(request.content,1800)||String(request.title).length>160||String(request.content).length>1800)throw Error('INVALID_REPLACEMENT');
  next.title=clean(request.title,160);next.content=clean(request.content,1800);
  if(request.url!=null){
   if(request.url!==''){const u=new URL(String(request.url));if(u.protocol!=='https:'||u.username||u.password)throw Error('INVALID_SOURCE_URL');next.url=u.href;}
   else next.url=null;
  }
 }
 if(action==='expire'){
  if(!future(request.expiresAt,now))throw Error('INVALID_EXPIRY_DATE');
  next.expiresAt=new Date(request.expiresAt).toISOString();
 }
 if(action==='archive')next.expiresAt=now.toISOString();
 if(action==='delete')return {action,old,next:{id:old.id,deleted:true},expectedReviewedAt:old.reviewedAt};
 return {action,old,next,expectedReviewedAt:old.reviewedAt};
}
async function fingerprint(plan){
 const text=JSON.stringify([plan.action,plan.old,plan.next,plan.expectedReviewedAt]);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function one(db,id){
 const r=await db.prepare('SELECT id,agent_id,scope,title,content,url,reviewed_at,expires_at FROM brain_notes WHERE id=? LIMIT 1').bind(id).first();
 return r||null;
}
async function auditReady(db){
 if(!db?.batch||!db?.prepare)throw Error('TRANSACTIONAL_D1_REQUIRED');
 const r=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='brain_note_change_audit'").all();
 if(!(r.results||[]).some(x=>x.name==='brain_note_change_audit'))throw Error('MEMORY_GOVERNANCE_MIGRATION_REQUIRED');
}
export async function noteChange(db,request,{now=new Date()}={}){
 await auditReady(db);
 const id=clean(request?.noteId,100);
 if(!/^[a-z0-9-]{8,100}$/i.test(id))throw Error('INVALID_NOTE_ID');
 const current=await one(db,id);
 if(!current)throw Error('NOTE_NOT_FOUND');
 const plan=changePlan(current,{...request,noteId:id},now),hash=await fingerprint(plan);
 if(request.stage==='preview')return {stage:'preview',...plan,previewToken:hash,
  reminder:'No memory has changed. Confirm the exact before/after and owner consent before applying.'};
 if(request.stage!=='apply'||request.approved!==true||request.reviewAcknowledged!==true||request.noPrivateDataConfirmed!==true||request.previewToken!==hash)
  throw Error('OWNER_APPROVAL_OR_FRESH_PREVIEW_REQUIRED');
 const updatedAt=new Date(Math.max(now.getTime(),new Date(current.reviewed_at).getTime()+1)).toISOString();
 const change=plan.action==='delete'
  ?db.prepare('DELETE FROM brain_notes WHERE id=? AND reviewed_at=?').bind(id,current.reviewed_at)
  :db.prepare('UPDATE brain_notes SET title=?,content=?,url=?,reviewed_at=?,expires_at=? WHERE id=? AND reviewed_at=?')
   .bind(plan.next.title,plan.next.content,plan.next.url,updatedAt,plan.next.expiresAt,id,current.reviewed_at);
 // D1 batch executes statements transactionally; changes() ties the audit to the prior write.
 const audit=db.prepare('INSERT INTO brain_note_change_audit(id,note_id,action,old_reviewed_at,new_reviewed_at,changed_at) SELECT ?,?,?,?,?,? WHERE changes()=1')
  .bind(crypto.randomUUID(),id,plan.action,current.reviewed_at,plan.action==='delete'?null:updatedAt,now.toISOString());
 const result=await db.batch([change,audit]);
 if(Number(result?.[0]?.meta?.changes??result?.[0]?.changes??0)!==1)throw Error('REVISION_CONFLICT_NOT_APPLIED');
 if(Number(result?.[1]?.meta?.changes??result?.[1]?.changes??0)!==1)throw Error('AUDIT_NOT_VERIFIED');
 const readback=await one(db,id);
 const verified=plan.action==='delete'?!readback:!!readback&&readback.reviewed_at===updatedAt&&readback.content===plan.next.content&&readback.expires_at===plan.next.expiresAt;
 if(!verified)throw Error('MEMORY_READBACK_NOT_VERIFIED');
 return {stage:'applied',noteId:id,action:plan.action,verified:true,deleted:plan.action==='delete',
  latestReviewedAt:plan.action==='delete'?null:updatedAt,
  noteTextRetainedInAudit:false,modelCalls:0,productionWrites:0};
}
export async function noteAudit(db,id){
 await auditReady(db);
 if(typeof id!=='string'||!/^[a-z0-9-]{8,100}$/i.test(id))throw Error('INVALID_NOTE_ID');
 const r=await db.prepare('SELECT id,note_id AS noteId,action,old_reviewed_at AS oldReviewedAt,new_reviewed_at AS newReviewedAt,changed_at AS changedAt FROM brain_note_change_audit WHERE note_id=? ORDER BY changed_at DESC LIMIT 100').bind(id).all();
 return {noteId:id,changes:r.results||[],includesHistoricalContent:false};
}
export function findNoteConflicts(notes){
 const groups=new Map(),out=[];
 for(const n of notes||[]){
  if(n.expiresAt&&new Date(n.expiresAt)<=new Date())continue;
  const key=String(n.scope||'')+'|'+String(n.agentId||'')+'|'+String(n.title||'').trim().toLowerCase();
  if(!key||!n.title)continue;groups.set(key,[...(groups.get(key)||[]),n]);
 }
 for(const [key,group] of groups){
  if(group.length>1&&new Set(group.map(n=>String(n.content||'').trim().toLowerCase())).size>1)
   out.push({key,ids:group.map(n=>n.id),reason:'Same recipient, scope and title contain conflicting active note text. Owner must choose which to supersede.',automaticallyResolved:false});
 }
 return out;
}
