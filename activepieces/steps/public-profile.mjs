/**
 * Activepieces Code step: inspect a public development agent portfolio entry.
 * No private memory, project assignments or live status are available.
 * Inputs: directory=GET public-agent-directory.json body, agentId=stable ID.
 */
export const code = async (inputs) => {
 const raw=inputs?.directory;
 const doc=typeof raw==='string'?JSON.parse(raw):(raw?.body||raw);
 const id=String(inputs?.agentId||'').trim();
 if(!doc||doc.mode!=='STATIC_READ_ONLY'||doc.counts?.total!==185||
    doc.live_roster_verified!==false||!Array.isArray(doc.agents)||
    doc.agents.length!==185||doc.contains_private_memory!==false)
   throw new Error('INVALID_PUBLIC_DIRECTORY');
 if(!id||id.length>160)throw new Error('AGENT_ID_REQUIRED');
 const agent=doc.agents.find(a=>a.id===id);
 if(!agent) return {status:'NOT_FOUND',agentId:id,source:'public-development-only'};
 const chief=agent.chiefId?doc.agents.find(a=>a.id===agent.chiefId):null;
 return {status:'PUBLIC_PROFILE_ONLY',agentId:agent.id,name:agent.name,
   role:agent.isChief?'chief':'specialist',department:agent.department,
   specialty:agent.specialty,skills:Array.isArray(agent.skills)?agent.skills:[],
   chief:chief?{id:chief.id,name:chief.name}:null,
   profileProvenance:agent.provenance,
   projects:[],missions:[],collaborators:[],memory:[],
   assignmentsVerified:false,memoryConnected:false,liveAgent:false,
   warning:'This public profile has no private owner memory or persisted tasks.'};
};
