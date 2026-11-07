/**
 * Phase 1 review store, isolated staging SOURCE ONLY. NOT imported by Worker.
 * A server may call these methods ONLY after resolving a genuine owner session
 * and agent authorization internally, never from client-supplied assertions.
 * Approval affects *review metadata*, NEVER active runtime prompts, tools,
 * private memory, certification, payment or external actions.
 */
import {proposeAgentProfileRevision,PROFILE_REVIEW_VERSION} from './agent-brain-revisions.mjs';

const ID=/^[a-z0-9][a-z0-9_-]{3,99}$/i;
const HASH=/^[a-f0-9]{64}$/;
const deny=code=>{throw Error(code);};
const changes=x=>Number(x?.meta?.changes??x?.changes??-1);
const iso=now=>now instanceof Date&&Number.isFinite(now.getTime())?
 now.toISOString():deny('INVALID_SERVER_CLOCK');
const cols='request_id,agent_id,owner_id,base_spec_version,expected_head_version,idempotency_key,change_digest,patch_json,scope,classification,status,created_at,updated_at,expires_at,decided_at,version';
const headers='agent_id,head_version,approved_request_id,updated_at';
const audits='event_id,request_id,actor_id,event_type,previous_status,new_status,occurred_at';
function validateOwner(actor,agentId){
 if(actor?.authenticated!==true||actor?.verifiedByScotty!==true||
   actor?.provenance!=='scotty-server-side-session'||actor?.role!=='owner'||
   !ID.test(actor.ownerId||'')||
   !Array.isArray(actor.allowedAgentIds)||!actor.allowedAgentIds.includes(agentId)||
   actor.allowedAgentIds.length>185||
   new Set(actor.allowedAgentIds).size!==actor.allowedAgentIds.length)
   deny('VERIFIED_OWNER_AGENT_SCOPE_REQUIRED');
 return actor.ownerId;
}
function checkedD1(db){
 if(typeof db?.prepare!=='function'||typeof db?.batch!=='function')
   deny('ISOLATED_D1_CONNECTION_REQUIRED');
}
async function load(db,requestId){
 return db.prepare('SELECT '+cols+' FROM scotty_phase1_agent_profile_reviews_v1 WHERE request_id=? LIMIT 1')
   .bind(requestId).first();
}
async function head(db,agentId){
 return db.prepare('SELECT '+headers+' FROM scotty_phase1_agent_profile_heads_v1 WHERE agent_id=? LIMIT 1')
  .bind(agentId).first();
}
const publicStatus=(row,headRow,extra={})=>({
 requestId:row.request_id,agentId:row.agent_id,
 reviewStatus:row.status,reviewVersion:row.version,
 expectedHeadVersion:row.expected_head_version,
 currentHeadVersion:headRow?.head_version??null,
 currentApprovedRequestId:headRow?.approved_request_id??null,
 changeDigest:row.change_digest,
 profileReviewApproved:row.status==='approved',
 ownerAcceptedEntireBrain:false,modelBehaviorCertified:false,
 runtimePromptActivated:false,toolsGranted:0,
 memoryWrites:0,modelCalls:0,canExecute:false,
 ...extra
});
const replay=(a,b)=>a?.request_id===b.request_id&&
 a?.agent_id===b.agent_id&&a?.owner_id===b.owner_id&&
 a?.base_spec_version===b.base_spec_version&&
 a?.expected_head_version===b.expected_head_version&&
 a?.idempotency_key===b.idempotency_key&&
 a?.change_digest===b.change_digest&&a?.patch_json===b.patch_json&&
 a?.scope===b.scope&&a?.classification===b.classification&&
 a?.expires_at===b.expires_at;
