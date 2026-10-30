/** Owner-reviewed project team preferences. Does not grant access or execute. */
const validId=s=>typeof s==='string'&&/^[a-z0-9_-]{1,160}$/i.test(s);
export function teamPresetInput(input,projectId,members){
 if(!input||input.approved!==true||input.reviewed!==true)throw Error('OWNER_TEAM_REVIEW_REQUIRED');
 if(!validId(projectId))throw Error('INVALID_PROJECT');
 const name=String(input.name||'').trim();
 if(name.length<1||name.length>80||/[<>\r\n]/.test(name))throw Error('INVALID_TEAM_NAME');
 const ids=input.agentIds;
 if(!Array.isArray(ids)||ids.length<2||ids.length>8||new Set(ids).size!==ids.length||ids.some(x=>!validId(x)))
  throw Error('INVALID_TEAM_MEMBERS');
 const permitted=new Map((members||[]).map(x=>[x.id,x]));
 for(const id of ids){
  const agent=permitted.get(id);
  if(!agent||agent.paused===true||agent.state==='disabled')throw Error('PROJECT_MEMBERSHIP_OR_AGENT_INACTIVE');
 }
 const lead=permitted.get(input.leadChiefId);
 if(!lead||lead.isChief!==true||!ids.includes(lead.id))throw Error('APPROVED_CHIEF_REQUIRED');
 const chiefs=ids.filter(id=>permitted.get(id)?.isChief);
 for(const id of ids){
  const agent=permitted.get(id);
  if(!agent.isChief&&!chiefs.includes(agent.chiefId))throw Error('SPECIALIST_REQUIRES_OWN_CHIEF');
 }
 const revision=Number(input.expectedRevision);
 if(!Number.isInteger(revision)||revision<0)throw Error('EXPECTED_TEAM_REVISION_REQUIRED');
 return {projectId,name,agentIds:[...ids],leadChiefId:lead.id,
  expectedRevision:revision,ownerReviewed:true,automaticallyStarted:false,grantsPermissions:false};
}
export function teamPresetState(saved,members){
 const active=new Set((members||[]).filter(x=>!x.paused&&x.state!=='disabled').map(x=>x.id));
 const missing=(saved?.agentIds||[]).filter(id=>!active.has(id));
 return {name:saved.name,projectId:saved.projectId,agentIds:saved.agentIds,leadChiefId:saved.leadChiefId,
  revision:saved.revision,active:missing.length===0,missingMemberIds:missing,
  requiresNewApproval:missing.length>0,autoShare:false,autoRun:false};
}
