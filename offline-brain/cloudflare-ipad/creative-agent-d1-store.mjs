/**
 * SOURCE-ONLY Cloudflare D1 persistence adapter for the Creative Studio.
 * Requires optional creative-agent-state-v1.sql migration. Never imported by
 * the production Worker or triggered by an Activepieces request.
 *
 * All inputs are already authorized by the protected agent engine. D1 itself
 * provides atomic uniqueness for (mission,revision,agent) and idempotency key.
 * Approved evidence is public/synthetic and recipient-scoped; model output
 * never becomes a memory entry without separate human review.
 */
const id=/^[a-z0-9][a-z0-9_-]{3,99}$/i;
const ref=/^[a-z0-9][a-z0-9_-]{3,129}$/i;
const digest=/^[a-f0-9]{64}$/;
const clean=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
const numChanges=x=>Number(x?.meta?.changes??x?.changes??0);
const err=s=>{throw Error(s);};
const iso=clock=>{
 const value=clock();
 if(!(value instanceof Date)||!Number.isFinite(value.getTime()))err('INVALID_D1_CLOCK');
 return value.toISOString();
};
function checkDb(db){
 if(typeof db?.prepare!=='function'||typeof db.batch!=='function')
   err('ISOLATED_D1_REQUIRED');
}
const stateCols='claim_id,project_id,agent_id,mission_id,revision,idempotency_key,intent_digest,status,result_text,evidence_ids_json,review_chief_id,claimed_at,updated_at,model_calls';
export async function creativeD1Readiness(db){
 if(typeof db?.prepare!=='function'||typeof db.batch!=='function')
   return {ready:false,reason:'ISOLATED_D1_REQUIRED',canExecute:false};
 try{
   const r=await db.prepare(
     "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('scotty_creative_runs_v1','scotty_creative_run_audit_v1','scotty_creative_memory_v1')"
   ).all();
   const names=new Set((r.results||[]).map(x=>x.name));
   if(names.size!==3)return {ready:false,reason:'CREATIVE_D1_MIGRATION_REQUIRED',canExecute:false};
   await db.prepare('SELECT '+stateCols+' FROM scotty_creative_runs_v1 LIMIT 0').all();
   await db.prepare('SELECT event_id,claim_id,event_type,agent_id,mission_id,occurred_at FROM scotty_creative_run_audit_v1 LIMIT 0').all();
   await db.prepare('SELECT note_id,project_id,owner_agent_id,department_id,scope,allowed_agent_ids_json,title,content_text,classification,owner_reviewed,review_state,expires_at FROM scotty_creative_memory_v1 LIMIT 0').all();
   return {ready:true,reason:null,canExecute:false,
     note:'Structural readiness only; does not authorize model calls.'};
 }catch{return {ready:false,reason:'CREATIVE_D1_SCHEMA_INCOMPLETE',canExecute:false};}
}
export function createCreativeD1Store(db,{clock=()=>new Date()}={}){
 checkDb(db);
 const getByClaim=claimId=>db.prepare(
   'SELECT '+stateCols+' FROM scotty_creative_runs_v1 WHERE claim_id=? LIMIT 1'
 ).bind(claimId).first();
 const getExisting=x=>db.prepare(
   'SELECT '+stateCols+' FROM scotty_creative_runs_v1 WHERE idempotency_key=? OR (mission_id=? AND revision=? AND agent_id=?) LIMIT 2'
 ).bind(x.idempotencyKey,x.missionId,x.revision,x.agentId).all();
 const approvedState=async claimId=>{
   const row=await getByClaim(claimId);
   if(!row)err('CREATIVE_RUN_NOT_FOUND');
   return row;
 };
 return {
  async claim(x){
   if(!id.test(x?.projectId||'')||!id.test(x?.agentId||'')||
      !id.test(x?.missionId||'')||!id.test(x?.idempotencyKey||'')||
      !/^r[1-9][0-9]{0,6}$/.test(x?.revision||'')||
      !digest.test(x?.intentDigest||'')||x.maxCalls!==1)
     err('INVALID_CREATIVE_CLAIM');
   const time=iso(clock);
   const claimId='claim-'+crypto.randomUUID();
   const create=db.prepare(
     "INSERT OR IGNORE INTO scotty_creative_runs_v1 (claim_id,project_id,agent_id,mission_id,revision,idempotency_key,intent_digest,status,result_text,evidence_ids_json,review_chief_id,claimed_at,updated_at,model_calls) VALUES(?,?,?,?,?,?,?,'CLAIMED',NULL,'[]',NULL,?,?,0)"
   ).bind(claimId,x.projectId,x.agentId,x.missionId,x.revision,x.idempotencyKey,x.intentDigest,time,time);
   const audit=db.prepare(
     "INSERT INTO scotty_creative_run_audit_v1(event_id,claim_id,event_type,agent_id,mission_id,occurred_at) SELECT ?,?,?,?,?,? WHERE changes()=1"
   ).bind(claimId+':claimed',claimId,'claimed',x.agentId,x.missionId,time);
   let result;
   try{result=await db.batch([create,audit]);}catch{err('CREATIVE_CLAIM_TRANSACTION_FAILED');}
   if(numChanges(result?.[0])===0){
     const old=(await getExisting(x)).results||[];
     if(old.length!==1)err('CREATIVE_CLAIM_CONFLICT');
     const record=old[0];
     if(record.project_id!==x.projectId||record.agent_id!==x.agentId||
        record.mission_id!==x.missionId||record.revision!==x.revision||
        record.idempotency_key!==x.idempotencyKey||record.intent_digest!==x.intentDigest)
       err('CREATIVE_CLAIM_IDEMPOTENCY_CONFLICT');
     return {status:'EXISTS',claimId:record.claim_id};
   }
   if(numChanges(result?.[0])!==1||numChanges(result?.[1])!==1)
     err('CREATIVE_CLAIM_AUDIT_UNVERIFIED');
   const saved=await approvedState(claimId);
   if(saved.status!=='CLAIMED'||saved.model_calls!==0||
      saved.intent_digest!==x.intentDigest)err('CREATIVE_CLAIM_READBACK_FAILED');
   return {status:'CLAIMED',claimId};
  },
  async approvedEvidence({agentId,departmentId,projectId,maxNotes=8,ownerReviewRequired=true}){
   if(!id.test(agentId||'')||departmentId!=='chief-lumen'||
     !id.test(projectId||'')||maxNotes!==8||ownerReviewRequired!==true)
     err('EVIDENCE_QUERY_UNAUTHORIZED');
   const result=await db.prepare(
     "SELECT note_id,project_id,owner_agent_id,department_id,scope,allowed_agent_ids_json,title,content_text,owner_reviewed,review_state FROM scotty_creative_memory_v1 WHERE project_id=? AND classification='public-or-synthetic' AND owner_reviewed=1 AND review_state='approved' AND (expires_at IS NULL OR expires_at>?) ORDER BY created_at,note_id LIMIT 50"
   ).bind(projectId,iso(clock)).all();
   const eligible=[];
   for(const note of result.results||[]){
     let allowed;
     try{allowed=JSON.parse(note.allowed_agent_ids_json);}catch{err('EVIDENCE_RECIPIENTS_MALFORMED');}
     if(!Array.isArray(allowed)||allowed.some(x=>!id.test(x)))err('EVIDENCE_RECIPIENTS_MALFORMED');
     const include=note.scope==='agent'?
       note.owner_agent_id===agentId:
       ['department','project','shared-reviewed'].includes(note.scope)&&
       allowed.includes(agentId)&&
       (note.scope!=='department'||note.department_id===departmentId);
     if(!include)continue;
     eligible.push({
       id:note.note_id,agentId:note.owner_agent_id,
       departmentId:note.department_id,projectId:note.project_id,
       ownerReviewed:true,scope:note.scope,
       allowedAgentIds:allowed,title:note.title,content:note.content_text
     });
   }
   if(eligible.length>8)err('TOO_MANY_APPROVED_EVIDENCE_RECORDS');
   return eligible;
  },
  async complete(x){
   if(!id.test(x?.claimId||'')||!id.test(x?.agentId||'')||
      !id.test(x?.missionId||'')||!id.test(x?.projectId||'')||
      !/^r[1-9][0-9]{0,6}$/.test(x?.revision||'')||
      x.status!=='AWAITING_CHIEF_REVIEW'||
      !clean(x?.result,14000)||!Array.isArray(x?.evidenceIds)||
      x.evidenceIds.length>8||x.evidenceIds.some(x=>!ref.test(x))||
      x.reviewChiefId!==(x.agentId==='chief-lumen'?'scotty':'chief-lumen'))
     err('INVALID_CREATIVE_COMPLETION');
   const before=await approvedState(x.claimId);
   if(before.status!=='CLAIMED'||before.project_id!==x.projectId||
      before.mission_id!==x.missionId||before.agent_id!==x.agentId||
      before.revision!==x.revision)
     err('CREATIVE_COMPLETION_SCOPE_CONFLICT');
   const time=iso(clock);
   const update=db.prepare(
     "UPDATE scotty_creative_runs_v1 SET status='AWAITING_CHIEF_REVIEW',result_text=?,evidence_ids_json=?,review_chief_id=?,updated_at=?,model_calls=1 WHERE claim_id=? AND status='CLAIMED'"
   ).bind(x.result,JSON.stringify(x.evidenceIds),x.reviewChiefId,time,x.claimId);
   const audit=db.prepare(
     "INSERT INTO scotty_creative_run_audit_v1(event_id,claim_id,event_type,agent_id,mission_id,occurred_at) SELECT ?,?,?,?,?,? WHERE changes()=1"
   ).bind(x.claimId+':completed',x.claimId,'completed',x.agentId,x.missionId,time);
   let output;
   try{output=await db.batch([update,audit]);}catch{err('CREATIVE_COMPLETION_TRANSACTION_FAILED');}
   if(numChanges(output?.[0])!==1||numChanges(output?.[1])!==1)
     err('CREATIVE_COMPLETION_CONFLICT_OR_AUDIT_UNVERIFIED');
   const after=await approvedState(x.claimId);
   if(after.status!=='AWAITING_CHIEF_REVIEW'||after.model_calls!==1||
      after.result_text!==x.result||after.review_chief_id!==x.reviewChiefId)
     err('CREATIVE_COMPLETION_READBACK_FAILED');
   return {verified:true,claimId:x.claimId,state:'AWAITING_CHIEF_REVIEW',memoryWrites:0};
  },
  async fail(x){
   if(!id.test(x?.claimId||'')||!id.test(x?.agentId||'')||
     !id.test(x?.missionId||'')||x?.retryAllowed!==false||
     !['MODEL_OR_CHECKPOINT_FAILED','EVIDENCE_SCOPE_FAILED'].includes(x?.reason))
     err('INVALID_CREATIVE_FAILURE');
   const prior=await approvedState(x.claimId);
   if(prior.agent_id!==x.agentId||prior.mission_id!==x.missionId)
     err('CREATIVE_FAILURE_SCOPE_CONFLICT');
   if(prior.status==='FAILED_NO_RETRY')return {verified:true,alreadyFailed:true};
   if(prior.status!=='CLAIMED')err('CREATIVE_FAILURE_AFTER_COMPLETION_FORBIDDEN');
   const time=iso(clock);
   const update=db.prepare(
     "UPDATE scotty_creative_runs_v1 SET status='FAILED_NO_RETRY',updated_at=? WHERE claim_id=? AND status='CLAIMED'"
   ).bind(time,x.claimId);
   const audit=db.prepare(
     "INSERT INTO scotty_creative_run_audit_v1(event_id,claim_id,event_type,agent_id,mission_id,occurred_at) SELECT ?,?,?,?,?,? WHERE changes()=1"
   ).bind(x.claimId+':failed',x.claimId,'failed',x.agentId,x.missionId,time);
   let output;
   try{output=await db.batch([update,audit]);}catch{err('CREATIVE_FAILURE_AUDIT_UNAVAILABLE');}
   if(numChanges(output?.[0])!==1||numChanges(output?.[1])!==1)
     err('CREATIVE_FAILURE_AUDIT_UNVERIFIED');
   const after=await approvedState(x.claimId);
   if(after.status!=='FAILED_NO_RETRY')err('CREATIVE_FAILURE_READBACK_UNVERIFIED');
   return {verified:true,state:'FAILED_NO_RETRY'};
  },
  async biographyActivity({agentId,projectId,includeResult=false}={}){
   if(!id.test(agentId||'')||!id.test(projectId||'')||includeResult!==false)
     err('SCOPED_BIO_QUERY_REQUIRED');
   const result=await db.prepare(
     'SELECT claim_id,agent_id,project_id,mission_id,revision,status,claimed_at,updated_at,model_calls,review_chief_id FROM scotty_creative_runs_v1 WHERE project_id=? AND agent_id=? ORDER BY updated_at DESC,claim_id DESC LIMIT 50'
   ).bind(projectId,agentId).all();
   return (result.results||[]).map(row=>({
     claimId:row.claim_id,agentId:row.agent_id,projectId:row.project_id,
     missionId:row.mission_id,revision:row.revision,
     status:row.status,reviewerId:row.review_chief_id,
     createdAt:row.claimed_at,updatedAt:row.updated_at,
     modelCalls:row.model_calls,contentIncluded:false
   }));
  }
 };
}
