/**
 * SCOTTY Phase 5 unified SYNTHETIC agent-memory gateway.
 *
 * This is a test-only, disabled-by-default REFERENCE ENTRYPOINT, not an app
 * route and not proof of non-bypassability across a deployed application.
 * Builds the signed agent verifier + RLS-only metadata preview + stop lock
 * and durable redacted audit INSIDE one closure. No raw preview methods,
 * database clients or authorization callbacks are returned to callers.
 *
 * No SCOTTY production data, real agent IDs, live apps, secrets, actions,
 * memory content/writes, or owner grants can be reached through this module.
 */
import {createPhase5SyntheticAgentMemoryPreview} from './phase5-agent-memory-identity.mjs';
import {createPhase5GuardedSyntheticMemoryPreview} from './phase5-guarded-memory-preview.mjs';

const ACTION='synthetic-memory:preview';
const DENIED_ACTION='synthetic-memory:denied';
const ALLOWED_INPUT_KEYS=new Set(['request','action','agentId','projectId','scope']);
const defaultDeny=Object.freeze({
 decision:'DENY',reason:'PHASE5_GATEWAY_DISABLED',
 actualPermissionGranted:false,stagingOnly:true,
 auditPersisted:false,memoryWrites:0,externalCalls:0
});

export function createPhase5SyntheticMemoryGateway({
 trustedKeys,dbBindings,verifyActiveAgentMembership,isAgentSessionRevoked,
 coordinatorSql,now=()=>Date.now(),enabled=false
}={}){
 if(typeof enabled!=='boolean')throw Error('EXPLICIT_GATEWAY_ENABLE_FLAG_REQUIRED');
 if(typeof coordinatorSql?.begin!=='function')
   throw Error('TRUSTED_SYNTHETIC_GATEWAY_COORDINATOR_REQUIRED');
 // The two lower-level factories are private to this construction path.
 const preview=createPhase5SyntheticAgentMemoryPreview({
   trustedKeys,dbBindings,verifyActiveAgentMembership,isAgentSessionRevoked,
   now,enabled
 });
 const guarded=createPhase5GuardedSyntheticMemoryPreview({
   preview,coordinatorSql,enabled
 });

 return Object.freeze({
   execute:async function executeSyntheticMemoryRequest(input={}){
     if(!enabled)return defaultDeny;
     // No user-provided callback, raw DB handle, debug authorization flag,
     // credential or other arbitrary property may become gateway authority.
     // Unsupported requests still pass THROUGH the guarded denial/audit path.
     let safe;
     try{
       if(!input||typeof input!=='object'||Array.isArray(input))throw Error('INVALID_INPUT');
       const keys=Object.keys(input);
       if(keys.some(key=>!ALLOWED_INPUT_KEYS.has(key)))throw Error('UNSUPPORTED_INPUT');
       safe={
         request:input.request,
         action:input.action===ACTION?ACTION:DENIED_ACTION,
         agentId:input.agentId,projectId:input.projectId,scope:input.scope
       };
     }catch{
       safe={action:DENIED_ACTION};
     }
     return guarded(safe);
   }
 });
}
