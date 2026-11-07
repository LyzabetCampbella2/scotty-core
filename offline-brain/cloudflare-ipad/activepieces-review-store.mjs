/**
 * Optional isolated D1 storage for owner-reviewed SCOTTY plan previews.
 * SOURCE ONLY. Not imported by worker.mjs or accessible through Activepieces.
 *
 * SECURITY: actor and project MUST be resolved by the trusted SCOTTY server
 * from its own authenticated session and project ACL, never the automation
 * request body. Does not run AI, assign agents, grant memory, or start missions.
 *
 * A recorded "approved" row means only owner approval for a *preview*,
 * never permission to execute a real agent. A later privileged backend must
 * independently verify its own mission execution grant and audit.
 */
import {reviewLedgerReadiness} from './activepieces-review-readiness.mjs';

const ident=/^[a-z0-9][a-z0-9_-]{3,79}$/i;
const rev=/^r[1-9][0-9]{0,6}$/;
const digest=/^[a-f0-9]{64}$/;
const denied=(reason)=>{throw Error(reason)};
const uniqueAgents=ids=>Array.isArray(ids)&&ids.length>0&&ids.length<=8&&
  new Set(ids).size===ids.length&&ids.every(x=>typeof x==='string'&&ident.test(x));
const instant=now=>now instanceof Date&&Number.isFinite(now.getTime())?now.toISOString():denied('INVALID_CLOCK');
const trusted=(actor,project,projectId,agentIds)=>{
 if(!actor||actor.authenticated!==true||actor.verifiedByScotty!==true||
    actor.provenance!=='scotty-server-side-session'||actor.role!=='owner'||
    !ident.test(actor.ownerId||'')||
    !Array.isArray(actor.allowedProjects)||!actor.allowedProjects.includes(projectId))
   denied('VERIFIED_OWNER_SESSION_REQUIRED');
 if(!project||project.origin!=='scotty-server-project-store'||
    project.active!==true||project.id!==projectId||
    !uniqueAgents(project.allowedAgentIds)||
    agentIds.some(x=>!project.allowedAgentIds.includes(x)))
   denied('VERIFIED_PROJECT_MEMBERSHIP_REQUIRED');
 return actor.ownerId;
};
const rowFrom=(p,ownerId,at)=>({
 request_id:p.requestId,owner_id:ownerId,project_id:p.projectId,
 mission_id:p.missionId,revision:p.revision,
 intent_digest:p.intentDigest,agent_ids_json:JSON.stringify(p.agentIds),
 idempotency_key:p.idempotencyKey,scope:'mission.preview',
 status:'pending',created_at:at,updated_at:at,expires_at:p.expiresAt,
 decided_at:null,version:1
});
const safeDb=async(db)=>{
 const s=await reviewLedgerReadiness(db);
 if(s.ready!==true)denied('OWNER_REVIEW_D1_MIGRATION_REQUIRED');
};
const replay=(stored,next)=>
 stored.request_id===next.request_id&&stored.idempotency_key===next.idempotency_key&&
 stored.owner_id===next.owner_id&&stored.project_id===next.project_id&&
 stored.mission_id===next.mission_id&&stored.revision===next.revision&&
 stored.intent_digest===next.intent_digest&&stored.agent_ids_json===next.agent_ids_json&&
 stored.scope===next.scope&&stored.expires_at===next.expires_at;
const publicResult=(row,extra={})=>({
 requestId:row.request_id,projectId:row.project_id,
 missionId:row.mission_id,revision:row.revision,
 reviewStatus:row.status,reviewVersion:row.version,
 durablePreviewReview:true,canExecute:false,
 agentExecutionAuthorized:false,projectAssignmentsChanged:0,
 privateMemoryWrites:0,aiCalls:0,...extra
});


