/** Read-only, fail-closed projection of authorized mission records to agent bios.
 * Caller must supply project-filtered records from trusted server queries.
 * No database, network or autonomous agent execution occurs here.
 */
import {agentProfile} from './personalized-agent-workspaces.mjs';
const clone=x=>structuredClone(x);
function check(ctx,projectId){if(!ctx?.verifiedByServer||!ctx.subject||!ctx.permissions?.[projectId]?.includes('workspace:read'))throw Error('FORBIDDEN');}
function recordScope(row,projectId){if(row?.projectId!==projectId)throw Error('UNSCOPED_RECORD');}
export function projectMissionBioProjection({ctx,projectId,agentId,missions=[],handoffs=[],memories=[],knowledge=[]}={}){
 check(ctx,projectId);const agent=agentProfile(agentId);
 for(const group of [missions,handoffs,memories,knowledge]){if(!Array.isArray(group))throw Error('INVALID_RECORDS');for(const row of group)recordScope(row,projectId);}
 const assignments=[],questions=[],missionCards=[],collaboratorIds=new Set();
 for(const mission of missions){
  const steps=mission.spec?.steps;
  if(!Array.isArray(steps))throw Error('INVALID_MISSION_SPEC');
  const mine=steps.filter(s=>s.agentId===agentId);
  if(!mine.length)continue;
  missionCards.push({id:mission.id,goal:mission.spec.goal,status:mission.status||'unknown',revision:mission.revision||1});
  for(const s of mine){
   assignments.push({missionId:mission.id,stepId:s.id,job:s.instruction,deliverable:s.deliverable,dependsOn:clone(s.dependsOn||[]),status:mission.status||'unknown'});
   questions.push({missionId:mission.id,stepId:s.id,question:s.instruction});
  }
  for(const s of steps){if(s.agentId!==agentId)collaboratorIds.add(s.agentId);}
 }
 const authorizedHandoffs=handoffs.filter(h=>h.status==='approved'&&(h.sourceAgentId===agentId||h.recipientAgentId===agentId));
 for(const h of authorizedHandoffs)collaboratorIds.add(h.sourceAgentId===agentId?h.recipientAgentId:h.sourceAgentId);
 const visibleMemories=memories.filter(m=>m.agentId===agentId&&m.approved===true&&!m.revoked);
 const visibleKnowledge=knowledge.filter(k=>k.agentId===agentId&&k.status==='approved'&&!k.revoked);
 return {agent:clone(agent),projectId,missions:missionCards,assignments,questions,collaborators:[...collaboratorIds].sort(),handoffs:clone(authorizedHandoffs),memory:clone(visibleMemories),knowledge:clone(visibleKnowledge),pendingApprovals:missionCards.filter(m=>m.status==='awaiting_approval'),readOnly:true,source:'caller-supplied-authorized-project-records'};
}
