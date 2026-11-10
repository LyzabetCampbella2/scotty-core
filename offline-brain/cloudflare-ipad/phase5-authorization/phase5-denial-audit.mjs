/**
 * Phase 5 synthetic-only DENIAL audit boundary.
 * No live route uses this module. It records redacted denials in a dedicated
 * disposable PostgreSQL database, not in SCOTTY production or agent memory.
 * A failed denial audit NEVER turns a denial into an allowance.
 */
const KNOWN_DENIALS=new Set([
 'PHASE5_DISABLED_BY_DEFAULT','REQUEST_REQUIRED','UNSAFE_HTTP_REQUEST',
 'PROJECT_SCOPE_MISMATCH','NON_SYNTHETIC_RESOURCE','ACTION_NOT_ALLOWED',
 'INVALID_NONCE','GRANT_REFERENCE_REQUIRED','OWNER_AUTHENTICATION_FAILED',
 'TRUSTED_OWNER_SCOPE_MISSING','GRANT_LOOKUP_FAILED','GRANT_NOT_FOUND',
 'GRANT_INVALID_OR_REVOKED','GRANT_PROOF_UNVERIFIED',
 'REPLAY_OR_NONCE_STORE_FAILURE','NONCE_REPLAY_OR_STORE_FAILURE',
 'TRANSACTION_OR_AUDIT_UNAVAILABLE','AUDIT_UNAVAILABLE',
 'UNSAFE_GATE_RESPONSE','UNDERLYING_GATE_FAILURE'
]);
const deny=(reason,persisted)=>Object.freeze({
 decision:'DENY',reason,stagingOnly:true,actualPermissionGranted:false,
 denialAuditPersisted:persisted,memoryWrites:0,externalCalls:0,
});
export function createPhase5DenialAuditBoundary({gate,sql,enabled=false}={}){
 if(typeof gate!=='function'||!sql||typeof sql.begin!=='function')
   throw Error('TRUSTED_DEPENDENCIES_REQUIRED');
 return async function auditedPreview(input={}){
   if(!enabled)return deny('PHASE5_DISABLED_BY_DEFAULT',false);
   let decision;
   try{decision=await gate(input)}catch{decision=deny('UNDERLYING_GATE_FAILURE',false)}
   // Only unconditionally non-granting, synthetic preview may be propagated.
   if(decision?.decision==='SIMULATED_ELIGIBLE' &&
      decision.actualPermissionGranted===false&&decision.stagingOnly===true)
     return Object.freeze({...decision,denialAuditPersisted:null});
   const rawReason=decision?.decision==='DENY'&&decision.actualPermissionGranted===false
      ?decision.reason:'UNSAFE_GATE_RESPONSE';
   const reason=KNOWN_DENIALS.has(rawReason)?rawReason:'UNSAFE_GATE_RESPONSE';
   // Do not store raw project IDs, resource IDs, session IDs, nonces,
   // bearer tokens, grant references, request bodies or exception strings.
   const category=input?.action==='workspace:read'?'WORKSPACE_READ'
     :input?.action==='knowledge:propose'?'KNOWLEDGE_PROPOSE':'OTHER';
   let persisted=false;
   try{
     persisted=await sql.begin(async tx=>{
       const rows=await tx.unsafe(
         "insert into scotty_p5_synthetic_denial_audit(outcome,reason_code,action_category) values('DENY',$1,$2)",
         [reason,category]);
       // INSERT without RETURNING requires INSERT privilege only; no audit read access.
       if(!rows||rows.count!==1)throw Error('AUDIT_WRITE_UNCONFIRMED');
       return true;
     })===true;
   }catch{/* Retain DENY; never leak DB error or claim audit succeeded. */}
   return deny(reason,persisted);
 };
}
