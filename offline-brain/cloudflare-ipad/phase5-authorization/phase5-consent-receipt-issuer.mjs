/**
 * SCOTTY Phase 5 — synthetic consent receipt issuer (NOT a live owner service).
 * Runs only when explicitly enabled against disposable PostgreSQL test database.
 * Privileged receipt rows are inserted ONLY after independently verified:
 * (1) signed/revocable owner session and project membership;
 * (2) key-to-owner/project assignment from server-managed test trust;
 * (3) actor roster membership and signed, scoped, unrevoked grant revision.
 * The transaction holds emergency-stop and consent-state row locks, and
 * commits a sanitized audit alongside the receipt. No real rights are granted.
 */
import {createPhase5SyntheticConsentReview} from './phase5-object-consent-review.mjs';

const GRANT=/^SYN-CONSENT-[A-Z0-9-]{3,100}$/;
const RESOURCE=/^SYN-MEM-[A-Z0-9-]{1,100}$/;
const PROJECT=/^SYN-PROJECT-[A-Z0-9-]{1,80}$/;
const SIGNER=/^SYN-CONSENT-KEY-[A-Z0-9-]{1,80}$/;
const SCOPE=new Set(['departmental','shared']);
const deny=(reason,auditPersisted=false)=>Object.freeze({
 decision:'DENY',reason,stagingOnly:true,actualPermissionGranted:false,
 realOwnerApprovalVerified:false,receiptRecorded:false,
 canRead:false,canWrite:false,canExecute:false,
 auditPersisted,memoryRowsReturned:0
});
function recordFromDb(r){
 if(!r||typeof r!=='object')return null;
 return {
  grantId:r.grant_id,revision:Number(r.revision),
  issuer:r.issuer,keyId:r.key_id,actorId:r.actor_id,
  memoryOwnerId:r.memory_owner_id,projectId:r.project_id,
  scope:r.scope,resourceId:r.resource_id,
  issuedAt:Number(r.issued_at),expiresAt:Number(r.expires_at),
  status:r.status,signature:r.signature
 };
}
export function createPhase5SyntheticConsentReceiptIssuer({
 sql,snapshot,trustedOwnerKeys,resolveSignedOwnerSession,
 loadOwnerSigningKeyAssignment,verifyActiveAgentMembership,
 now=()=>Date.now(),enabled=false
}={}){
 if(typeof sql?.begin!=='function'||typeof resolveSignedOwnerSession!=='function'||
    typeof loadOwnerSigningKeyAssignment!=='function'||
    typeof verifyActiveAgentMembership!=='function'||typeof now!=='function'||
    !trustedOwnerKeys||typeof trustedOwnerKeys!=='object')
   throw Error('TRUSTED_SYNTHETIC_ISSUER_DEPENDENCIES_REQUIRED');

 return Object.freeze({
  issue:async function({ownerRequest,grantId,scope,resourceId}={}){
   if(!enabled)return deny('SYNTHETIC_ISSUER_DISABLED');
   try{
    return await sql.begin(async tx=>{
     let ok=false,reason='CONSENT_NOT_VERIFIED',version=null,consent=null;
     try{
      const stop=await tx.unsafe(
       "select scope,stopped,version from scotty_p5_synthetic_emergency_stop where scope='synthetic' for share");
      if(!Array.isArray(stop)||stop.length!==1||stop[0].scope!=='synthetic'||
         stop[0].stopped!==false||!Number.isSafeInteger(Number(stop[0].version))||
         Number(stop[0].version)<1){
       reason='SYNTHETIC_EMERGENCY_STOPPED';
      }else if(!GRANT.test(grantId)||!SCOPE.has(scope)||!RESOURCE.test(resourceId)){
       reason='CONSENT_NOT_VERIFIED';
      }else{
       const owner=await resolveSignedOwnerSession(ownerRequest);
       if(!owner||owner.verifiedByServer!==true||
          owner.stagingOnly!==true||
          typeof owner.principalId!=='string'||
          !Array.isArray(owner.authorizedProjectIds)||
          owner.authorizedProjectIds.length===0)
        throw Error('UNVERIFIED_OWNER');
       const states=await tx.unsafe(
        'select grant_id,current_revision,state_version,revoked from scotty_p5_synthetic_consent_state where grant_id=$1 for share',
        [grantId]);
       if(!Array.isArray(states)||states.length!==1||states[0].revoked!==false||
          !Number.isSafeInteger(Number(states[0].current_revision))||
          !Number.isSafeInteger(Number(states[0].state_version))){
        reason='CONSENT_REVOKED_OR_MISSING';
       }else{
        version=Number(states[0].state_version);
        const rows=await tx.unsafe(
         'select grant_id,revision,issuer,key_id,actor_id,memory_owner_id,project_id,scope,resource_id,issued_at,expires_at,status,signature from scotty_p5_synthetic_consent_versions where grant_id=$1 and revision=$2',
         [grantId,states[0].current_revision]);
        if(!Array.isArray(rows)||rows.length!==1)throw Error('VERSION_UNAVAILABLE');
        consent=recordFromDb(rows[0]);
        if(!consent||!PROJECT.test(consent.projectId)||
           consent.grantId!==grantId||consent.scope!==scope||
           consent.resourceId!==resourceId||
           !owner.authorizedProjectIds.includes(consent.projectId)||
           !SIGNER.test(consent.keyId))
         throw Error('OWNER_PROJECT_SCOPE_MISMATCH');
        // Independent owner->signing-key assignment must match the signed
        // version's exact key. The grant record does not confer key ownership.
        const assigned=await loadOwnerSigningKeyAssignment({
         ownerPrincipalId:owner.principalId,projectId:consent.projectId
        });
        if(!assigned||assigned.active!==true||
           assigned.projectId!==consent.projectId||
           assigned.keyId!==consent.keyId)
         throw Error('SIGNER_NOT_ASSIGNED_TO_THIS_OWNER_PROJECT');
        if(await verifyActiveAgentMembership({
         agentId:consent.actorId,projectId:consent.projectId
        })!==true)
         throw Error('AGENT_NOT_ACTIVE_IN_PROJECT');
        const review=createPhase5SyntheticConsentReview({
         snapshot,trustedOwnerKeys,enabled:true,now,
         resolveVerifiedActor:async()=>({
          verifiedByServer:true,agentId:consent.actorId,projectId:consent.projectId
         }),
         loadTrustedConsentRecord:async()=>consent,
         resolveConsentState:async()=>({
          active:true,currentRevision:Number(states[0].current_revision)
         })
        });
        const validation=await review.review({
         session:null,grantId,scope,resourceId
        });
        if(validation.decision!=='SIMULATED_CONSENT_ELIGIBLE'||
           validation.actualPermissionGranted!==false||
           validation.canRead!==false)
         throw Error('CRYPTOGRAPHIC_OR_ROSTER_REVIEW_FAILED');
        // This is the ONLY place a review receipt is created. SQL role has
        // INSERT on receipts but no ability to update grant state or history.
        // Duplicate receipts raise a unique constraint -> entire tx rolls back.
        const inserted=await tx.unsafe(
         'insert into scotty_p5_synthetic_verified_consent_receipts(grant_id,revision,test_verified) values($1,$2,true)',
         [grantId,consent.revision]);
        if(inserted?.count!==1)throw Error('RECEIPT_INSERT_NOT_CONFIRMED');
        ok=true;reason='SYNTHETIC_CONSENT_REVIEW_OK';
       }
      }
     }catch{
      ok=false;
      // Any failure AFTER a receipt write must roll the transaction back.
      // Therefore receipt insertion is the final step of the review block.
      reason='CONSENT_NOT_VERIFIED';
     }
     const audit=await tx.unsafe(
      'insert into scotty_p5_synthetic_consent_review_events(outcome,reason_code,state_version) values($1,$2,$3)',
      [ok?'SIMULATED_ELIGIBLE':'DENY',reason,version]);
     if(audit?.count!==1)throw Error('REDACTED_AUDIT_NOT_COMMITTED');
     if(!ok)return deny(reason,true);
     return Object.freeze({
      decision:'SIMULATED_RECEIPT_RECORDED',stagingOnly:true,
      actualPermissionGranted:false,realOwnerApprovalVerified:false,
      receiptRecorded:true,auditPersisted:true,canRead:false,canWrite:false,
      canExecute:false,memoryRowsReturned:0
     });
    });
   }catch{
    return deny('SYNTHETIC_RECEIPT_BACKEND_UNAVAILABLE',false);
   }
  }
 });
}