// A database write acknowledgement is not proof that the corresponding audit
// exists. Verify the whole permitted state machine with separate SELECTs.
const auditColumns='event_id,request_id,actor_id,actor_type,event_type,previous_status,new_status,revision,intent_digest,occurred_at';
const validAuditTransitions={
 pending:[['created',null,'pending']],
 approved:[['created',null,'pending'],['approved','pending','approved']],
 rejected:[['created',null,'pending'],['rejected','pending','rejected']],
 revoked:[['created',null,'pending'],['approved','pending','approved'],['revoked','approved','revoked']]
};
async function verifiedAudit(db,row){
 const expected=validAuditTransitions[row.status];
 if(!expected)denied('INVALID_REVIEW_STATUS');
 if(row.version!==expected.length)denied('REVIEW_VERSION_AUDIT_MISMATCH');
 if(!Number.isFinite(Date.parse(row.created_at||''))||!Number.isFinite(Date.parse(row.updated_at||'')))
   denied('INVALID_REVIEW_TIMESTAMPS');
 let records;
 try{
   const result=await db.prepare(
     'SELECT '+auditColumns+' FROM scotty_activepieces_review_audit_v1 WHERE request_id=? ORDER BY occurred_at,event_id LIMIT 4'
   ).bind(row.request_id).all();
   records=result?.results;
 }catch{denied('REVIEW_AUDIT_UNAVAILABLE');}
 if(!Array.isArray(records)||records.length!==expected.length)
   denied('REVIEW_AUDIT_INCOMPLETE');
 // Compare transitions by their known deterministic unique event IDs,
 // not by timestamp (which can be identical when tests use a fixed clock).
 const byId=new Map(records.map(e=>[e.event_id,e]));
 if(byId.size!==records.length)denied('REVIEW_AUDIT_DUPLICATE');
 for(const [type,from,to] of expected){
   const e=byId.get(row.request_id+':'+type);
   if(!e||e.request_id!==row.request_id||e.actor_id!==row.owner_id||
      e.actor_type!=='authenticated-owner'||e.event_type!==type||
      e.previous_status!==from||e.new_status!==to||
      e.revision!==row.revision||e.intent_digest!==row.intent_digest||
      !Number.isFinite(Date.parse(e.occurred_at)))
     denied('REVIEW_AUDIT_INCONSISTENT');
 }
 if(row.status==='pending' ? row.decided_at!==null : !Number.isFinite(Date.parse(row.decided_at||'')))
   denied('REVIEW_DECISION_TIMESTAMP_INCONSISTENT');
 const created=byId.get(row.request_id+':created');
 const final=row.status==='pending'?created:byId.get(row.request_id+':'+(row.status==='revoked'?'revoked':row.status));
 if(created.occurred_at!==row.created_at||final.occurred_at!==row.updated_at||
    (row.status!=='pending'&&final.occurred_at!==row.decided_at)||
    Date.parse(final.occurred_at)<Date.parse(created.occurred_at))
   denied('REVIEW_AUDIT_TIMESTAMP_MISMATCH');
 return records.length;
}
function safeAgentIds(row){
 let ids;
 try{ids=JSON.parse(row.agent_ids_json);}catch{denied('INVALID_STORED_AGENT_IDS');}
 if(!uniqueAgents(ids)||row.scope!=='mission.preview')denied('INVALID_STORED_REVIEW_SCOPE');
 return ids;
}
const loadOwnerReview=(db,requestId)=>db.prepare(
 'SELECT request_id,owner_id,project_id,mission_id,revision,intent_digest,agent_ids_json,idempotency_key,scope,status,created_at,updated_at,expires_at,decided_at,version FROM scotty_activepieces_review_requests_v1 WHERE request_id=? LIMIT 1'
).bind(requestId).first();

/**
 * Read only a single public/synthetic review and verified audit summary.
 * Server-derived owner session AND project membership are mandatory.
 * Never expose private memory, prompt contents or untrusted Activepieces roles.
 */
export async function readOwnerPreviewReview(db,{actor,project,requestId}={}){
 if(!ident.test(requestId||''))denied('INVALID_REVIEW_ID');
 await safeDb(db);
 const row=await loadOwnerReview(db,requestId);
 if(!row)denied('REVIEW_REQUEST_NOT_FOUND');
 const ids=safeAgentIds(row);
 const ownerId=trusted(actor,project,row.project_id,ids);
 if(row.owner_id!==ownerId)denied('REVIEW_OWNER_MISMATCH');
 const auditEventCount=await verifiedAudit(db,row);
 return publicResult(row,{auditVerified:true,auditEventCount,readOnly:true});
}

