/**
 * RIKER Phase 2 — owner-authenticated persistence adapter for the isolated D1 lab.
 * This module is NOT routed or deployed. Requires a separately reviewed migration.
 * No personal content is hardcoded, logged, or stored in GitHub.
 */
import {RIKER_ID,proposeRikerMemory,canRecallRikerMemory} from './riker-brain.mjs';
const CATEGORIES=new Set(['owner_preference','decision','project','mission','collaboration','check_in','reference','lesson']);
const SCOPES=new Set(['private','project','department']);
const rows=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results||[];
const requireOwner=ctx=>{if(ctx?.ownerVerified!==true)throw Error('OWNER_AUTHORIZATION_REQUIRED');};
const requireDb=db=>{if(!db?.prepare||!db?.batch)throw Error('ISOLATED_D1_REQUIRED');};
const iso=()=>new Date().toISOString();
const validId=id=>typeof id==='string'&&/^[a-z0-9-]{8,100}$/i.test(id);
export async function rikerMemoryReady(db){
 try{
  requireDb(db);
  await rows(db,'SELECT id,agent_id,category,scope,project_id,department,text,source,status,sensitivity,created_at,reviewed_at,expires_at FROM riker_memory LIMIT 0');
  await rows(db,'SELECT id,note_id,action,at FROM riker_memory_audit LIMIT 0');
  const triggers=await rows(db,"SELECT name FROM sqlite_master WHERE type='trigger' AND name IN ('riker_memory_audit_on_insert','riker_memory_audit_on_review','riker_memory_audit_on_delete')");
  if(triggers.length!==3)throw Error('RIKER_AUDIT_TRIGGERS_REQUIRED');
  return {ready:true};
 }catch{return {ready:false,reason:'RIKER_MEMORY_MIGRATION_REQUIRED'};}
}
export async function proposeStoredRikerMemory(db,input,ctx){
 requireOwner(ctx);requireDb(db);
 const p=proposeRikerMemory(input);
 if(p.sensitivity==='sensitive')throw Error('SENSITIVE_CONTENT_REQUIRES_SEPARATE_ENCRYPTED_STORE');
 if(input.scope==='project'&&!ctx.authorizedProjectIds?.includes(input.projectId))throw Error('PROJECT_ACCESS_REQUIRED');
 if(input.scope==='department'&&input.department!=='Operations & Coordination')throw Error('DEPARTMENT_ACCESS_REQUIRED');
 if(!Number.isInteger(input.validDays)||input.validDays<1||input.validDays>365)throw Error('VALID_DAYS_REQUIRED');
 const id=crypto.randomUUID(),expiry=new Date(Date.now()+input.validDays*86400000).toISOString();
 await db.prepare('INSERT INTO riker_memory(id,agent_id,category,scope,project_id,department,text,source,status,sensitivity,created_at,reviewed_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
  .bind(id,RIKER_ID,p.category,p.scope,p.projectId||null,p.department||null,p.text,p.source,'pending','ordinary',p.createdAt,null,expiry).run();
 return {id,status:'pending',scope:p.scope,expiresAt:expiry};
}
async function get(db,id){
 if(!validId(id))throw Error('INVALID_MEMORY_ID');
 return (await rows(db,'SELECT * FROM riker_memory WHERE id=? AND agent_id=? LIMIT 1',id,RIKER_ID))[0]||null;
}
export async function decideStoredRikerMemory(db,id,decision,ctx){
 requireOwner(ctx);requireDb(db);
 const note=await get(db,id);
 if(!note||note.status!=='pending')throw Error('PENDING_MEMORY_REQUIRED');
 if(!['approved','rejected'].includes(decision))throw Error('INVALID_REVIEW');
 if(note.scope==='project'&&!ctx.authorizedProjectIds?.includes(note.project_id))throw Error('PROJECT_ACCESS_REQUIRED');
 if(note.scope==='department'&&note.department!=='Operations & Coordination')throw Error('DEPARTMENT_ACCESS_REQUIRED');
 if(Date.parse(note.expires_at)<=Date.now())throw Error('MEMORY_EXPIRED');
 const at=iso();
 const result=await db.prepare("UPDATE riker_memory SET status=?,reviewed_at=? WHERE id=? AND agent_id=? AND status='pending'")
  .bind(decision,at,id,RIKER_ID).run();
 if(Number(result?.meta?.changes??0)!==1)throw Error('MEMORY_REVIEW_CONFLICT');
 const latest=await get(db,id);
 if(latest?.status!==decision||latest.reviewed_at!==at)throw Error('MEMORY_READBACK_FAILED');
 return {id,status:decision,reviewedAt:at};
}
export async function recallStoredRikerMemory(db,ctx){
 requireOwner(ctx);requireDb(db);
 const now=iso();
 const candidates=await rows(db,"SELECT * FROM riker_memory WHERE agent_id=? AND status='approved' AND expires_at>? ORDER BY reviewed_at DESC LIMIT 200",RIKER_ID,now);
 const access={ownerVerified:true,projectIds:ctx.authorizedProjectIds||[],
  department:'Operations & Coordination',ownerAuthorizedSensitiveAccess:false};
 return candidates.filter(n=>canRecallRikerMemory({
  agentId:n.agent_id,status:n.status,scope:n.scope,projectId:n.project_id,department:n.department,sensitivity:n.sensitivity
 },access)).map(n=>({id:n.id,category:n.category,scope:n.scope,projectId:n.project_id,
  text:n.text,source:n.source,reviewedAt:n.reviewed_at,expiresAt:n.expires_at}));
}
export async function forgetStoredRikerMemory(db,id,ctx){
 requireOwner(ctx);requireDb(db);
 const note=await get(db,id);if(!note)throw Error('MEMORY_NOT_FOUND');
 const result=await db.prepare('DELETE FROM riker_memory WHERE id=? AND agent_id=?').bind(id,RIKER_ID).run();
 if(Number(result?.meta?.changes??0)!==1)throw Error('MEMORY_DELETE_CONFLICT');
 if(await get(db,id))throw Error('MEMORY_DELETE_READBACK_FAILED');
 return {id,deleted:true,contentRetainedInAudit:false};
}
