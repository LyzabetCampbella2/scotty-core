/**
 * Stage A0: pure, fail-closed owner approval evaluator.
 * NOT a live authorization service. Caller MUST authenticate owner/session,
 * load grants from trusted storage, acquire a transactional usage/idempotency
 * claim, record audit evidence, and enforce controls at execution boundary.
 */
export const ACTIONS = Object.freeze([
  'plan-draft', 'read-public', 'read-restricted', 'write-file',
  'send-message', 'publish-public', 'deploy-change',
  'spend-money', 'manage-credentials'
]);
export const DATA_CLASSES = Object.freeze([
  'SYNTHETIC_PUBLIC', 'OWNER_PRIVATE',
  'PROJECT_CONFIDENTIAL', 'THIRD_PARTY_RESTRICTED'
]);
const MUTATIONS = new Set(['write-file', 'send-message', 'publish-public', 'deploy-change', 'spend-money', 'manage-credentials']);
const HIGH_RISK = new Set(['send-message', 'publish-public', 'deploy-change', 'spend-money', 'manage-credentials']);
const PAID = new Set(['spend-money', 'manage-credentials']);
const EXACT_FIELDS = ['agentId', 'taskId', 'projectId', 'action', 'resourceId', 'accountId', 'channelId', 'revision', 'dataClass', 'toolId'];
const MAX_GRANT_LIFETIME_MS = 24 * 60 * 60 * 1000;

const goodId = (value) => typeof value === 'string' && value.length > 0 && value.trim() === value && value !== '*' && value.length <= 256;
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const money = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const dateMs = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) return NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : NaN;
};

/**
 * @returns {{permitted:boolean, reason:string, requiresAtomicClaim:boolean}}
 * This result is provisional, not a capability token or execution receipt.
 */
export function evaluateApprovalGate(request, grant, controls) {
  const deny = (reason) => ({permitted:false, reason, requiresAtomicClaim:false});
  if (!request || !grant || !controls || typeof request !== 'object' || typeof grant !== 'object' || typeof controls !== 'object') return deny('missing-input');
  if (controls.stopAll !== false) return deny('emergency-stop-or-unconfigured');
  if (controls.enabled !== true || controls.grantLedgerAvailable !== true || controls.auditAvailable !== true) return deny('enforcement-unavailable');
  if (!['development','staging','production'].includes(controls.environment)) return deny('unknown-environment');
  if (controls.environment === 'production' && controls.productionReleaseApproved !== true) return deny('production-not-approved');
  if (!ACTIONS.includes(request.action) || !DATA_CLASSES.includes(request.dataClass)) return deny('invalid-action-or-data-class');
  if (grant.status !== 'approved' || grant.ownerApproved !== true || !goodId(grant.grantId) || !goodId(grant.ownerId)) return deny('not-owner-approved');
  for (const field of EXACT_FIELDS) {
    if (typeof request[field] !== 'string' || typeof grant[field] !== 'string' || request[field] !== grant[field]) return deny('scope-mismatch:' + field);
    if (field === 'agentId' || field === 'taskId' || field === 'projectId' || field === 'action' || field === 'resourceId' || field === 'revision' || field === 'toolId') {
      if (!goodId(request[field])) return deny('invalid-scope:' + field);
    } else if ((request[field].includes('*') || request[field].trim() !== request[field])) return deny('wildcard-scope:' + field);
  }
  if (grant.revokedAt !== null && grant.revokedAt !== undefined) return deny('revoked');
  const now = dateMs(controls.now), issued = dateMs(grant.issuedAt), expiry = dateMs(grant.expiresAt);
  if (![now,issued,expiry].every(Number.isFinite)) return deny('invalid-time');
  if (issued > now || now >= expiry || expiry <= issued || expiry - issued > MAX_GRANT_LIFETIME_MS) return deny('expired-or-invalid-grant');
  if (!count(grant.maxUses) || grant.maxUses === 0 || !count(grant.usedCount) || grant.usedCount >= grant.maxUses) return deny('grant-exhausted');
  if (!count(controls.retryCount) || !count(controls.maxRetries) || controls.retryCount > controls.maxRetries) return deny('retry-budget-denied');
  if (!count(controls.activeRuns) || !count(controls.maxConcurrent) || controls.maxConcurrent === 0 || controls.activeRuns >= controls.maxConcurrent) return deny('concurrency-budget-denied');
  if (MUTATIONS.has(request.action) && (!goodId(request.idempotencyKey) || !goodId(grant.idempotencyKey) || request.idempotencyKey !== grant.idempotencyKey)) return deny('missing-idempotency-claim');
  if (HIGH_RISK.has(request.action) && (!goodId(request.accountId) || !goodId(request.channelId))) return deny('missing-account-or-channel');
  if (PAID.has(request.action) && controls.paidActionsEnabled !== true) return deny('paid-actions-disabled');
  if (controls.budgetApproved !== true) return deny('budget-not-owner-approved');
  for (const key of ['taskCapUsd','dailyCapUsd','taskSpentUsd','dailySpentUsd']) if (!money(controls[key])) return deny('invalid-budget:' + key);
  if (!money(request.estimatedCostUsd) || !money(grant.maxSpendUsd)) return deny('invalid-cost');
  if (request.estimatedCostUsd > grant.maxSpendUsd ||
      controls.taskSpentUsd + request.estimatedCostUsd > controls.taskCapUsd ||
      controls.dailySpentUsd + request.estimatedCostUsd > controls.dailyCapUsd) return deny('cost-ceiling-exceeded');
  // No side effects here: grant consumption, budget reservations and idempotency
  // must be atomically acquired from a trusted database before real execution.
  return {permitted:true, reason:'provisional-match-only', requiresAtomicClaim:true};
}
