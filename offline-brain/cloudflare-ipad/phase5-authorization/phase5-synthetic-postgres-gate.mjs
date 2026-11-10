/**
 * Phase 5 transactional PostgreSQL reference. Unconnected and disabled by default.
 * No route imports this module; no production, memory, publishing or AI access.
 */
import {createOwnerWorkspaceContextFactory,rejectUnsafeWorkspaceRequest} from '../workspace-owner-auth-boundary.mjs';

const PROJECT=/^[A-Za-z0-9_-]{1,100}$/;
const RESOURCE=/^SYN-[A-Z0-9-]{1,100}$/;
const GRANT=/^SYN-GRANT-[A-Z0-9-]{1,100}$/;
const NONCE=/^SYN-NONCE-[A-Z0-9-]{6,80}$/;
const ACTIONS=new Set(['workspace:read','knowledge:propose']);
const deny=reason=>Object.freeze({decision:'DENY',reason,actualPermissionGranted:false,stagingOnly:true});
const preview=()=>Object.freeze({decision:'SIMULATED_ELIGIBLE',reason:'NO_REAL_ACCESS',actualPermissionGranted:false,stagingOnly:true});

// sql is a supplied isolated staging Postgres.js client; never inject production.
// No migrations are run and no connection is opened by this module.
export function createPhase5SyntheticPostgresGate({sql,verifyOwnerSession,
  loadAuthorizedProjectIds,newId,verifyGrantProof,resolveTrustedOwnerContext,
  now=()=>Date.now(),enabled=false,requireEmergencyStop=false}={}) {
  if(!sql||typeof sql.begin!=='function'||typeof verifyGrantProof!=='function'||
     typeof now!=='function'||
     (resolveTrustedOwnerContext!==undefined&&typeof resolveTrustedOwnerContext!=='function')||
     (resolveTrustedOwnerContext===undefined&&
       [verifyOwnerSession,loadAuthorizedProjectIds,newId].some(fn=>typeof fn!=='function')))
    throw Error('TRUSTED_DEPENDENCIES_REQUIRED');
  // New synthetic signed-session resolver binds each verified subject to its own
  // independently loaded project membership. Legacy owner-context path is retained
  // solely for older isolated mocks on stacked draft PR #72; never use for production.
  const getOwner=resolveTrustedOwnerContext||
    createOwnerWorkspaceContextFactory({verifyOwnerSession,loadAuthorizedProjectIds,newId});
  return async function checkSyntheticPreview({request,projectId,resourceProjectId,
    resourceId,action,grantId,nonce,dataClass}={}) {
    if(!enabled)return deny('PHASE5_DISABLED_BY_DEFAULT');
    try{rejectUnsafeWorkspaceRequest(request)}catch{return deny('UNSAFE_HTTP_REQUEST')}
    if(!PROJECT.test(String(projectId||''))||resourceProjectId!==projectId)return deny('PROJECT_SCOPE_MISMATCH');
    if(dataClass!=='synthetic-only'||!RESOURCE.test(String(resourceId||'')))return deny('NON_SYNTHETIC_RESOURCE');
    if(!ACTIONS.has(action))return deny('ACTION_NOT_ALLOWED');
    if(!GRANT.test(String(grantId||'')))return deny('GRANT_REFERENCE_REQUIRED');
    if(!NONCE.test(String(nonce||'')))return deny('INVALID_NONCE');
    let context;
    try{context=await getOwner(request)}catch{return deny('OWNER_AUTHENTICATION_FAILED')}
    if(context?.verifiedByServer!==true||context.subject!=='owner'||
       !context.permissions?.[projectId]?.includes(action))return deny('TRUSTED_OWNER_SCOPE_MISSING');

    // PostgreSQL FOR SHARE requires UPDATE privilege on at least one column. In disposable CI,
    // the runtime only receives UPDATE on constrained inert lock_pad, not on any approval fields.
    // A unique nonce and audit row are written in the same transaction.
    try{
      return await sql.begin(async tx=>{
        // Optional strict synthetic emergency-stop mode. Stopped is the default;
        // missing/unavailable row fails closed. Shared row lock serializes with
        // administrative stop updates so a stop cannot race a pending preview.
        if(requireEmergencyStop){
          const stopRows=await tx.unsafe(
            "select scope,stopped,version from scotty_p5_synthetic_emergency_stop where scope='synthetic' for share");
          if(!Array.isArray(stopRows)||stopRows.length!==1||
             stopRows[0].scope!=='synthetic'||stopRows[0].stopped!==false||
             !Number.isSafeInteger(Number(stopRows[0].version))||
             Number(stopRows[0].version)<1)
            return deny('EMERGENCY_STOP_ACTIVE_OR_UNAVAILABLE');
        }
        const matches=await tx.unsafe(
          'select grant_id as "id", subject, project_id as "projectId", resource_project_id as "resourceProjectId", resource_id as "resourceId", action, data_class as "dataClass", grant_version as "version", state as "status", revoked, expires_at as "expiresAt", proof_digest as "proofDigest", proof_issuer as "proofIssuer", proof_key_id as "proofKeyId", proof_signature as "proofSignature" from scotty_p5_synthetic_grants where grant_id=$1 for share',
          [grantId]);
        if(!Array.isArray(matches)||matches.length!==1)return deny('GRANT_NOT_FOUND');
        const g=matches[0];
        const expiry=g.expiresAt instanceof Date?g.expiresAt.getTime():Date.parse(String(g.expiresAt||''));
        if(g.id!==grantId||g.subject!=='owner'||g.projectId!==projectId||
           g.resourceProjectId!==resourceProjectId||g.resourceId!==resourceId||
           g.action!==action||g.dataClass!=='synthetic-only'||g.version!==1||
           g.status!=='synthetic-approved'||g.revoked!==false||
           !Number.isFinite(expiry)||expiry<=now())return deny('GRANT_INVALID_OR_REVOKED');
        try{if(await verifyGrantProof(g)!==true)return deny('GRANT_PROOF_UNVERIFIED')}
        catch{return deny('GRANT_PROOF_UNVERIFIED')}
        const claimed=await tx.unsafe(
          'insert into scotty_p5_synthetic_nonce_claims(grant_id,nonce) values($1,$2) on conflict do nothing returning nonce',
          [grantId,nonce]);
        if(!Array.isArray(claimed)||claimed.length!==1)return deny('NONCE_REPLAY_OR_STORE_FAILURE');
        const audit=await tx.unsafe(
          "insert into scotty_p5_synthetic_audit(project_id,resource_id,action,outcome,reason) values($1,$2,$3,'SIMULATED_ELIGIBLE','NO_REAL_ACCESS') returning event_id",
          [projectId,resourceId,action]);
        if(!Array.isArray(audit)||audit.length!==1)throw Error('AUDIT_UNAVAILABLE');
        return preview();
      });
    }catch{return deny('TRANSACTION_OR_AUDIT_UNAVAILABLE')}
  };
}
