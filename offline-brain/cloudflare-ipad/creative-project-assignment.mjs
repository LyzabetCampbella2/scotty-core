/**
 * Source-only owner/project authorization for LUMEN creative assignments.
 *
 * NOT a deployed API: only the protected SCOTTY backend may resolve owner
 * identity, server audit grant and project records and call this function.
 * Never accepts a client / Activepieces ownerApproved boolean. This links
 * a development creative agent to a public/synthetic project in isolated D1.
 * It does NOT start missions, contact platforms or grant memory permissions.
 */
const allowed=new Set(['chief-lumen','agent-creative-pulse','agent-creative-frame','agent-creative-iris']);
const ident=/^[a-z0-9][a-z0-9_-]{3,79}$/i;
const check=(ok,code)=>{if(!ok)throw Error(code);};
function validate({owner,project,grant,input,now}){
 const time=now instanceof Date?now.getTime():NaN;
 check(Number.isFinite(time),'INVALID_SERVER_CLOCK');
 check(owner?.verifiedByScotty===true&&owner.provenance==='scotty-server-side-session'&&
   owner.role==='owner'&&ident.test(owner.ownerId||''),'VERIFIED_OWNER_REQUIRED');
 check(project?.source==='scotty-server-project-store'&&project.active===true&&
   project.id===input?.projectId&&ident.test(project?.id||'')&&
   Array.isArray(owner.allowedProjects)&&owner.allowedProjects.includes(project.id),
   'PROJECT_PERMISSION_REQUIRED');
 check(allowed.has(input?.agentId)&&Array.isArray(project.allowedAgentIds)&&
   project.allowedAgentIds.includes(input.agentId),'AGENT_PROJECT_SCOPE_REQUIRED');
 check(grant?.source==='scotty-server-assignment-grant'&&
   grant.approvalKind==='project.assign'&&grant.ownerReviewConfirmed===true&&
   grant.revoked===false&&grant.committed===false&&
   grant.ownerId===owner.ownerId&&grant.agentId===input.agentId&&
   grant.projectId===input.projectId&&grant.referenceId===input.referenceId&&
   grant.scope==='public-or-synthetic'&&
   grant.privateDataAllowed===false&&grant.aiCallsAllowed===false&&
   grant.externalActionsAllowed===false,
   'TRUSTED_PROJECT_ASSIGNMENT_GRANT_REQUIRED');
 const expiration=Date.parse(grant.expiresAt||'');
 check(Number.isFinite(expiration)&&expiration>time&&expiration<=time+24*60*60*1000,
   'ASSIGNMENT_GRANT_EXPIRED');
 check(ident.test(input.referenceId||'')&&
   typeof input.title==='string'&&input.title.trim().length>0&&
   input.title.length<=120&&input.classification==='public-or-synthetic'&&
   input.containsPrivateData===false&&input.startMission===false,
   'INVALID_PUBLIC_ASSIGNMENT');
}
export async function assignCreativeProject(db,{
 owner,project,grant,input,now=new Date()
}={}){
 if(typeof db?.prepare!=='function'||typeof db.batch!=='function')
   throw Error('ISOLATED_PORTFOLIO_DB_REQUIRED');
 validate({owner,project,grant,input,now});
 const projectRow=await db.prepare('SELECT id FROM agent_projects WHERE id=? LIMIT 1')
  .bind(input.projectId).first();
 if(!projectRow)throw Error('UNKNOWN_ISOLATED_PROJECT');
 const eventKey='project:'+input.referenceId;
 const match=()=>db.prepare(
   'SELECT agent_id,project_id,kind,title,reference_id,source FROM agent_activity WHERE event_key=? AND agent_id=? LIMIT 1'
 ).bind(eventKey,input.agentId).first();
 const verify=async()=>{
   const previous=await match();
   if(!previous)return false;
   if(previous.agent_id!==input.agentId||previous.project_id!==input.projectId||
      previous.kind!=='project'||previous.title!==input.title.trim()||
      previous.reference_id!==input.referenceId||previous.source!=='owner-assigned')
     throw Error('ASSIGNMENT_IDENTITY_CONFLICT');
   const membership=await db.prepare(
     'SELECT agent_id,project_id FROM agent_project_links WHERE agent_id=? AND project_id=? LIMIT 1'
   ).bind(input.agentId,input.projectId).first();
   if(!membership)throw Error('ASSIGNMENT_MEMBERSHIP_READBACK_FAILED');
   return true;
 };
 if(await verify())return {status:'ALREADY_ASSIGNED',agentId:input.agentId,
   projectId:input.projectId,eventKey,aiCalls:0,memoryWrites:0,externalActions:0};
 const at=now.toISOString();
 const event=db.prepare(
   'INSERT OR IGNORE INTO agent_activity(event_key,agent_id,project_id,kind,title,reference_id,source,created_at) VALUES(?,?,?, ?,?,?,?,?)'
 ).bind(eventKey,input.agentId,input.projectId,'project',input.title.trim(),
   input.referenceId,'owner-assigned',at);
 const link=db.prepare(
   'INSERT OR IGNORE INTO agent_project_links(agent_id,project_id,assigned_at) VALUES(?,?,?)'
 ).bind(input.agentId,input.projectId,at);
 try{await db.batch([event,link]);}catch{throw Error('CREATIVE_ASSIGNMENT_TRANSACTION_FAILED');}
 if(!(await verify()))throw Error('CREATIVE_ASSIGNMENT_AUDIT_UNVERIFIED');
 return {status:'OWNER_REVIEWED_PROJECT_LINK_RECORDED',
   agentId:input.agentId,projectId:input.projectId,eventKey,
   missionStarted:false,memoryReadGranted:false,aiCalls:0,memoryWrites:0,
   externalActions:0,
   note:'Records only a public project membership in isolated D1, not a live agent execution grant.'};
}