const eventsFor={
 pending:[['created',null,'pending']],
 approved:[['created',null,'pending'],['approved','pending','approved']],
 rejected:[['created',null,'pending'],['rejected','pending','rejected']],
 revoked:[['created',null,'pending'],['approved','pending','approved'],['revoked','approved','revoked']]
};
async function checkAudit(db,row){
 const events=eventsFor[row.status];
 if(!events||row.version!==events.length)deny('PROFILE_REVIEW_STATE_OR_VERSION_INVALID');
 const records=(await db.prepare('SELECT '+audits+' FROM scotty_phase1_agent_profile_audit_v1 WHERE request_id=? LIMIT 4')
  .bind(row.request_id).all())?.results;
 if(!Array.isArray(records)||records.length!==events.length)
   deny('PROFILE_REVIEW_AUDIT_INCOMPLETE');
 const found=new Map(records.map(x=>[x.event_id,x]));
 if(found.size!==records.length)deny('PROFILE_REVIEW_AUDIT_DUPLICATE');
 for(const [kind,oldState,newState] of events){
  const e=found.get(row.request_id+':'+kind);
  if(!e||e.actor_id!==row.owner_id||e.request_id!==row.request_id||
    e.event_type!==kind||e.previous_status!==oldState||
    e.new_status!==newState||!Number.isFinite(Date.parse(e.occurred_at)))
    deny('PROFILE_REVIEW_AUDIT_INCONSISTENT');
 }
 if(row.status==='pending'?row.decided_at!==null:
    !Number.isFinite(Date.parse(row.decided_at||'')))
   deny('PROFILE_REVIEW_DECISION_TIME_INVALID');
 return records.length;
}
export async function phase1ProfileLedgerReadiness(db){
 if(typeof db?.prepare!=='function'||typeof db?.batch!=='function')
   return {ready:false,reason:'ISOLATED_D1_CONNECTION_REQUIRED',canActivate:false};
 try{
  const a=(await db.prepare(
   "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('scotty_phase1_agent_profile_heads_v1','scotty_phase1_agent_profile_reviews_v1','scotty_phase1_agent_profile_audit_v1')"
  ).all())?.results||[];
  if(new Set(a.map(x=>x.name)).size!==3)
   return {ready:false,reason:'PROFILE_REVIEW_MIGRATION_REQUIRED',canActivate:false};
  await db.prepare('SELECT '+headers+' FROM scotty_phase1_agent_profile_heads_v1 LIMIT 0').all();
  await db.prepare('SELECT '+cols+' FROM scotty_phase1_agent_profile_reviews_v1 LIMIT 0').all();
  await db.prepare('SELECT '+audits+' FROM scotty_phase1_agent_profile_audit_v1 LIMIT 0').all();
  const triggers=(await db.prepare(
   "SELECT name FROM sqlite_master WHERE type='trigger' AND name IN ('scotty_phase1_profile_reject_deletes_v1','scotty_phase1_profile_audit_no_update_v1','scotty_phase1_profile_audit_no_delete_v1','scotty_phase1_profile_state_guard_v1','scotty_phase1_profile_head_transition_v1')"
  ).all())?.results||[];
  if(new Set(triggers.map(x=>x.name)).size!==5)
   return {ready:false,reason:'PROFILE_REVIEW_TRIGGERS_MISSING',canActivate:false};
  return {ready:true,reason:null,canActivate:false,
   note:'Schema exists; no real owner connection, active brain edits or execution authorized.'};
 }catch{return {ready:false,reason:'PROFILE_REVIEW_SCHEMA_INCOMPLETE',canActivate:false};}
}
async function requireSchema(db){
 const x=await phase1ProfileLedgerReadiness(db);
 if(x.ready!==true)deny(x.reason||'PROFILE_REVIEW_D1_NOT_READY');
}
export async function createPhase1ProfileReview(db,{
 actor,proposal,expectedHeadVersion,idempotencyKey,
 expiresAt,classification,containsPrivateData,now=new Date()
}={}){
 checkedD1(db);
 const at=iso(now);
 if(!proposal||proposal.schemaVersion!==PROFILE_REVIEW_VERSION||
    proposal.source!=='user-drafted-unverified-proposal'||
    proposal.state!=='PENDING_VERIFIED_OWNER_REVIEW'||
    proposal.applied!==false||proposal.ownerAccepted!==false||
    proposal.ownerIdentityVerified!==false||proposal.usedByAgentRuntime!==false||
    !ID.test(proposal.agentId||'')||!ID.test(proposal.requestId||'')||
    !HASH.test(proposal.changeDigest||'')||
    !ID.test(idempotencyKey||'')||
    !Number.isInteger(expectedHeadVersion)||expectedHeadVersion<0||
    classification!=='public-or-synthetic'||containsPrivateData!==false)
   deny('INVALID_PUBLIC_PROFILE_REVIEW');
 const ownerId=validateOwner(actor,proposal.agentId);
 const expires=Date.parse(expiresAt||'');
 if(!Number.isFinite(expires)||expires<=now.getTime()||
    expires>now.getTime()+24*60*60*1000)
   deny('PROFILE_REVIEW_EXPIRY_INVALID');
 const rebuilt=await proposeAgentProfileRevision({
   agentId:proposal.agentId,baseVersion:proposal.basedOn,
   requestId:proposal.requestId,patch:proposal.patch,editorNote:proposal.editorNote
 });
 if(rebuilt.changeDigest!==proposal.changeDigest||
    JSON.stringify(rebuilt.patch)!==JSON.stringify(proposal.patch)||
    rebuilt.existingChief!==proposal.existingChief||rebuilt.existingRole!==proposal.existingRole)
   deny('PROFILE_REVIEW_DIGEST_OR_ROLE_MISMATCH');
 await requireSchema(db);
 const headInit=db.prepare(
  'INSERT OR IGNORE INTO scotty_phase1_agent_profile_heads_v1(agent_id,head_version,approved_request_id,updated_at) VALUES(?,0,NULL,?)'
 ).bind(proposal.agentId,at);
 try{await db.batch([headInit]);}catch{deny('PROFILE_HEAD_CREATE_FAILED');}
 const current=await head(db,proposal.agentId);
 if(!current||current.head_version!==expectedHeadVersion)
   deny('STALE_PROFILE_HEAD_VERSION');
 const row={
  request_id:proposal.requestId,agent_id:proposal.agentId,owner_id:ownerId,
  base_spec_version:proposal.basedOn,expected_head_version:expectedHeadVersion,
  idempotency_key:idempotencyKey,change_digest:proposal.changeDigest,
  patch_json:JSON.stringify(proposal.patch),scope:'agent.profile.review',
  classification:'public-or-synthetic',status:'pending',
  created_at:at,updated_at:at,expires_at:new Date(expires).toISOString(),
  decided_at:null,version:1
 };
 const existing=await db.prepare(
   'SELECT '+cols+' FROM scotty_phase1_agent_profile_reviews_v1 WHERE idempotency_key=? LIMIT 1'
 ).bind(idempotencyKey).first();
 if(existing){
  if(!replay(existing,row))deny('PROFILE_REVIEW_IDEMPOTENCY_CONFLICT');
  await checkAudit(db,existing);
  return publicStatus(existing,current,{replayed:true,created:false,auditVerified:true});
 }
 const insert=db.prepare(
  'INSERT INTO scotty_phase1_agent_profile_reviews_v1('+cols+') VALUES('+cols.split(',').map(()=>'?').join(',')+')'
 ).bind(...Object.values(row));
 const audit=db.prepare(
  "INSERT INTO scotty_phase1_agent_profile_audit_v1(event_id,request_id,actor_id,event_type,previous_status,new_status,occurred_at) VALUES(?,?,?,'created',NULL,'pending',?)"
 ).bind(row.request_id+':created',row.request_id,ownerId,at);
 try{await db.batch([insert,audit]);}catch{deny('PROFILE_REVIEW_CREATE_TRANSACTION_FAILED');}
 const saved=await load(db,row.request_id);
 if(!saved||!replay(saved,row)||saved.status!=='pending')
   deny('PROFILE_REVIEW_CREATE_READBACK_FAILED');
 await checkAudit(db,saved);
 return publicStatus(saved,current,{created:true,replayed:false,auditVerified:true});
}
export async function decidePhase1ProfileReview(db,{
 actor,requestId,expectedVersion,changeDigest,
 decision,confirmed,now=new Date()
}={}){
 checkedD1(db);
 const at=iso(now);
 if(!ID.test(requestId||'')||!HASH.test(changeDigest||'')||
   !Number.isInteger(expectedVersion)||expectedVersion<1||
   !['approved','rejected','revoked'].includes(decision)||
   confirmed!==true)deny('INVALID_PROFILE_REVIEW_DECISION');
 await requireSchema(db);
 const before=await load(db,requestId);
 if(!before)deny('PROFILE_REVIEW_NOT_FOUND');
 const ownerId=validateOwner(actor,before.agent_id);
 if(before.owner_id!==ownerId)deny('PROFILE_REVIEW_OWNER_MISMATCH');
 if(before.change_digest!==changeDigest||before.version!==expectedVersion)
   deny('PROFILE_REVIEW_VERSION_OR_DIGEST_CONFLICT');
 const expectedStatus=decision==='revoked'?'approved':'pending';
 if(before.status!==expectedStatus)deny('PROFILE_REVIEW_TRANSITION_FORBIDDEN');
 if(decision!=='revoked'&&Date.parse(before.expires_at)<=now.getTime())
   deny('PROFILE_REVIEW_EXPIRED');
 const current=await head(db,before.agent_id);
 if(decision==='approved'&&
   (!current||current.head_version!==before.expected_head_version||
    current.approved_request_id!==null))
   deny('PROFILE_REVIEW_HEAD_STALE_OR_ACTIVE');
 if(decision==='revoked'&&current?.approved_request_id!==requestId)
   deny('PROFILE_REVIEW_NOT_CURRENT_APPROVAL');
 const update=db.prepare(
  'UPDATE scotty_phase1_agent_profile_reviews_v1 SET status=?,decided_at=?,updated_at=?,version=version+1 WHERE request_id=? AND owner_id=? AND status=? AND version=? AND change_digest=?'
 ).bind(decision,at,at,requestId,ownerId,expectedStatus,expectedVersion,changeDigest);
 const audit=db.prepare(
  'INSERT INTO scotty_phase1_agent_profile_audit_v1(event_id,request_id,actor_id,event_type,previous_status,new_status,occurred_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1'
 ).bind(requestId+':'+decision,requestId,ownerId,decision,expectedStatus,decision,at);
 let results;
 try{results=await db.batch([update,audit]);}
 catch{deny('PROFILE_REVIEW_DECISION_TRANSACTION_FAILED');}
 if(changes(results?.[0])!==1||changes(results?.[1])!==1)
   deny('PROFILE_REVIEW_RACE_OR_AUDIT_MISSING');
 const after=await load(db,requestId);
 const updatedHead=await head(db,before.agent_id);
 if(after?.status!==decision||after.version!==expectedVersion+1||
   (decision==='approved'&&
    (updatedHead?.approved_request_id!==requestId||
     updatedHead.head_version!==before.expected_head_version+1))||
   (decision==='revoked'&&updatedHead?.approved_request_id!==null))
   deny('PROFILE_REVIEW_DECISION_READBACK_FAILED');
 await checkAudit(db,after);
 return publicStatus(after,updatedHead,{
  auditVerified:true,decisionRecorded:true,
  note:'Approval stores a reviewed public/synthetic draft only. The runtime never imports it automatically.'
 });
}
export async function readPhase1ProfileReview(db,{actor,requestId}={}){
 checkedD1(db);
 if(!ID.test(requestId||''))deny('INVALID_PROFILE_REVIEW_ID');
 await requireSchema(db);
 const saved=await load(db,requestId);
 if(!saved)deny('PROFILE_REVIEW_NOT_FOUND');
 const ownerId=validateOwner(actor,saved.agent_id);
 if(ownerId!==saved.owner_id)deny('PROFILE_REVIEW_OWNER_MISMATCH');
 await checkAudit(db,saved);
 const current=await head(db,saved.agent_id);
 return publicStatus(saved,current,{readOnly:true,auditVerified:true});
}
