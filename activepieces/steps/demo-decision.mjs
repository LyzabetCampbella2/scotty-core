/**
 * Activepieces Code step: capture a human DEMO decision without granting
 * SCOTTY backend permissions. Cannot authorize mission execution.
 * Inputs: reviewPacket=output of SCOTTY Prepare Review,
 *         decision=manual 'approve' or 'reject' (never auto-default to approval)
 */
export const code = async (inputs) => {
  const raw=inputs?.reviewPacket;
  const p=typeof raw==='string'?JSON.parse(raw):raw;
  if (!p || p.type!=='SCOTTY_INERT_REVIEW_PACKET' ||
      p.approvalRecorded!==false || p.backendAuthorization!==false ||
      p.canExecute!==false || p.missionsStarted!==0 ||
      p.aiCalls!==0 || p.memoryWrites!==0 ||
      !Array.isArray(p.proposedTeams) || p.proposedTeams.length<1 ||
      p.proposedTeams.length>2) {
    throw new Error('UNSAFE_REVIEW_PACKET');
  }
  const decision=typeof inputs?.decision==='string'
    ? inputs.decision.trim().toLowerCase():'';
  if(!['approve','reject'].includes(decision)){
    return {type:'SCOTTY_DEMO_DECISION',status:'AWAITING_OWNER_DECISION',
      acceptedForDemo:false,backendAuthorized:false,canExecute:false,
      missionsStarted:0,externalActions:0,memoryWrites:0};
  }
  return {type:'SCOTTY_DEMO_DECISION',
    status:decision==='approve'?'DEMO_APPROVED_ONLY':'DEMO_REJECTED',
    acceptedForDemo:decision==='approve',
    backendAuthorized:false,canExecute:false,missionsStarted:0,
    externalActions:0,aiCalls:0,memoryWrites:0,
    statement:decision==='approve'
      ? 'Demo approval recorded in this step output only; no SCOTTY backend authority or durable audit.'
      : 'Demo rejected; no SCOTTY actions allowed.'};
};
