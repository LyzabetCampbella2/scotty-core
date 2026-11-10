/**
 * Phase 5 — synthetic departmental/shared-memory owner consent review ONLY.
 * This module never grants access, reads memory, signs approvals, executes jobs,
 * or connects to live services. Default disabled. All injected callbacks in CI
 * are fictional fixtures; real identity/consent sources are NOT implemented.
 */
import {createPublicKey,verify as cryptoVerify} from 'node:crypto';
import {createPhase5RosterMemoryPolicyReview} from './phase5-roster-memory-policy-review.mjs';

const DOMAIN='SCOTTY-P5-SYNTHETIC-OBJECT-CONSENT-v1';
const ISSUER='scotty-p5-synthetic-owner-consent';
const GRANT=/^SYN-CONSENT-[A-Z0-9-]{3,100}$/;
const KEY=/^SYN-CONSENT-KEY-[A-Z0-9-]{1,80}$/;
const PROJECT=/^SYN-PROJECT-[A-Z0-9-]{1,80}$/;
const RESOURCE=/^SYN-MEM-[A-Z0-9-]{1,100}$/;
const SCOPES=new Set(['departmental','shared']);
const CLAIMS=['grantId','issuer','keyId','actorId','memoryOwnerId','projectId',
 'scope','resourceId','revision','issuedAt','expiresAt','status'];
