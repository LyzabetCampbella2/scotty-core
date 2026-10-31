/** Isolated D1 owner recovery audit: operational metadata only; no private prompt,
 * results, citations, source documents or bearer-token data.
 * Installation requires the reviewed mission-recovery-v1.sql migration.
 */
export const RECOVERY_AUDIT_VERSION='mission-recovery-audit-v1';
export async function missionRecoveryAuditReady(db){
 if(typeof db?.prepare!=='function'||typeof db?.batch!=='function')
  return {ready:false,reason:'MISSION_RECOVERY_ATOMIC_BATCH_UNAVAILABLE'};
 try{
  await db.prepare('SELECT event_id,mission_id,event_type,previous_status,new_status,expected_updated_at,completed_at,preserved_stage_count,actor_type FROM brain_mission_recovery_audit LIMIT 0').bind().all();
  return {ready:true,reason:null,version:RECOVERY_AUDIT_VERSION};
 }catch{return {ready:false,reason:'MISSION_RECOVERY_AUDIT_MIGRATION_REQUIRED',version:RECOVERY_AUDIT_VERSION}}
}
export async function missionRecoveryIncidents(db,{missionId=null,limit=20}={}){
 const ready=await missionRecoveryAuditReady(db);
 if(!ready.ready)throw Error(ready.reason);
 if(missionId!==null&&(typeof missionId!=='string'||!/^[a-z0-9-]{16,80}$/i.test(missionId)))
  throw Error('INVALID_MISSION_ID');
 if(!Number.isInteger(limit)||limit<1||limit>50)throw Error('INVALID_INCIDENT_LIMIT');
 const select='SELECT event_id AS eventId,mission_id AS missionId,event_type AS eventType,'+
  'previous_status AS previousStatus,new_status AS newStatus,'+
  'expected_updated_at AS expectedUpdatedAt,completed_at AS completedAt,'+
  'preserved_stage_count AS preservedStageCount,actor_type AS actorType '+
  'FROM brain_mission_recovery_audit ';
 const query=missionId?select+'WHERE mission_id=? ORDER BY completed_at DESC LIMIT ?':
  select+'ORDER BY completed_at DESC LIMIT ?';
 const rows=await db.prepare(query).bind(...(missionId?[missionId,limit]:[limit])).all();
 return {version:RECOVERY_AUDIT_VERSION,incidents:rows.results||[],limit,missionId,
  readOnly:true,containsPrivateOutputs:false,automaticRecovery:false,modelCalls:0};
}