export async function createOwnerPreviewReview(db,{actor,project,proposal,now=new Date()}={}){
 const at=instant(now);
 if(!proposal||!ident.test(proposal.requestId||'')||
    !ident.test(proposal.projectId||'')||
    !ident.test(proposal.missionId||'')||
    !ident.test(proposal.idempotencyKey||'')||
    !rev.test(proposal.revision||'')||
    !digest.test(proposal.intentDigest||'')||
    !uniqueAgents(proposal.agentIds)||
    proposal.classification!=='public-or-synthetic'||
    proposal.containsPrivateData!==false||
    proposal.paidProviderRequested===true||
    proposal.scope!=='mission.preview')denied('INVALID_PUBLIC_REVIEW_PROPOSAL');
 const expiration=Date.parse(proposal.expiresAt||'');
 if(!Number.isFinite(expiration)||expiration<=now.getTime()||
    expiration>now.getTime()+24*60*60*1000)denied('INVALID_REVIEW_EXPIRATION');
 const ownerId=trusted(actor,project,proposal.projectId,proposal.agentIds);
 const row=rowFrom(proposal,ownerId,at);
 await safeDb(db);
 const find=async()=>db.prepare(
   'SELECT request_id,owner_id,project_id,mission_id,revision,intent_digest,agent_ids_json,idempotency_key,scope,status,created_at,updated_at,expires_at,decided_at,version FROM scotty_activepieces_review_requests_v1 WHERE idempotency_key=? LIMIT 1'
 ).bind(proposal.idempotencyKey).first();
 const existing=await find();
 if(existing){
   if(!replay(existing,row))denied('REVIEW_IDEMPOTENCY_KEY_CONFLICT');
   await verifiedAudit(db,existing);
   return publicResult(existing,{replayed:true,created:false,auditVerified:true});
 }
 const insert=db.prepare(
   'INSERT INTO scotty_activepieces_review_requests_v1(request_id,owner_id,project_id,mission_id,revision,intent_digest,agent_ids_json,idempotency_key,scope,status,created_at,updated_at,expires_at,decided_at,version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
 ).bind(row.request_id,row.owner_id,row.project_id,row.mission_id,row.revision,
   row.intent_digest,row.agent_ids_json,row.idempotency_key,row.scope,row.status,
   row.created_at,row.updated_at,row.expires_at,row.decided_at,row.version);
 const audit=db.prepare(
   'INSERT INTO scotty_activepieces_review_audit_v1(event_id,request_id,actor_id,actor_type,event_type,previous_status,new_status,revision,intent_digest,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?)'
 ).bind(row.request_id+':created',row.request_id,ownerId,'authenticated-owner',
  'created',null,'pending',row.revision,row.intent_digest,at);
 try{await db.batch([insert,audit]);}catch{denied('REVIEW_CREATE_TRANSACTION_FAILED');}
 const saved=await find();
 if(!saved||!replay(saved,row)||saved.status!=='pending'||saved.version!==1)
   denied('REVIEW_CREATE_READBACK_FAILED');
 await verifiedAudit(db,saved);
 return publicResult(saved,{replayed:false,created:true,auditVerified:true});
}

export async function decideOwnerPreviewReview(db,{actor,project,requestId,
 revision,intentDigest,expectedVersion,decision,confirmed,now=new Date()}={}){
 const at=instant(now);
 if(!ident.test(requestId||'')||!rev.test(revision||'')||
    !digest.test(intentDigest||'')||
    !Number.isInteger(expectedVersion)||expectedVersion<1||
    !['approved','rejected','revoked'].includes(decision)||
    confirmed!==true)denied('INVALID_REVIEW_DECISION');
 await safeDb(db);
 const load=()=>db.prepare(
   'SELECT request_id,owner_id,project_id,mission_id,revision,intent_digest,agent_ids_json,idempotency_key,scope,status,created_at,updated_at,expires_at,decided_at,version FROM scotty_activepieces_review_requests_v1 WHERE request_id=? LIMIT 1'
 ).bind(requestId).first();
 const existing=await load();
 if(!existing)denied('REVIEW_REQUEST_NOT_FOUND');
 const ids=safeAgentIds(existing);
 const ownerId=trusted(actor,project,existing.project_id,ids);
 if(existing.owner_id!==ownerId)denied('REVIEW_OWNER_MISMATCH');
 if(existing.revision!==revision||existing.intent_digest!==intentDigest||
    existing.version!==expectedVersion)denied('REVIEW_REVISION_CONFLICT');
 await verifiedAudit(db,existing);
 const expires=Date.parse(existing.expires_at||'');
 if(!Number.isFinite(expires)||expires<=now.getTime())denied('REVIEW_EXPIRED');
 if(decision==='revoked'?existing.status!=='approved':existing.status!=='pending')
   denied('ILLEGAL_REVIEW_TRANSITION');
 const update=db.prepare(
   'UPDATE scotty_activepieces_review_requests_v1 SET status=?,decided_at=?,updated_at=?,version=version+1 WHERE request_id=? AND owner_id=? AND revision=? AND intent_digest=? AND version=? AND status=?'
 ).bind(decision,at,at,requestId,ownerId,revision,intentDigest,expectedVersion,existing.status);
 const audit=db.prepare(
   'INSERT INTO scotty_activepieces_review_audit_v1(event_id,request_id,actor_id,actor_type,event_type,previous_status,new_status,revision,intent_digest,occurred_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE changes()=1'
 ).bind(requestId+':'+decision,requestId,ownerId,'authenticated-owner',
   decision,existing.status,decision,revision,intentDigest,at);
 let output;
 try{output=await db.batch([update,audit]);}catch{denied('REVIEW_DECISION_TRANSACTION_FAILED');}
 if(Number(output?.[0]?.meta?.changes??output?.[0]?.changes??0)!==1||
    Number(output?.[1]?.meta?.changes??output?.[1]?.changes??0)!==1)
   denied('REVIEW_DECISION_CONFLICT_OR_AUDIT_MISSING');
 const saved=await load();
 if(!saved||saved.status!==decision||saved.version!==expectedVersion+1||
    saved.decided_at!==at)denied('REVIEW_DECISION_READBACK_FAILED');
 await verifiedAudit(db,saved);
 return publicResult(saved,{recorded:true,auditVerified:true,ownerPreviewDecisionOnly:true,
   note:'Owner reviewed a plan preview; this does not authorize AI, projects or agent execution.'});
}