const OUTER=[...CLAIMS,'signature'];
const deny=reason=>Object.freeze({
 decision:'DENY',reason,actualPermissionGranted:false,stagingOnly:true,
 realOwnerApprovalVerified:false,canRead:false,canWrite:false,
 canExecute:false,auditPersisted:false,memoryRowsReturned:0
});
const exact=(obj,fields)=>Object.keys(obj).sort().join(',')===fields.slice().sort().join(',');
function checkGrant(grant,withSignature=false){
 if(!grant||typeof grant!=='object'||Array.isArray(grant)||
  !exact(grant,withSignature?OUTER:CLAIMS)||
  !GRANT.test(grant.grantId)||grant.issuer!==ISSUER||
  !KEY.test(grant.keyId)||typeof grant.actorId!=='string'||
  typeof grant.memoryOwnerId!=='string'||!PROJECT.test(grant.projectId)||
  !SCOPES.has(grant.scope)||!RESOURCE.test(grant.resourceId)||
  !Number.isSafeInteger(grant.revision)||grant.revision<1||grant.revision>100000||
  !Number.isSafeInteger(grant.issuedAt)||!Number.isSafeInteger(grant.expiresAt)||
  grant.expiresAt<=grant.issuedAt||grant.expiresAt-grant.issuedAt>86_400_000||
  grant.status!=='synthetic-approved-review')
   throw Error('INVALID_SYNTHETIC_CONSENT');
}
export function canonicalPhase5SyntheticConsent(claims){
 checkGrant(claims,false);
 return Buffer.from(DOMAIN+'\n'+JSON.stringify(CLAIMS.map(field=>claims[field])),'utf8');
}
export function createPhase5SyntheticConsentReview({
 snapshot,trustedOwnerKeys,resolveVerifiedActor,loadTrustedConsentRecord,
 resolveConsentState,now=()=>Date.now(),enabled=false
}={}){
 if(!trustedOwnerKeys||typeof trustedOwnerKeys!=='object'||Array.isArray(trustedOwnerKeys)||
   [resolveVerifiedActor,loadTrustedConsentRecord,resolveConsentState,now].some(x=>typeof x!=='function'))
  throw Error('TRUSTED_SYNTHETIC_CONSENT_SERVICES_REQUIRED');
 const roster=createPhase5RosterMemoryPolicyReview(snapshot,{enabled:true});
 const keys=new Map();
 for(const [id,row] of Object.entries(trustedOwnerKeys)){
  if(!KEY.test(id)||row?.issuer!==ISSUER||row?.active!==true||
     typeof row.publicKeyPem!=='string')throw Error('INVALID_SYNTHETIC_CONSENT_TRUST_KEY');
  const pub=createPublicKey(row.publicKeyPem);
  if(pub.asymmetricKeyType!=='ed25519')throw Error('ED25519_PUBLIC_KEY_REQUIRED');
  keys.set(id,pub);
 }
 if(!keys.size)throw Error('TRUSTED_SYNTHETIC_CONSENT_SERVICES_REQUIRED');
 return Object.freeze({
  review:async function({session,grantId,scope,resourceId}={}){
   if(!enabled)return deny('CONSENT_REVIEW_DISABLED');
   try{
    if(!GRANT.test(grantId)||!SCOPES.has(scope)||!RESOURCE.test(resourceId))
     throw Error('INVALID_REQUEST');
    // Must be independently authenticated by a trusted test server, never
    // derived from request-provided role, agentId, project or Chief claims.
    const actor=await resolveVerifiedActor(session);
    if(!actor||actor.verifiedByServer!==true||
       typeof actor.agentId!=='string'||!PROJECT.test(actor.projectId))
     throw Error('UNVERIFIED_ACTOR');
    const record=await loadTrustedConsentRecord(grantId);
    checkGrant(record,true);
    if(record.grantId!==grantId||record.actorId!==actor.agentId||
       record.projectId!==actor.projectId||
       record.scope!==scope||record.resourceId!==resourceId)
     throw Error('SUBJECT_OR_OBJECT_SCOPE_MISMATCH');
    const clock=now();
    if(!Number.isSafeInteger(clock)||record.issuedAt>clock||record.expiresAt<=clock)
     throw Error('CONSENT_EXPIRED');
    const pub=keys.get(record.keyId);
    if(!pub||typeof record.signature!=='string'||
       !/^[A-Za-z0-9_-]{86}$/.test(record.signature))
     throw Error('UNTRUSTED_SIGNATURE');
    const signature=Buffer.from(record.signature,'base64url');
    if(signature.length!==64||signature.toString('base64url')!==record.signature)
     throw Error('UNTRUSTED_SIGNATURE');
    const {signature:unused,...claims}=record;
    if(!cryptoVerify(null,canonicalPhase5SyntheticConsent(claims),pub,signature))
     throw Error('UNTRUSTED_SIGNATURE');
    // Separate review-only policy checks Chief/department relationships;
    // a signature cannot turn a cross-department grant into department access.
    const relationship=roster.review({
     actorId:actor.agentId,ownerAgentId:record.memoryOwnerId,
     projectId:record.projectId,scope:record.scope
    });
    if(relationship.decision!=='REVIEW_ONLY_PENDING_APPROVAL'||
       relationship.actualPermissionGranted!==false)
     throw Error('ROSTER_RELATIONSHIP_REJECTED');
    // The independent state source is where a future implementation would
    // check revocation and current revision; a signed stale copy is insufficient.
    const state=await resolveConsentState({grantId,revision:record.revision});
    if(!state||state.active!==true||state.currentRevision!==record.revision)
     throw Error('REVOKED_OR_STALE_CONSENT');
    return Object.freeze({
     decision:'SIMULATED_CONSENT_ELIGIBLE',scope,resourceId,
     actorId:actor.agentId,reason:'SYNTHETIC_SIGNATURE_AND_STATE_VERIFIED',
     requiredProductionControls:Object.freeze([
      'real-owner-authentication','authoritative-consent-issuance',
      'durable-revocation','identity-bound-memory-RLS',
      'mandatory-emergency-stop','durable-redacted-audit'
     ]),
     actualPermissionGranted:false,stagingOnly:true,
     realOwnerApprovalVerified:false,canRead:false,canWrite:false,
     canExecute:false,auditPersisted:false,memoryRowsReturned:0
    });
   }catch{
    return deny('SYNTHETIC_CONSENT_NOT_VERIFIED');
   }
  }
 });
}
