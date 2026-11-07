/**
 * Proposed SCOTTY backend contract for future Activepieces mission requests.
 *
 * This PURE function cannot authorize, persist, enqueue, or execute a mission.
 * It is not routed from the Worker and never reads production accounts.
 * All "trusted" objects MUST be fetched server-side from SCOTTY's own protected
 * session/grant/project store. NEVER accept ownerSession/grant/project from an
 * Activepieces flow payload or HTTP header.
 */
const ident=/^[a-z0-9][a-z0-9_-]{3,79}$/i;
const digest=/^[a-f0-9]{64}$/;
const unique=(xs)=>Array.isArray(xs)&&xs.length>0&&xs.length<=8&&new Set(xs).size===xs.length&&xs.every(x=>typeof x==='string'&&ident.test(x));
const deny=(reason)=>({status:'BLOCKED',reason,backendAuthorized:false,canExecute:false,
  missionStarted:false,storeWrites:0,modelCalls:0,externalActions:0});

export function assessFutureOwnerMissionGate({proposal,serverSession,serverGrant,serverProject,now=new Date()}={}){
  const t=now instanceof Date?now.getTime():Number.NaN;
  if(!Number.isFinite(t))return deny('INVALID_CLOCK');
  if(!proposal||typeof proposal!=='object'||Array.isArray(proposal))return deny('INVALID_PROPOSAL');
  // Explicitly ignore any purported ownerApproved, jwt, account or entitlement
  // fields sent by the automation. Only serverSession can establish the owner.
  if(!serverSession || serverSession.verifiedByScotty!==true ||
     serverSession.authenticated!==true || serverSession.role!=='owner' ||
     serverSession.provenance!=='scotty-server-side-session' ||
     !ident.test(serverSession.ownerId||'') ||
     !Array.isArray(serverSession.allowedProjects))return deny('VERIFIED_OWNER_SESSION_REQUIRED');
  if(!ident.test(proposal.projectId||'')||!ident.test(proposal.missionId||'')||
     !ident.test(proposal.revision||'')||!ident.test(proposal.idempotencyKey||'')||
     !digest.test(proposal.intentDigest||'')||!unique(proposal.agentIds))
    return deny('INVALID_MISSION_IDENTITY');
  if(proposal.classification!=='public-or-synthetic'||proposal.containsPrivateData!==false||
     proposal.paidProviderRequested===true)return deny('PRIVATE_OR_PAID_WORK_DENIED');
  if(!serverSession.allowedProjects.includes(proposal.projectId))return deny('OWNER_PROJECT_PERMISSION_REQUIRED');
  if(!serverProject||serverProject.id!==proposal.projectId||
     serverProject.active!==true||!unique(serverProject.allowedAgentIds)|| 
     proposal.agentIds.some(id=>!serverProject.allowedAgentIds.includes(id)))
    return deny('PROJECT_AGENT_MEMBERSHIP_REQUIRED');
  if(!serverGrant||serverGrant.origin!=='scotty-server-audit-store'||
     serverGrant.revoked!==false||serverGrant.ownerId!==serverSession.ownerId||
     serverGrant.projectId!==proposal.projectId||serverGrant.missionId!==proposal.missionId||
     serverGrant.revision!==proposal.revision||
     serverGrant.idempotencyKey!==proposal.idempotencyKey||
     serverGrant.intentDigest!==proposal.intentDigest||
     serverGrant.scope!=='mission.preview'||
     !unique(serverGrant.approvedAgentIds)||
     serverGrant.approvedAgentIds.length!==proposal.agentIds.length||
     proposal.agentIds.some(id=>!serverGrant.approvedAgentIds.includes(id))||
     serverGrant.ownerReviewConfirmed!==true)return deny('FRESH_SCOPE_MATCHED_OWNER_REVIEW_REQUIRED');
  const expiration=Date.parse(serverGrant.expiresAt||'');
  if(!Number.isFinite(expiration)||expiration<=t||
     expiration>t+24*60*60*1000)return deny('APPROVAL_EXPIRED_OR_UNBOUNDED');
  if(serverGrant.committed===true)return deny('ALREADY_COMMITTED_REQUIRES_READBACK');
  return {
    status:'REVIEW_CONTRACT_PASSED_FOR_FUTURE_BACKEND',
    projectId:proposal.projectId,missionId:proposal.missionId,
    revision:proposal.revision,agentCount:proposal.agentIds.length,
    prerequisitesSatisfied:true,
    // A grant in the future must be minted and consumed by the protected
    // SCOTTY server in an atomic transaction with job status and audit.
    backendAuthorized:false,canExecute:false,missionStarted:false,
    storeWrites:0,modelCalls:0,externalActions:0,
    nextGate:'ATOMIC_BACKEND_COMMIT_AND_AUDIT_NOT_IMPLEMENTED',
    note:'Pure security contract only. Activepieces approval or a request boolean cannot authorize execution.'
  };
}
