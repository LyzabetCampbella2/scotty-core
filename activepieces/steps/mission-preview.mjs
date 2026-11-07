/**
 * Activepieces Code step: a proposed team -> draft mission plan.
 * NO real execution or approval is performed, even when approved=true in input.
 * Inputs:
 *  proposal = output of "SCOTTY — Suggest Team"
 *  projectLabel = PUBLIC/SYNTHETIC project label only (optional)
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
    throw new Error('UNSAFE_OR_INVALID_PLAN_INPUT');
  }
  const label=String(inputs?.projectLabel||'Synthetic test project').trim();
  if (!label || label.length > 100 || /[\u0000-\u001f\u007f]/.test(label)) {
    throw new Error('INVALID_PROJECT_LABEL');
  }
  const steps=[],chiefs=new Set();
  for (const [index,item] of p.proposedTeams.entries()){
    if (!item?.agentId || !item.chiefId || !item.name || !item.chiefName ||
        item.status !== 'suggested-only' || chiefs.has(item.chiefId)) {
      throw new Error('INVALID_PROPOSED_TEAM');
    }
    chiefs.add(item.chiefId);
    const id='preview-specialist-'+(index+1);
    steps.push({stepId:id,agentId:item.agentId,agentName:item.name,
      kind:'specialist',chiefId:item.chiefId,
      responsibility:'Prepare a scoped draft in '+String(item.specialty||'the assigned domain').slice(0,120),
      acceptance:'Provide a concrete proposed deliverable, assumptions, evidence gaps and review questions',
      dependsOn:[],status:'NOT_STARTED'});
    steps.push({stepId:'preview-chief-'+(index+1),agentId:item.chiefId,
      agentName:item.chiefName,kind:'chief-review',
      responsibility:'Review the specialist draft for omissions, uncertainty and requested outcome',
      acceptance:'Chief produces an actionable review, corrections and unresolved concerns',
      dependsOn:[id],status:'NOT_STARTED'});
  }
  steps.push({stepId:'preview-scotty-synthesis',agentId:'scotty',agentName:'SCOTTY',
    kind:'central-review',responsibility:'Combine chief-reviewed findings and request final owner sign-off',
    acceptance:'Synthesis includes delivered work, disagreements and any open evidence gaps',
    dependsOn:steps.filter(s=>s.kind==='chief-review').map(s=>s.stepId),
    status:'NOT_STARTED'});
  return {type:'SCOTTY_MISSION_PLAN_PREVIEW',status:'PENDING_OWNER_APPROVAL',
    projectLabel:label,task:String(p.task||'').slice(0,500),stepCount:steps.length,
    steps,requirements:{ownerApprovalBeforeStart:true,
      projectMembershipCheckRequired:true,
      perAgentMemoryScopesRequired:true,
      providerCostApprovalRequired:true,
      reviewOrder:['specialist','chief','SCOTTY','owner']},
    draftedOnly:true,executed:false,durablySaved:false,backendAuthorized:false,
    externalActions:0,aiCalls:0,memoryWrites:0,
    note:'Inert plan only. No real mission ID, owner authorization, AI, storage or integrations.'};
};
