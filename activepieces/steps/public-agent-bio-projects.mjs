/**
 * Public development-only SCOTTY agent biography + project collaborator preview.
 * Inputs: directory=public roster GET output; projectRows=Public Project Portfolio
 * Tables/Find Records; collaboratorRows=Proposed Project Collaborators;
 * agentId=known public development agent ID.
 * NEVER infer actual assignments, competence, project permissions or memory.
 */
export const code=async inputs=>{
 const parse=x=>typeof x==='string'?JSON.parse(x):x;
 const raw=parse(inputs?.directory);
 const dir=raw?.body||raw;
 const list=x=>{const v=parse(x);return Array.isArray(v)?v:v?.records};
 const projects=list(inputs?.projectRows),links=list(inputs?.collaboratorRows);
 if(!dir||dir.mode!=='STATIC_READ_ONLY'||dir.live_roster_verified!==false||
    dir.contains_private_memory!==false||dir.counts?.total!==185||
    dir.counts?.chiefs!==25||dir.counts?.specialists!==160||
    !Array.isArray(dir.agents)||dir.agents.length!==185||
    !Array.isArray(projects)||projects.length>20||
    !Array.isArray(links)||links.length>35)
   throw Error('INVALID_PUBLIC_DEVELOPMENT_BIO_SOURCE');
 const get=(r,k)=>{
   const c=r?.cells||{};
   if(typeof c[k]==='string')return c[k];
   const v=Object.values(c).find(x=>x?.fieldName===k);
   return typeof v?.value==='string'?v.value:'';
 };
 const agents=new Map(dir.agents.map(a=>[a.id,a]));
 if(agents.size!==185)throw Error('DUPLICATE_PUBLIC_AGENT_IDS');
 const id=String(inputs?.agentId||'').trim();
 const agent=agents.get(id);
 if(!agent)return {status:'UNKNOWN_PUBLIC_AGENT',agentId:id,liveAgent:false,projectProposals:[],candidateCollaborators:[],assignmentsVerified:false};
 const availableProjects=new Map();
 for(const p of projects){
   const projectId=get(p,'Project ID'),name=get(p,'Project'),
    ownerReview=get(p,'Owner Review');
   if(!/^[a-z0-9-]{3,80}$/.test(projectId)||!name||name.length>120||
      availableProjects.has(projectId)||
      !['Not reviewed','Reviewed for planning','Do not use'].includes(ownerReview))
     throw Error('INVALID_PUBLIC_PROJECT_REFERENCE');
   availableProjects.set(projectId,{projectId,name,ownerReview});
 }
 const normalized=[],seen=new Set();
 for(const r of links){
   const projectId=get(r,'Project ID'),candidateId=get(r,'Candidate Agent ID'),
     chiefId=get(r,'Reporting Chief ID'),status=get(r,'Assignment Status');
   const candidate=agents.get(candidateId),chief=agents.get(chiefId),project=availableProjects.get(projectId);
   const key=projectId+':'+candidateId;
   if(!project||!candidate||candidate.isChief!==false||
      !chief||chief.isChief!==true||candidate.chiefId!==chiefId||
      status!=='Suggestion only — not assigned'||seen.has(key))
     throw Error('INVALID_OR_FORGED_COLLABORATOR_PROPOSAL');
   seen.add(key);
   if(project.ownerReview!=='Do not use')
     normalized.push({projectId,projectName:project.name,
       candidateId:candidate.id,candidateName:candidate.name,
       chiefId,chiefName:chief.name,department:candidate.department,
       specialty:candidate.specialty,provenance:'public-development-proposal'});
 }
 const relevant=normalized.filter(p=>p.candidateId===id||(agent.isChief===true&&p.chiefId===id));
 const projectMap=new Map();
 for(const p of relevant){
   let obj=projectMap.get(p.projectId);
   if(!obj){
     obj={projectId:p.projectId,projectName:p.projectName,
       proposedRole:agent.isChief?'candidate-supervising-chief':'candidate-specialist',
       candidateStatus:'PROPOSED_NOT_ASSIGNED'};
     projectMap.set(p.projectId,obj);
   }
 }
 const collaborators=[],collaboratorKeys=new Set();
 for(const project of projectMap.values()){
   for(const l of normalized.filter(p=>p.projectId===project.projectId)){
     if(l.candidateId===id||l.chiefId===id)continue;
     const key=project.projectId+':'+l.candidateId;
     if(collaboratorKeys.has(key))continue;
     collaboratorKeys.add(key);
     collaborators.push({projectId:project.projectId,agentId:l.candidateId,
       agentName:l.candidateName,chiefId:l.chiefId,chiefName:l.chiefName,
       department:l.department,relationship:'SUGGESTED_COPARTICIPANT_ONLY'});
   }
 }
 const parent=agent.chiefId?agents.get(agent.chiefId):null;
 return {status:'PUBLIC_BIO_PROPOSAL_ONLY',
   agent:{id:agent.id,name:agent.name,
     role:agent.isChief?'chief':'specialist',department:agent.department,
     specialty:agent.specialty,skills:agent.skills,
     profileProvenance:agent.provenance,
     reportingChief:parent?{id:parent.id,name:parent.name}:null},
   projectProposals:[...projectMap.values()].sort((a,b)=>a.projectId.localeCompare(b.projectId)),
   candidateCollaborators:collaborators.slice(0,25).sort((a,b)=>(a.projectId+a.agentId).localeCompare(b.projectId+b.agentId)),
   projectAssignments:[],questions:[],missions:[],privateMemory:[],
   authorizedProjectAccess:false,ownerReviewGranted:false,
   assignmentVerified:false,collaborationVerified:false,liveAgent:false,
   aiCalls:0,externalActions:0,memoryReads:0,memoryWrites:0,
   warning:'This is public planning metadata, NOT a live assignment, personality brain, project permission, real collaborator relationship or individual memory.'};
};
