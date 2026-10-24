/** Dedicated lab D1 checkpoints. Generated findings are NOT approved shared knowledge. */
export const MISSION_SCHEMA=`CREATE TABLE IF NOT EXISTS brain_missions (
 id TEXT PRIMARY KEY, question TEXT NOT NULL, team_size INTEGER NOT NULL,
 status TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS brain_missions_recent ON brain_missions(updated_at);`;
export function missionMemory(db){
 if(typeof db?.prepare!=='function')throw Error('MISSION_STORAGE_NOT_CONNECTED');
 return {
  async claim(id,question,teamSize){
   if(typeof id!=='string'||!/^[a-z0-9-]{16,80}$/i.test(id))throw Error('INVALID_MISSION_ID');
   const now=new Date().toISOString();
   const write=await db.prepare("INSERT OR IGNORE INTO brain_missions(id,question,team_size,status,result_json,created_at,updated_at) VALUES(?,?,?,'running','{}',?,?)").bind(id,question,teamSize,now,now).run();
   if(write.meta?.changes===1)return {claimed:true};
   const r=await db.prepare('SELECT question,team_size,status,result_json FROM brain_missions WHERE id=?').bind(id).all();const row=r.results?.[0];
   if(!row||row.question!==question||Number(row.team_size)!==teamSize)throw Error('MISSION_ID_CONFLICT');
   return {claimed:false,status:row.status,result:JSON.parse(row.result_json)};
  },
  async checkpoint(id,result){await db.prepare('UPDATE brain_missions SET status=?,result_json=?,updated_at=? WHERE id=?').bind(result.status,JSON.stringify(result),new Date().toISOString(),id).run();},
  async recent(){const r=await db.prepare('SELECT id,status,result_json,created_at AS createdAt,updated_at AS updatedAt FROM brain_missions ORDER BY updated_at DESC LIMIT 20').bind().all();return (r.results||[]).map(r=>({...r,result:JSON.parse(r.result_json),result_json:undefined}));}
 };
}
