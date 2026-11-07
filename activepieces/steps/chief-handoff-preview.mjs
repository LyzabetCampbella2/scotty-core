/**
 * SCOTTY chief-to-chief collaboration staging preview.
 * Public/synthetic proposal metadata only. No chat messages sent, no actual
 * assignment, no persistence, no AI execution, no memories or owner grants.
 *
 * Inputs:
 *   directory: public development roster HTTP output
 *   projectRows: Project Portfolio Tables/Find Records result
 *   collaboratorRows: Proposed Project Collaborators Tables/Find Records
 *   projectId: public planning project ID (e.g. eirden-atelier)
 *   leadDepartment: department to coordinate review (e.g. Engineering & Systems)
 */
export const code=async(inputs)=>{
 const parse=x=>typeof x==='string'?JSON.parse(x):x;
 const raw=parse(inputs?.directory);const directory=raw?.body||raw;
 const rows=x=>{const v=parse(x);return Array.isArray(v)?v:v?.records;};
 const projects=rows(inputs?.projectRows),relationships=rows(inputs?.collaboratorRows);
 const get=(r,k)=>{
   const cells=r?.cells||{};
   if(typeof cells[k]==='string')return cells[k];
   const cell=Object.values(cells).find(x=>x&&typeof x==='object'&&x.fieldName===k);
   return typeof cell?.value==='string'?cell.value:'';
 };
 const projectId=String(inputs?.projectId||'').trim(),
       leadDepartment=String(inputs?.leadDepartment||'').trim();
 if(!directory||directory.mode!=='STATIC_READ_ONLY'||
   directory.live_roster_verified!==false||directory.contains_private_memory!==false||
   directory.counts?.chiefs!==25||directory.counts?.specialists!==160||
   !Array.isArray(directory.agents)||directory.agents.length!==185||
   !Array.isArray(projects)||projects.length>25||
   !Array.isArray(relationships)||relationships.length>40||
   !/^[a-z0-9-]{3,80}$/.test(projectId)||leadDepartment.length<4||leadDepartment.length>100)
   throw Error('INVALID_COLLABORATION_STAGING_INPUT');
 const roster=new Map(directory.agents.map(a=>[a.id,a]));
 if(roster.size!==185)throw Error('DUPLICATE_AGENT_ID');
 const projectsById=new Map();
 for(const p of projects){
   const id=get(p,'Project ID');
   if(!/^[a-z0-9-]{3,80}$/.test(id)||projectsById.has(id)||
      !get(p,'Project')||!['Not reviewed','Reviewed for planning','Do not use'].includes(get(p,'Owner Review')))
     throw Error('INVALID_PROJECT_REFERENCE');
   projectsById.set(id,p);
 }
 const chosen=projectsById.get(projectId);
 if(!chosen)return {status:'PROJECT_NOT_IN_PUBLIC_PORTFOLIO',projectId,
   handoffs:[],messagesSent:0,assignmentsCreated:0,aiCalls:0,memoryWrites:0};
 if(get(chosen,'Owner Review')==='Do not use')return {status:'BLOCKED_BY_OWNER_PROJECT_FLAG',
   projectId,handoffs:[],messagesSent:0,assignmentsCreated:0,aiCalls:0,memoryWrites:0};
 const allowedDepartments=new Set(get(chosen,'Candidate Departments').split(';').map(s=>s.trim()).filter(Boolean));
 if(allowedDepartments.size<2||allowedDepartments.size>8)throw Error('INVALID_PROJECT_DEPARTMENTS');
 const selected=[],seen=new Set();
 for(const r of relationships){
   if(get(r,'Project ID')!==projectId)continue;
   const agentId=get(r,'Candidate Agent ID'),
     chiefId=get(r,'Reporting Chief ID'),dept=get(r,'Department');
   const agent=roster.get(agentId),chief=roster.get(chiefId);
   const key=projectId+':'+dept;
   if(!allowedDepartments.has(dept)||seen.has(key)||!agent||!chief||
      agent.isChief!==false||chief.isChief!==true||
      agent.chiefId!==chiefId||agent.department!==dept||
      chief.department!==dept||
      get(r,'Assignment Status')!=='Suggestion only — not assigned')
     throw Error('UNVERIFIED_OR_DUPLICATE_PROJECT_CANDIDATE');
   seen.add(key);
   selected.push({agentId,agentName:agent.name,chiefId,chiefName:chief.name,
     department:dept,specialty:agent.specialty});
 }
 if(selected.length<2||selected.length>5)throw Error('PROJECT_TEAM_PREVIEW_NEEDS_2_TO_5_DOMAINS');
 const lead=selected.find(x=>x.department===leadDepartment);
 if(!lead)throw Error('LEAD_DEPARTMENT_NOT_IN_PROJECT_TEAM');
 const projectName=get(chosen,'Project');
 if(projectName.length>150)throw Error('INVALID_PROJECT_TITLE');
 const handoffs=[];
 for(const specialist of selected){
   handoffs.push({
     stepId:'specialist-proposal-'+specialist.agentId,
     fromId:specialist.agentId,toId:specialist.chiefId,
     fromName:specialist.agentName,toName:specialist.chiefName,
     kind:'SPECIALIST_TO_CHIEF_REVIEW',
     instruction:'Prepare a public synthetic work outline on '+specialist.specialty+
       ' for '+projectName+'; list assumptions, missing evidence and review questions.',
     status:'PROPOSED_NOT_SENT',dependsOn:[],
     ownerApprovalRequired:true
   });
 }
 for(const unit of selected.filter(x=>x.chiefId!==lead.chiefId)){
   handoffs.push({
     stepId:'cross-chief-'+unit.chiefId+'-to-'+lead.chiefId,
     fromId:unit.chiefId,toId:lead.chiefId,
     fromName:unit.chiefName,toName:lead.chiefName,
     kind:'CROSS_CHIEF_REVIEW_HANDOFF',
     instruction:'Propose a scoped review of '+unit.department+
       ' findings for '+projectName+'; request integration feedback from '+lead.chiefName+'.',
     status:'PROPOSED_NOT_SENT',
     dependsOn:['specialist-proposal-'+unit.agentId],
     ownerApprovalRequired:true
   });
 }
 handoffs.push({
   stepId:'scotty-summary-'+projectId,
   fromId:lead.chiefId,toId:'scotty',fromName:lead.chiefName,toName:'SCOTTY',
   kind:'CENTRAL_SYNTHESIS_PROPOSAL',
   instruction:'Propose a combined summary from all '+selected.length+
     ' chief disciplines, record unresolved disagreements and request owner review.',
   status:'PROPOSED_NOT_SENT',
   dependsOn:[
     ...selected.filter(x=>x.chiefId!==lead.chiefId).map(x=>'cross-chief-'+x.chiefId+'-to-'+lead.chiefId),
     'specialist-proposal-'+lead.agentId
   ],ownerApprovalRequired:true
 });
 const stepIds=new Set(handoffs.map(x=>x.stepId));
 if(stepIds.size!==handoffs.length||handoffs.some(h=>h.dependsOn.some(id=>!stepIds.has(id))))
   throw Error('INVALID_HANDOFF_DEPENDENCY_GRAPH');
 return {status:'PENDING_OWNER_REVIEW',mode:'CROSS_CHIEF_COLLABORATION_PREVIEW',
   projectId,projectName,leadChiefId:lead.chiefId,leadChiefName:lead.chiefName,
   proposedSpecialists:selected.length,proposedChiefs:selected.length,
   handoffCount:handoffs.length,handoffs,scottyOverseer:true,
   readyToSend:false,ownerApprovalRequired:true,backendAuthorized:false,
   projectMembershipVerified:false,privateMemoryConnected:false,
   messagesSent:0,assignmentsCreated:0,missionsStarted:0,
   aiCalls:0,externalActions:0,memoryReads:0,memoryWrites:0,
   warning:'Public development team proposals only. No messages sent or live project permissions granted.'
 };
};
