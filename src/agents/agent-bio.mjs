// Owner-facing projection only. These relationships never grant project access.
export function buildAgentBio(agent, roster, sources) {
 const id=agent.id, assignments=[], projects=new Map(), colleagues=new Map();
 const peers=ids=>[...new Set(ids)].filter(x=>x&&x!==id&&roster.some(a=>a.id===x));
 const project=(pid,reason)=>{if(!pid)return;const p=sources.projects.find(p=>p.id===pid);if(!p)return;if(!projects.has(pid))projects.set(pid,{id:pid,name:p.name,reasons:[],teammates:[]});const row=projects.get(pid);if(!row.reasons.includes(reason))row.reasons.push(reason);};
 for(const g of sources.grants.filter(g=>g.agent_id===id))project(g.project_id,'Current project member');
 for(const work of sources.work){if(!work.agentIds.includes(id))continue;const teammates=peers(work.agentIds);assignments.push({...work,teammates});project(work.projectId,'Recorded assignment');for(const other of teammates){if(!colleagues.has(other))colleagues.set(other,{id:other,name:roster.find(a=>a.id===other).name,sharedAssignments:0,completedTogether:0});const c=colleagues.get(other);c.sharedAssignments++;if(work.status==='completed')c.completedTogether++;}}
 for(const p of projects.values())p.teammates=peers(sources.grants.filter(g=>g.project_id===p.id).map(g=>g.agent_id));
 const recommended=roster.filter(a=>a.id!==id&&(a.id===agent.chiefId||a.chiefId===id||(agent.chiefId&&a.chiefId===agent.chiefId))).map(a=>({id:a.id,name:a.name,reason:a.id===agent.chiefId?'Reporting chief':a.chiefId===id?'Specialist reporting to this chief':'Shared reporting chief; potential collaborator'}));
 const preferred=(agent.profile?.preferredCollaborators||[]).filter(peer=>peer!==id&&roster.some(a=>a.id===peer)).map(peer=>({id:peer,name:roster.find(a=>a.id===peer).name}));
 return {preferred,names:Object.fromEntries(roster.map(a=>[a.id,a.name])),agentId:id,projects:[...projects.values()],assignments:assignments.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))),collaborators:[...colleagues.values()],recommended,asOf:new Date().toISOString(),gaps:sources.gaps||[],note:'Shared assignments and completion counts are recorded history, not proof of compatibility. Recommendations do not grant access. Separate Cloudflare Team Brain requests appear here only if saved to these mission records.'};
}
