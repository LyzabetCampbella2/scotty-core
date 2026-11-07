/**
 * Activepieces Code action — present a validated, inert review packet.
 *
 * Input: proposal = output from "SCOTTY — Suggest Team" (Step 4).
 * This action NEVER grants permission. Only a trusted SCOTTY backend owner
 * session can authorize real tasks after a separate, explicit request.
 */
export const code = async (inputs) => {
  const raw = inputs?.proposal;
  const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!p || p.status !== 'PENDING_OWNER_APPROVAL' ||
      p.mode !== 'ROUTING_PREVIEW_ONLY' ||
      p.ownerApprovalRequired !== true ||
      p.started !== false || p.liveRosterVerified !== false ||
      p.aiCalls !== 0 || p.memoryWrites !== 0 ||
      p.missionsCreated !== 0 || p.externalActions !== 0 ||
      !Array.isArray(p.proposedTeams) ||
      p.proposedTeams.length < 1 || p.proposedTeams.length > 2) {
    throw new Error('INVALID_OR_UNSAFE_ROUTING_PROPOSAL');
  }
  const selected = [];
  const seen = new Set();
  for (const item of p.proposedTeams) {
    if (!item || typeof item.agentId !== 'string' ||
        typeof item.chiefId !== 'string' ||
        typeof item.name !== 'string' ||
        typeof item.chiefName !== 'string' ||
        item.status !== 'suggested-only' || seen.has(item.chiefId)) {
      throw new Error('INVALID_PROPOSED_TEAM');
    }
    seen.add(item.chiefId);
    selected.push({
      agentId:item.agentId, specialist:item.name, chief:item.chiefName,
      chiefId:item.chiefId, specialty:String(item.specialty||'').slice(0,140)
    });
  }
  const description = [
    'SCOTTY — REVIEW ONLY (NO REAL MISSION)',
    'Fictional task: ' + String(p.task||'').slice(0,500),
    ...selected.map((x,i)=>`${i+1}. ${x.specialist} (${x.agentId}), chief ${x.chief} (${x.chiefId})`),
    'Approve or Reject this DEMONSTRATION proposal only.',
    'Approving this demonstration DOES NOT assign agents, grant backend permissions, run AI or change memory.'
  ].join('\n');
  return {type:'SCOTTY_INERT_REVIEW_PACKET',description,
    proposedTeams:selected,overseer:'SCOTTY',approvalRequested:true,
    approvalRecorded:false,backendAuthorization:false,
    canExecute:false,missionsStarted:0,aiCalls:0,memoryWrites:0};
};
