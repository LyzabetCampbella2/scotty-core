/**
 * SCOTTY Owner Dashboard — manual, PUBLIC OR SYNTHETIC staging only.
 * Inputs: projectRows, taskRows, missionRows (Activepieces Tables Find Records outputs),
 *         directory (public development roster HTTP GET output).
 * This summarizes proposals. It never saves, approves, runs agents or reads memory.
 */
export const code = async (inputs) => {
  const parse = x => typeof x === 'string' ? JSON.parse(x) : x;
  const list = x => { const v=parse(x); if(Array.isArray(v)) return v; return v?.records; };
  const projectRows=list(inputs?.projectRows);
  const taskRows=list(inputs?.taskRows);
  const missionRows=list(inputs?.missionRows);
  const raw=parse(inputs?.directory);
  const directory=raw?.body||raw;
  if(!Array.isArray(projectRows)||projectRows.length>30||
     !Array.isArray(taskRows)||taskRows.length>50||
     !Array.isArray(missionRows)||missionRows.length>50||
     !directory||directory.mode!=='STATIC_READ_ONLY'||
     directory.live_roster_verified!==false||
     directory.contains_private_memory!==false||
     directory.counts?.chiefs!==25||
     directory.counts?.specialists!==160||
     directory.counts?.total!==185||
     !Array.isArray(directory.agents)||directory.agents.length!==185) {
    throw new Error('INVALID_PUBLIC_STAGING_INPUTS');
  }
  const read = (r,key) => {
    const cells=r?.cells;
    if (!cells || typeof cells!=='object') return '';
    const v=Object.values(cells).find(x=>x?.fieldName===key)?.value;
    return typeof v==='string'?v:'';
  };
  const chiefLookup=new Map(directory.agents.filter(a=>a.isChief===true).map(a=>[a.id,a]));
  const specialists=directory.agents.filter(a=>a.isChief===false&&chiefLookup.has(a.chiefId));
  const projectIds=new Set();
  const projects=[];
  for(const row of projectRows){
    const id=read(row,'Project ID'), name=read(row,'Project');
    if(!/^[a-z0-9-]{3,80}$/.test(id) || !name || name.length>100||projectIds.has(id))
      throw new Error('INVALID_PROJECT_SUMMARY');
    projectIds.add(id);
    const review=read(row,'Owner Review');
    const candidateDepartments=read(row,'Candidate Departments').split(';').map(s=>s.trim()).filter(Boolean);
    if(candidateDepartments.length<1||candidateDepartments.length>8)throw new Error('INVALID_DEPARTMENTS');
    const disabled=review==='Do not use';
    const proposed=disabled?[]:candidateDepartments.slice(0,5).map(department=>{
      const a=specialists.filter(x=>x.department===department).sort((x,y)=>x.id.localeCompare(y.id))[0];
      if(!a)return null;
      const chief=chiefLookup.get(a.chiefId);
      return {chiefId:chief.id,chiefName:chief.name,specialistId:a.id,
        specialistName:a.name,department,status:'PROPOSED_NOT_ASSIGNED'};
    }).filter(Boolean);
    projects.push({projectId:id,name,category:read(row,'Category'),
      ownerReview:review,planningOnly:true,proposedTeam:proposed});
  }
  const pending=[];
  for(const row of taskRows){
    if(read(row,'Data Class')!=='Public or synthetic')continue;
    if(read(row,'Review Status')==='New'){
      const task=read(row,'Task Description'),id=read(row,'Task ID');
      if(!id||id.length>80||!task||task.length>500)throw new Error('INVALID_PUBLIC_TASK');
      pending.push({taskId:id,task:task.slice(0,500),state:'PROPOSAL_NEEDED'});
    }
  }
  const demoMissions=missionRows.filter(r=>read(r,'Execution Allowed')==='No')
    .map(r=>({demoId:read(r,'Demo ID'),stage:read(r,'Workflow Stage'),
      project:read(r,'Project Label'),executionAllowed:false}));
  return {status:'PUBLIC_STAGING_BRIEFING_READY',overseer:'SCOTTY',
    projectCount:projects.length,projects,
    developmentRoster:{chiefs:25,specialists:160,total:185,liveAgentsVerified:0},
    publicTasksAwaitingPreview:pending.length,pendingPublicTasks:pending.slice(0,10),
    demonstrationMissions:demoMissions.slice(0,20),
    suggestedOnly:true,backendAuthorization:false,ownerApprovalRequiredForRealActions:true,
    realMissionsStarted:0,agentMemoryReads:0,agentMemoryWrites:0,aiCalls:0,externalWrites:0,
    warning:'This is a manual source-backed STAGING report; no live agent assignments, private memory or AI execution.'};
};
