/**
 * RIKER's isolated, owner-governed operations brain.
 * Pure functions only: no storage writes, scheduler, API calls or automatic sharing.
 * The caller must independently verify the owner, roster and project grants.
 */
export const RIKER_ID='chief-riker';
export const CATEGORIES=Object.freeze(['owner_preference','decision','project','mission','collaboration','check_in','reference','lesson']);
export const SCOPES=Object.freeze(['private','project','department','network']);
const valid=s=>typeof s==='string'&&s.trim().length>0;
const distinct=a=>[...new Set(a)];

export function rikerDefaults(){
 return {id:RIKER_ID,name:'RIKER',chiefOf:'Operations & Coordination',reportsTo:'SCOTTY',
  beforeNewTask:true,beforeNewProject:true,morningBriefing:true,
  extraCheckIns:null,timezone:'America/Los_Angeles',
  ownerNickname:null,automaticProductionActions:false,externalSharing:false};
}
// Proposed memories are NEVER automatically recalled; a verified owner must review.
export function proposeRikerMemory(input){
 if(!input||!valid(input.text)||input.text.length>20000)throw Error('INVALID_MEMORY_TEXT');
 if(!CATEGORIES.includes(input.category))throw Error('INVALID_MEMORY_CATEGORY');
 if(!SCOPES.includes(input.scope)||input.scope==='network')throw Error('NETWORK_OR_SCOPE_NOT_ALLOWED');
 if(!valid(input.source))throw Error('MEMORY_SOURCE_REQUIRED');
 if(input.scope==='project'&&!valid(input.projectId))throw Error('PROJECT_ID_REQUIRED');
 if(input.scope==='department'&&!valid(input.department))throw Error('DEPARTMENT_REQUIRED');
 return {agentId:RIKER_ID,category:input.category,scope:input.scope,
  projectId:input.scope==='project'?input.projectId:undefined,
  department:input.scope==='department'?input.department:undefined,
  text:input.text.trim(),source:input.source.trim(),status:'pending',
  sensitivity:input.sensitivity==='sensitive'?'sensitive':'ordinary',
  createdAt:input.createdAt||new Date().toISOString()};
}
export function reviewRikerMemory(proposal,{ownerVerified=false,decision,reviewer='owner'}={}){
 if(!ownerVerified)throw Error('OWNER_AUTHORIZATION_REQUIRED');
 if(!proposal||proposal.agentId!==RIKER_ID||proposal.status!=='pending')throw Error('PENDING_RIKER_MEMORY_REQUIRED');
 if(!['approved','rejected'].includes(decision))throw Error('INVALID_REVIEW');
 return {...proposal,status:decision,reviewedBy:reviewer,reviewedAt:new Date().toISOString()};
}
export function canRecallRikerMemory(memory,access={}){
 if(!memory||memory.agentId!==RIKER_ID||memory.status!=='approved'||access.ownerVerified!==true)return false;
 if(memory.sensitivity==='sensitive'&&access.ownerAuthorizedSensitiveAccess!==true)return false;
 if(memory.scope==='private')return true;
 if(memory.scope==='department')return !!memory.department&&access.department===memory.department;
 if(memory.scope==='project')return !!memory.projectId&&Array.isArray(access.projectIds)&&access.projectIds.includes(memory.projectId);
 return false; // Network-wide sharing requires a separate approval process.
}
export function rikerCheckInPlan({date,briefing=false,extraTimes=[],timezone='America/Los_Angeles'}={}){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z')))throw Error('DATE_REQUIRED');
 if(!valid(timezone)||!Array.isArray(extraTimes)||extraTimes.length>24||extraTimes.some(t=>typeof t!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Error('INVALID_CHECK_IN_TIME');
 return {date,timezone,morningBriefing:!!briefing,beforeNewTask:true,beforeNewProject:true,
  requestedCheckIns:briefing?distinct(extraTimes).sort():[],
  schedulingConnected:false,
  note:'The check-in plan does not schedule or send messages.'};
}
/** Use a freshly fetched isolated Cloudflare agentBio(db, agent, roster) projection. */
export function buildRikerBrain({ownerPreferences={},bio={},memories=[],permissions={},date}={}){
 const verified=permissions.ownerVerified===true;
 const linked=verified?(bio.projects||[]):[];
 const allowed=Array.isArray(permissions.authorizedProjectIds)?permissions.authorizedProjectIds:[];
 const projects=linked.filter(p=>allowed.includes(p.id)).map(p=>({id:p.id,name:p.name,assignedAt:p.assignedAt||null}));
 const projectIds=projects.map(p=>p.id);
 const access={ownerVerified:verified,ownerAuthorizedSensitiveAccess:permissions.ownerAuthorizedSensitiveAccess===true,
  department:'Operations & Coordination',projectIds};
 const recalled=memories.filter(m=>canRecallRikerMemory(m,access))
  .map(m=>({text:m.text,source:m.source,category:m.category,scope:m.scope,projectId:m.projectId||null,createdAt:m.createdAt}));
 const activities=verified?(bio.activity||bio.assignments||[]):[];
 const assignments=activities.filter(a=>!a.projectId||projectIds.includes(a.projectId)).map(a=>({
  id:a.eventKey||a.id,kind:a.kind,title:a.title,projectId:a.projectId||null,
  source:a.source||null,status:a.status||'recorded',at:a.createdAt||a.updatedAt||null}));
 const approvedName=verified&&valid(ownerPreferences.preferredAddress)
  ?ownerPreferences.preferredAddress.trim().replace(/[\r\n]/g,' ').slice(0,64):'the owner';
 const briefing=verified&&ownerPreferences.morningBriefingDone===true;
 const checkIns=rikerCheckInPlan({date,briefing,extraTimes:briefing?(ownerPreferences.extraTimes||[]):[],
  timezone:ownerPreferences.timezone||'America/Los_Angeles'});
 const preferred=verified?(ownerPreferences.preferredCollaborators||bio.preferred||[]):[];
 const suggested=verified?(bio.suggestedPartners||[]):[];
 const assignedTeammates=verified?(bio.assignedTeammates||[]):[];
 const verifiedCollaborators=verified?(bio.verifiedCollaborators||[]):[];
 const instructions=[
  'You are RIKER, SCOTTY\'s Operations & Coordination chief. Do not impersonate SCOTTY or change your own access.',
  'Address the verified owner as '+approvedName+'; keep this preference private.',
  'Check with the owner BEFORE each new task or project. Wait for authorization; earlier approvals do not cover new work.',
  'The owner specifies any additional check-in times during THAT DAY\'S morning briefing. Never invent default times or claim a message was scheduled.',
  'Plan authorized missions, assign eligible specialists, review dependencies, collect chief review, and report consolidated results to SCOTTY.',
  'Use live project memberships and verified activity history; historical assignments never grant access to private documents.',
  'Distinguish owner-preferred teammates, suggestions, co-assigned teammates and verified mission collaborators.',
  'Only use source-backed, owner-approved, currently authorized memories. Never promote pending proposals to facts.',
  'Private memory must not be shared with other chiefs, ANSJEM or DAWNA unless explicitly authorized for that exact scope.',
  'Do not make purchases, deploy changes, grant access, contact third parties or change production without explicit owner approval and tools.',
  'Report each mission\'s goal, authorized agents, evidence, progress, blockers, next checkpoint and owner decisions.'
 ].join('\n');
 return {agentId:RIKER_ID,instructions,checkIns,projects,assignments,
  collaborators:{preferred,suggested,assignedTeammates,verifiedCollaborators},
  memory:{recalled,pendingCount:verified?memories.filter(m=>m.status==='pending').length:0},
  safety:{readOnly:true,requiresOwnerAuthorization:true,productionWrites:0,scheduledMessages:0}};
}
