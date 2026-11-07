/**
 * Activepieces LUMEN creative production — manually-triggered proposal ONLY.
 * Inputs: directory (public creative-media JSON GET HTTP body);
 * brief (synthetic/public content only); projectId (public planning ID).
 * Never sends social posts, DMs, purchases ad slots, calls AI or writes memory.
 */
export const code=async(inputs)=>{
 const raw=inputs?.directory;
 const data=typeof raw==='string'?JSON.parse(raw):(raw?.body||raw);
 const knownIds=new Set([
  'chief-lumen','agent-creative-pulse','agent-creative-frame','agent-creative-iris'
 ]);
 if(!data || data.schema_version!=='scotty-creative-media-public-dev-v1' ||
   data.mode!=='STATIC_READ_ONLY'||data.status!=='PROPOSED_EXTENSION_NOT_MERGED' ||
   data.live_roster_verified!==false||data.contains_private_memory!==false||
   data.contains_connected_social_accounts!==false||
   data.owner_approval_required_for_execution!==true||
   data.counts?.additionalProfiles!==4||data.counts?.newChiefs!==1||
   data.counts?.newSpecialists!==3||data.counts?.proposedTotal!==189||
   !Array.isArray(data.agents)||data.agents.length!==4||
   !Array.isArray(data.projectSuggestions))throw Error('INVALID_PUBLIC_CREATIVE_MEDIA_EXTENSION');
 const byId=new Map();
 for(const a of data.agents){
  if(!a||!knownIds.has(a.id)||byId.has(a.id)||a.roleStatus!=='DRAFT_NOT_RUNNING'||
     a.toolsConnected!==false||a.memoryPersisted!==false ||
     !a.name||!a.department||!Array.isArray(a.deliverables)||
     a.deliverables.length<3)throw Error('CREATIVE_AGENT_PROFILE_UNSAFE');
  byId.set(a.id,a);
 }
 if(byId.size!==4||byId.get('chief-lumen')?.isChief!==true||
   byId.get('chief-lumen')?.chiefId!==null||
   ['agent-creative-pulse','agent-creative-frame','agent-creative-iris'].some(id=>
     byId.get(id)?.isChief!==false||byId.get(id)?.chiefId!=='chief-lumen'))
   throw Error('CREATIVE_AGENT_HIERARCHY_INVALID');
 const brief=String(inputs?.brief||'').trim();
 const projectId=String(inputs?.projectId||'golden-hour-creative').trim();
 if(!brief||brief.length>900||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(brief)||
   !/^[a-z0-9][a-z0-9-]{2,79}$/.test(projectId)||
   !data.projectSuggestions.some(p=>p.projectId===projectId&&
     /^suggested-|^possible future/.test(p.role||'')))
   throw Error('INVALID_PUBLIC_SYNTHETIC_CAMPAIGN_BRIEF');
 const lower=brief.toLowerCase();
 const groups=[
   {id:'agent-creative-pulse',re:/social|instagram|tiktok|shorts|reel|captions?|hooks?|content|campaign|audience|ugc|calendar|post/},
   {id:'agent-creative-frame',re:/cinema|video|film|gimbal|shot|footage|storyboard|camera|lighting|movement|edit|transition|9:16/},
   {id:'agent-creative-iris',re:/photo|portrait|still|image|product|lens|camera|light|pet|cat|retouch|backdrop|composition/}
 ];
 const selected=groups.filter(g=>g.re.test(lower)).map(g=>byId.get(g.id));
 if(selected.length===0)return {
  status:'NEEDS_SCOPE_CLARIFICATION',projectId,
  draftedOnly:true,ownerApprovalRequired:true,
  proposedSpecialists:[],started:false,messagesSent:0,aiCalls:0,memoryWrites:0,externalActions:0
 };
 const specialistSteps=selected.map((a,index)=>({
  stage:index+1,agentId:a.id,name:a.name,title:a.title,chiefId:a.chiefId,
  proposedDeliverables:a.deliverables,status:'PROPOSED_NOT_ASSIGNED'
 }));
 return {
  type:'SCOTTY_LUMEN_CAMPAIGN_PREVIEW',
  status:'PENDING_OWNER_APPROVAL',
  mode:'PUBLIC_SYNTHETIC_CREATIVE_DEMO',
  projectId,publicBrief:brief,
  chief:{agentId:'chief-lumen',name:byId.get('chief-lumen').name,
   reviewChecklist:byId.get('chief-lumen').deliverables,
   status:'REVIEW_NOT_STARTED'},
  proposedSpecialists:specialistSteps,
  reviewSequence:[
   'PULSE/FRAME/IRIS: only the selected development specialists propose draft deliverables',
   'LUMEN: review creative consistency, welfare, accessibility, rights and feasibility',
   'SCOTTY: synthesize chief-reviewed work and request owner sign-off'
  ],
  scottyOverseer:true,ownerApprovalRequired:true,
  actualOwnerApprovalVerified:false,projectMembershipVerified:false,
  socialAccountsConnected:false,photosOrVideoAccessed:false,
  publishAllowed:false,outreachAllowed:false,adSpendAllowed:false,
  started:false,assignmentsCreated:0,missionsCreated:0,
  messagesSent:0,aiCalls:0,memoryReads:0,memoryWrites:0,externalActions:0,
  warning:'No agent ran or learned anything. This is an inert public/synthetic workflow. Do not use private client briefs here.'
 };
};
