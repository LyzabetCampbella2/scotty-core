/**
 * Phase 5 versioned consent storage acceptance: disposable PostgreSQL ONLY.
 * No real signed owner consent, production data, agent, memory, or live API.
 * The SQL state row is locked throughout signature/roster validation and the
 * redacted review audit insert; revocation updates therefore serialize.
 */
import {createPhase5SyntheticConsentReview} from './phase5-object-consent-review.mjs';

const CONSENT=/^SYN-CONSENT-[A-Z0-9-]{3,100}$/;
const RESOURCE=/^SYN-MEM-[A-Z0-9-]{1,100}$/;
const SCOPES=new Set(['departmental','shared']);
const fallback=(reason='SYNTHETIC_CONSENT_STORAGE_UNAVAILABLE',auditPersisted=false)=>Object.freeze({
 decision:'DENY',reason,stagingOnly:true,actualPermissionGranted:false,
 realOwnerApprovalVerified:false,canRead:false,canWrite:false,canExecute:false,
 memoryRowsReturned:0,auditPersisted
});

function toTrustedRecord(row){
 if(!row||typeof row!=='object')return null;
 return {
  grantId:row.grant_id,issuer:row.issuer,keyId:row.key_id,
  actorId:row.actor_id,memoryOwnerId:row.memory_owner_id,projectId:row.project_id,
  scope:row.scope,resourceId:row.resource_id,revision:Number(row.revision),
  issuedAt:Number(row.issued_at),expiresAt:Number(row.expires_at),
  status:row.status,signature:row.signature
 };
}
export function createPhase5DisposableVersionedConsentReview({
 sql,snapshot,trustedOwnerKeys,resolveVerifiedActor,
 now=()=>Date.now(),enabled=false
}={}){
 if(typeof sql?.begin!=='function'||typeof resolveVerifiedActor!=='function'||
    typeof now!=='function')
   throw Error('SYNTHETIC_VERSIONED_CONSENT_DEPENDENCIES_REQUIRED');

 return Object.freeze({
  review:async function({session,grantId,scope,resourceId}={}){
   if(!enabled)return fallback('VERSIONED_CONSENT_DISABLED_BY_DEFAULT');
   try{
    return await sql.begin(async tx=>{
     let decision=fallback('SYNTHETIC_CONSENT_NOT_VERIFIED');
     let reason='CONSENT_NOT_VERIFIED',stateVersion=null;
     try{
      // Stop is checked AND row-locked during the entire synthetic review.
      const stop=await tx.unsafe(
       "select scope,stopped,version from scotty_p5_synthetic_emergency_stop where scope='synthetic' for share");
      if(!Array.isArray(stop)||stop.length!==1||stop[0].scope!=='synthetic'||
         stop[0].stopped!==false||!Number.isSafeInteger(Number(stop[0].version)))
       reason='SYNTHETIC_EMERGENCY_STOPPED';
      else if(!CONSENT.test(grantId)||!SCOPES.has(scope)||!RESOURCE.test(resourceId))
       reason='CONSENT_NOT_VERIFIED';
      else {
       const actor=await resolveVerifiedActor(session);
       if(!actor||actor.verifiedByServer!==true||
          typeof actor.agentId!=='string'||typeof actor.projectId!=='string')
         throw Error('UNVERIFIED_SYNTHETIC_ACTOR');
       const state=await tx.unsafe(
        'select grant_id,current_revision,state_version,revoked from scotty_p5_synthetic_consent_state where grant_id=$1 for share',
        [grantId]);
       if(!Array.isArray(state)||state.length!==1){
        reason='CONSENT_REVOKED_OR_MISSING';
       }else{
        stateVersion=Number(state[0].state_version);
        if(!Number.isSafeInteger(stateVersion)||stateVersion<1||
           state[0].revoked!==false){
          reason='CONSENT_REVOKED_OR_MISSING';
        }else{
         const versions=await tx.unsafe(
          'select grant_id,revision,issuer,key_id,actor_id,memory_owner_id,project_id,scope,resource_id,issued_at,expires_at,status,signature from scotty_p5_synthetic_consent_versions where grant_id=$1 and revision=$2',
          [grantId,state[0].current_revision]);
         if(Array.isArray(versions)&&versions.length===1){
          const signed=toTrustedRecord(versions[0]);
          const verifier=createPhase5SyntheticConsentReview({
           snapshot,trustedOwnerKeys,now,enabled:true,
           resolveVerifiedActor:async()=>actor,
           loadTrustedConsentRecord:async()=>signed,
           resolveConsentState:async()=>({
            active:true,currentRevision:Number(state[0].current_revision)
           })
          });
          const reviewed=await verifier.review({session,grantId,scope,resourceId});
          if(reviewed.decision==='SIMULATED_CONSENT_ELIGIBLE'&&
              reviewed.actualPermissionGranted===false&&
              reviewed.canRead===false&&reviewed.canWrite===false){
           reason='SYNTHETIC_CONSENT_REVIEW_OK';
           decision=Object.freeze({
            decision:'SIMULATED_CONSENT_ELIGIBLE',
            reason:'VERSIONED_SYNTHETIC_CONSENT_REVIEW_OK',
            actualPermissionGranted:false,realOwnerApprovalVerified:false,
            stagingOnly:true,canRead:false,canWrite:false,canExecute:false,
            memoryRowsReturned:0,auditPersisted:true
           });
          }
         }
        }
       }
      }
     }catch{
      reason='CONSENT_NOT_VERIFIED';
     }
     const outcome=decision.decision==='SIMULATED_CONSENT_ELIGIBLE'
       ?'SIMULATED_ELIGIBLE':'DENY';
     const audit=await tx.unsafe(
      'insert into scotty_p5_synthetic_consent_review_events(outcome,reason_code,state_version) values ($1,$2,$3)',
      [outcome,reason,stateVersion]
     );
     if(audit?.count!==1)throw Error('AUDIT_INSERT_UNCONFIRMED');
     if(outcome==='SIMULATED_ELIGIBLE')return decision;
     return fallback(reason,true);
    });
   }catch{
    // Failed or rolled-back audit can never produce an eligible result.
    return fallback('SYNTHETIC_CONSENT_STORAGE_UNAVAILABLE',false);
   }
  }
 });
}
