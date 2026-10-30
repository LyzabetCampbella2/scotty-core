/** Read-only checks; never initialize a database or invoke AI. */
export const RELEASE='brain-readiness-v1';
export const INSTALLATION_SCHEMA=`CREATE TABLE IF NOT EXISTS brain_installation (
 id INTEGER PRIMARY KEY CHECK(id=1), lab_name TEXT NOT NULL, schema_version INTEGER NOT NULL);
INSERT OR IGNORE INTO brain_installation(id,lab_name,schema_version)
 VALUES(1,'scotty-independent-ipad-brain-lab',1);`;
export async function storageReadiness(db){
 if(typeof db?.prepare!=='function')return {bound:false,ready:false,reason:'MEMORY_NOT_CONNECTED'};
 try{
  const marker=await db.prepare('SELECT lab_name,schema_version FROM brain_installation WHERE id=1').bind().all();
  if(marker.results?.[0]?.lab_name!=='scotty-independent-ipad-brain-lab'||marker.results[0].schema_version!==1)return {bound:true,ready:false,reason:'WRONG_BRAIN_INSTALLATION'};
  await db.prepare('SELECT id,agent_id,scope,title,content,url,reviewed_at,expires_at FROM brain_notes LIMIT 0').bind().all();
  await db.prepare('SELECT id,question,team_size,status,result_json,created_at,updated_at FROM brain_missions LIMIT 0').bind().all();
  return {bound:true,ready:true,reason:null};
 }catch{return {bound:true,ready:false,reason:'MEMORY_SCHEMA_NOT_READY'};}
}
export async function readiness(env,{chiefCount=25,specialistCount=160}={}){
 const storage=await storageReadiness(env.BRAIN_DB);
 const checks={ownerAuthentication:typeof env.OWNER_BEARER_TOKEN==='string'&&env.OWNER_BEARER_TOKEN.length>=32,aiEnabled:env.AI_ENABLED==='true',aiBinding:typeof env.AI?.run==='function',storage,chiefCount,specialistCount,liveRosterVerified:false,freePlanVerifiedAutomatically:false};
 return {release:RELEASE,checks,canPlan:checks.ownerAuthentication,canInfer:checks.ownerAuthentication&&checks.aiEnabled&&checks.aiBinding&&(!storage.bound||storage.ready),canPersist:checks.ownerAuthentication&&storage.ready,providerCalls:0,
  nextSteps:[...(!checks.aiEnabled?['Enable AI only in the dedicated Worker after confirming Workers Free.']:[]),...(!checks.aiBinding?['Connect the Cloudflare Workers AI binding named AI.']:[]),...(!storage.bound?['Create and bind the dedicated D1 memory database as BRAIN_DB.']:[]),...(storage.bound&&!storage.ready?['Apply memory-schema.sql to the dedicated lab database; verify its installation marker.']:[]),'Verify the actual original agent roster before declaring migration complete.']};
}
