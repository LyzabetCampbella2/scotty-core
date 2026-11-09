/**
 * Phase 5 staging-only policy adapter.
 * No runtime route imports this module. Do not deploy or use to authorize real data.
 * composeOwnerContext MUST be backed by a trusted server owner-session verifier.
 * readGrant, verifyGrantProof and claimNonceAtomic are deliberately injected:
 * this module contains no provider auth, DB connections, secrets, or token minting.
 */
import { createOwnerWorkspaceContextFactory, rejectUnsafeWorkspaceRequest } from '../workspace-owner-auth-boundary.mjs';

const PROJECT = /^[A-Za-z0-9_-]{1,100}$/;
const SYN_RESOURCE = /^SYN-[A-Z0-9-]{1,100}$/;
const NONCE = /^SYN-NONCE-[A-Z0-9-]{6,80}$/;
const SAFE_ACTIONS = new Set(['workspace:read', 'knowledge:propose']);

export function createPhase5StagingGate({
  verifyOwnerSession, loadAuthorizedProjectIds, newId,
  readGrant, verifyGrantProof, claimNonceAtomic, recordAudit,
  now = () => Date.now(), enabled = false,
} = {}) {
  if ([verifyOwnerSession, loadAuthorizedProjectIds, newId, readGrant,
       verifyGrantProof, claimNonceAtomic, recordAudit, now].some(fn => typeof fn !== 'function')) {
    throw new Error('TRUSTED_DEPENDENCIES_REQUIRED');
  }
  const ownerContext = createOwnerWorkspaceContextFactory({
    verifyOwnerSession, loadAuthorizedProjectIds, newId,
  });
  const decision = (kind, reason) => Object.freeze({
    decision: kind, reason, actualPermissionGranted: false,
    stagingOnly: true, externalCalls: 0, memoryWrites: 0,
  });
  return async function previewAuthorization({ request, projectId, resourceProjectId,
    resourceId, action, grantId, nonce, dataClass } = {}) {
    // Never accept client-supplied role, permissions, owner ID, or proof flags.
    const audit = async (outcome, reason) => {
      try {
        const receipt = await recordAudit(Object.freeze({
          event: 'phase5-synthetic-authorization', outcome, reason,
          projectId: typeof projectId === 'string' ? projectId : null,
          resourceId: typeof resourceId === 'string' ? resourceId : null,
          action: typeof action === 'string' ? action : null,
        }));
        return receipt === true;
      } catch { return false; }
    };
    const deny = async reason => { await audit('DENY', reason); return decision('DENY', reason); };
    if (!enabled) return deny('PHASE5_DISABLED_BY_DEFAULT');
    if (!request) return deny('REQUEST_REQUIRED');
    try { rejectUnsafeWorkspaceRequest(request); }
    catch { return deny('UNSAFE_HTTP_REQUEST'); }
    if (!PROJECT.test(String(projectId || '')) || projectId !== resourceProjectId) return deny('PROJECT_SCOPE_MISMATCH');
    if (dataClass !== 'synthetic-only' || !SYN_RESOURCE.test(String(resourceId || ''))) return deny('NON_SYNTHETIC_RESOURCE');
    if (!SAFE_ACTIONS.has(action)) return deny('ACTION_NOT_ALLOWED');
    if (!NONCE.test(String(nonce || ''))) return deny('INVALID_NONCE');
    if (typeof grantId !== 'string' || !grantId.startsWith('SYN-GRANT-')) return deny('GRANT_REFERENCE_REQUIRED');
    let context;
    try { context = await ownerContext(request); }
    catch { return deny('OWNER_AUTHENTICATION_FAILED'); }
    if (!context?.verifiedByServer || context.subject !== 'owner' ||
        !context.permissions?.[projectId]?.includes(action)) return deny('TRUSTED_OWNER_SCOPE_MISSING');
    let grant;
    try { grant = await readGrant(grantId); }
    catch { return deny('GRANT_LOOKUP_FAILED'); }
    if (!grant || grant.id !== grantId || grant.subject !== 'owner' ||
        grant.projectId !== projectId || grant.resourceProjectId !== resourceProjectId ||
        grant.resourceId !== resourceId || grant.action !== action ||
        grant.dataClass !== 'synthetic-only' || grant.version !== 1 ||
        grant.status !== 'synthetic-approved' || grant.revoked !== false ||
        !Number.isFinite(grant.expiresAt) || grant.expiresAt <= now()) return deny('GRANT_INVALID_OR_REVOKED');
    try { if (await verifyGrantProof(grant) !== true) return deny('GRANT_PROOF_UNVERIFIED'); }
    catch { return deny('GRANT_PROOF_UNVERIFIED'); }
    try {
      // Contract: this must be a durable, atomic uniqueness operation in any later backend.
      // The in-memory test implementation is NOT safe for multi-instance production use.
      const claimed = await claimNonceAtomic(`${grant.id}:${nonce}`, grant.expiresAt);
      if (claimed !== true) return deny('REPLAY_OR_NONCE_STORE_FAILURE');
    } catch { return deny('REPLAY_OR_NONCE_STORE_FAILURE'); }
    if (!(await audit('SIMULATED_ELIGIBLE', 'NO_REAL_ACCESS'))) return decision('DENY', 'AUDIT_UNAVAILABLE');
    return decision('SIMULATED_ELIGIBLE', 'NO_REAL_ACCESS');
  };
}
