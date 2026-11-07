/**
 * SCOTTY — Demo Decision Ledger Reader
 * ALL decisions (including "Demo approve") are non-authorizing.
 * Public/synthetic metadata only. No identity assertion or mission execution.
 */
export const code=async inputs=>{
 const parse=x=>typeof x==='string'?JSON.parse(x):x;
 const list=x=>{const v=parse(x);return Array.isArray(v)?v:v?.records};
 const rows=list(inputs?.decisions), projects=list(inputs?.projects);
 const val=parse(inputs?.directory);
 const roster=val?.body||val;
 if(!Array.isArray(rows)||rows.length>25||!Array.isArray(projects)||projects.length>25||
   !roster||roster.mode!=='STATIC_READ_ONLY'||roster.live_roster_verified!==false||
   roster.contains_private_memory!==false||!Array.isArray(roster.agents)||
   roster.agents.length!==185||roster.counts?.chiefs!==25||roster.counts?.specialists!==160)
   throw Error('INVALID_PUBLIC_STAGING_LEDGER');
 const get=(row,key)=>{
   const cells=row?.cells||{};
   if(typeof cells[key]==='string')return cells[key];
   const matching=Object.values(cells).find(v=>v?.fieldName===key);
   return typeof matching?.value==='string'?matching.value:'';
 };
 const projectIds=new Set(projects.map(r=>get(r,'Project ID')));
 const agents=new Set(roster.agents.map(a=>a.id));
 const idRe=/^[a-z0-9][a-z0-9_-]{3,79}$/i;
 const found=new Set();
 const decisions=[];
 for(const r of rows){
   const id=get(r,'Request ID');
   const projectId=get(r,'Project ID');
   const agentId=get(r,'Agent ID');
   const type=get(r,'Request Type');
   const decision=get(r,'Decision');
   const rev=get(r,'Revision');
   if(!idRe.test(id)||found.has(id)||!projectIds.has(projectId)||!agents.has(agentId)||
      !['mission-plan','assignment','memory-access'].includes(type)||
      !/^r[1-9][0-9]{0,6}$/.test(rev)||
      !['Pending','Demo approve','Demo reject'].includes(decision)||
      get(r,'Approval Authority')!=='Unverified — not authorized'||
      get(r,'Execution Allowed')!=='No'||
      get(r,'Data Class')!=='Synthetic demonstration only')
      throw Error('INVALID_OR_UNSAFE_DEMO_DECISION');
   found.add(id);
   decisions.push({requestId:id,projectId,agentId,kind:type,revision:rev,
     decision,demonstrationStatus:decision==='Demo approve'?'DEMO_APPROVED_NOT_AUTHORIZED':
       decision==='Demo reject'?'DEMO_REJECTED':'PENDING',
     ownerIdentityVerified:false,backendAuthorization:false,
     canExecute:false,missionCreated:false,privateMemoryReadable:false});
 }
 const counts={
   demoApproved:decisions.filter(d=>d.decision==='Demo approve').length,
   demoRejected:decisions.filter(d=>d.decision==='Demo reject').length,
   pending:decisions.filter(d=>d.decision==='Pending').length
 };
 return {type:'SCOTTY_DEMO_APPROVAL_LEDGER',status:'DEMO_ONLY_NO_BACKEND_AUTH',
   decisions:decisions.sort((a,b)=>a.requestId.localeCompare(b.requestId)),counts,
   actualOwnerApprovalsVerified:0,backendAuthorized:false,canExecute:false,
   missionStarts:0,privateMemoryReads:0,privateMemoryWrites:0,aiCalls:0,externalActions:0,
   warning:'The word approve in this demo table is NOT a real owner approval, authenticated session, or permission to execute a task.'};
};
