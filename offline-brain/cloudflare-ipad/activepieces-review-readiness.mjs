/**
 * SCOTTY/Activepieces review ledger readiness — schema diagnostics ONLY.
 * No data changes, permission granting, memory operations or AI calls.
 * Never interpret "ready" as approval of a mission or of any requester.
 */
export const REVIEW_SCHEMA_VERSION='scotty-activepieces-review-ledger-v1';
const reason=(code)=>({ready:false,reason:code,schemaVersion:REVIEW_SCHEMA_VERSION,
  approvalsVerified:0,canExecute:false,changesMade:0,modelCalls:0});
const recordColumns=[
 'request_id','owner_id','project_id','mission_id','revision','intent_digest',
 'agent_ids_json','idempotency_key','scope','status','created_at','updated_at',
 'expires_at','decided_at','version'
];
const auditColumns=[
 'event_id','request_id','actor_id','actor_type','event_type',
 'previous_status','new_status','revision','intent_digest','occurred_at'
];
const requiredConstraints=[
 /\bCHECK\s*\(\s*status\s+IN\s*\(/i,
 /\bCHECK\s*\(\s*scope\s*=\s*'mission\.preview'\s*\)/i,
 /\bidempotency_key\s+TEXT\s+NOT\s+NULL\s+UNIQUE\b/i,
 /\brequest_id\s+TEXT\s+PRIMARY\s+KEY\b/i
];
const requiredAuditConstraints=[
 /\bFOREIGN\s+KEY\s*\(\s*request_id\s*\)/i,
 /\bREFERENCES\s+scotty_activepieces_review_requests_v1\b/i,
 /\bCHECK\s*\(\s*actor_type\s*=\s*'authenticated-owner'\s*\)/i,
 /\bCHECK\s*\(\s*event_type\s+IN\s*\(/i
];
export async function reviewLedgerReadiness(db){
 if(typeof db?.prepare!=='function'||typeof db.batch!=='function')
   return reason('ISOLATED_D1_BINDING_UNAVAILABLE');
 try{
   // D1-only schema metadata; do not inspect or expose any review records.
   const result=await db.prepare(
    "SELECT name,sql FROM sqlite_master WHERE type='table' AND name IN ('scotty_activepieces_review_requests_v1','scotty_activepieces_review_audit_v1')"
   ).all();
   const defs=new Map((result.results||[]).map(x=>[x.name,String(x.sql||'')]));
   const requestSql=defs.get('scotty_activepieces_review_requests_v1')||'';
   const auditSql=defs.get('scotty_activepieces_review_audit_v1')||'';
   if(!requestSql||!auditSql)return reason('OWNER_REVIEW_LEDGER_MIGRATION_REQUIRED');
   for(const col of recordColumns){
     if(!new RegExp('\\b'+col+'\\b','i').test(requestSql))
       return reason('OWNER_REVIEW_LEDGER_SCHEMA_INCOMPLETE');
   }
   for(const col of auditColumns){
     if(!new RegExp('\\b'+col+'\\b','i').test(auditSql))
       return reason('OWNER_REVIEW_AUDIT_SCHEMA_INCOMPLETE');
   }
   if(requiredConstraints.some(x=>!x.test(requestSql))||
      requiredAuditConstraints.some(x=>!x.test(auditSql)))
      return reason('OWNER_REVIEW_CONSTRAINTS_UNVERIFIED');
   // SELECT LIMIT 0 validates actual physical columns. No row values read.
   await db.prepare('SELECT '+recordColumns.join(',')+
     ' FROM scotty_activepieces_review_requests_v1 LIMIT 0').all();
   await db.prepare('SELECT '+auditColumns.join(',')+
     ' FROM scotty_activepieces_review_audit_v1 LIMIT 0').all();
   return {ready:true,reason:null,schemaVersion:REVIEW_SCHEMA_VERSION,
     approvalsVerified:0,canExecute:false,changesMade:0,modelCalls:0,
     note:'Schema-only verification; not owner consent, a signed grant, or permission to execute.'};
 }catch{
   return reason('OWNER_REVIEW_LEDGER_SCHEMA_UNAVAILABLE');
 }
}
