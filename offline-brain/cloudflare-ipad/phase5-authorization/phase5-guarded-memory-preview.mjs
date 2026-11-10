/**
 * SCOTTY Phase 5 synthetic memory request coordinator, test-only.
 * Unwired to any live route; NEVER use this with production data, credentials,
 * application identities, or memory. Defaults to disabled.
 *
 * Holds a PostgreSQL FOR SHARE row lock on the default-stopped kill switch
 * WHILE the separate, RLS-protected synthetic memory preview runs. The
 * administrator's stop update must wait for this transaction to finish.
 * Writes a redacted audit for both allowed previews and denials in that
 * transaction. Any audit/DB failure returns DENY with no metadata.
 */
const REASONS=new Set([
 'PHASE5_MEMORY_IDENTITY_DISABLED',
 'SYNTHETIC_AGENT_IDENTITY_REJECTED',
 'SYNTHETIC_MEMORY_STOPPED',
 'SYNTHETIC_MEMORY_STOP_MISSING',
 'SYNTHETIC_MEMORY_UNEXPECTED_RESPONSE',
 'SYNTHETIC_MEMORY_BACKEND_FAILURE'
]);
const OUTCOMES=new Set(['DENY','SIMULATED_MEMORY_METADATA']);
const result=(reason,audited=false)=>Object.freeze({
 decision:'DENY',reason,stagingOnly:true,actualPermissionGranted:false,
 memoryWrites:0,externalCalls:0,auditPersisted:audited
});
export function createPhase5GuardedSyntheticMemoryPreview({
  preview,coordinatorSql,enabled=false
}={}){
 if(typeof preview!=='function'||typeof coordinatorSql?.begin!=='function')
  throw Error('TRUSTED_SYNTHETIC_MEMORY_GUARD_DEPENDENCIES_REQUIRED');
 return async function guardedSyntheticMemoryRequest(input={}){
  if(!enabled)return result('PHASE5_MEMORY_IDENTITY_DISABLED');
  try{
   return await coordinatorSql.begin(async tx=>{
    // Lock held until the preview and audit insert both finish/commit.
    // The DB role has SELECT plus UPDATE only on constrained inert lock_pad.
    const stop=await tx.unsafe(
      "select scope,stopped,version from scotty_p5_synthetic_emergency_stop where scope='synthetic' for share"
    );
    let outcome='DENY',reason='SYNTHETIC_MEMORY_STOP_MISSING',payload=null;
    const version=Array.isArray(stop)&&stop.length===1&&
      stop[0].scope==='synthetic'&&
      Number.isSafeInteger(Number(stop[0].version))&&Number(stop[0].version)>0
      ? Number(stop[0].version):null;
    if(version!==null&&stop[0].stopped===true){
      reason='SYNTHETIC_MEMORY_STOPPED';
    }else if(version!==null&&stop[0].stopped===false){
      try{
        payload=await preview(input);
        if(payload?.decision==='SIMULATED_MEMORY_METADATA'&&
           payload.stagingOnly===true&&payload.actualPermissionGranted===false&&
           Array.isArray(payload.memoryIds)&&payload.memoryIds.length<=50&&
           payload.memoryIds.every(id=>typeof id==='string'&&/^SYN-MEM-[A-Z0-9-]{1,100}$/.test(id))){
          outcome='SIMULATED_MEMORY_METADATA';
          reason='SYNTHETIC_MEMORY_PREVIEW_OK';
        }else if(payload?.decision==='DENY'&&payload.actualPermissionGranted===false){
          reason=REASONS.has(payload.reason)?payload.reason:'SYNTHETIC_MEMORY_UNEXPECTED_RESPONSE';
        }else reason='SYNTHETIC_MEMORY_UNEXPECTED_RESPONSE';
      }catch{
        reason='SYNTHETIC_MEMORY_BACKEND_FAILURE';
      }
    }
    if(!OUTCOMES.has(outcome))throw Error('INVALID_OUTCOME');
    // Fixed vocabulary, never store token, request, agent ID, memory ID,
    // project, database errors, headers, or any user-provided values.
    const rows=await tx.unsafe(
      'insert into scotty_p5_synthetic_memory_request_audit(outcome,reason_code,stop_version) values($1,$2,$3)',
      [outcome,reason,version]
    );
    if(!rows||rows.count!==1)throw Error('UNCONFIRMED_AUDIT_INSERT');
    if(outcome==='SIMULATED_MEMORY_METADATA'){
      // Return a strict allowlist. Never spread arbitrary untrusted fields:
      // the preview callback might accidentally include secrets or content.
      return Object.freeze({
        decision:'SIMULATED_MEMORY_METADATA',actualPermissionGranted:false,
        stagingOnly:true,memoryIds:Object.freeze([...payload.memoryIds]),
        memoryWrites:0,externalCalls:0,
        auditPersisted:true,emergencyStopChecked:true
      });
    }
    return result(reason,true);
   });
  }catch{
   // A failed audit transaction always denies; synthetic memory IDs are
   // never returned on this path. No claim of audit durability is made.
   return result('SYNTHETIC_MEMORY_BACKEND_FAILURE',false);
  }
 };
}
