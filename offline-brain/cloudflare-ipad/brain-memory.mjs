/** Optional dedicated Cloudflare D1 store. Never uses the production database. */
export const MEMORY_SCHEMA=`CREATE TABLE IF NOT EXISTS brain_notes (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, scope TEXT NOT NULL,
 title TEXT NOT NULL, content TEXT NOT NULL, url TEXT,
 reviewed_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS brain_notes_lookup ON brain_notes(scope, agent_id, reviewed_at);`;
export function normalizeNote(body,roster,now=new Date()){
 const ids=new Set(['scotty',...roster.map(a=>a.id)]);
 if(body?.approved!==true)throw Error('REVIEW_REQUIRED');
 if(!['agent','department','shared'].includes(body.scope))throw Error('INVALID_SCOPE');
 if(body.scope!=='shared'&&!ids.has(body.agentId))throw Error('UNKNOWN_AGENT');
 if(body.scope==='department'&&!roster.find(a=>a.id===body.agentId)?.isChief)throw Error('CHIEF_REQUIRED');
 if(typeof body.title!=='string'||!body.title.trim()||body.title.length>160||typeof body.content!=='string'||!body.content.trim()||body.content.length>1800)throw Error('INVALID_NOTE');
 let url=null;
 if(body.url){const u=new URL(body.url);if(u.protocol!=='https:'||u.username||u.password)throw Error('INVALID_SOURCE_URL');url=u.href;}
 const days=body.validDays??30;
 if(!Number.isInteger(days)||days<1||days>365)throw Error('INVALID_FRESHNESS');
 return {id:crypto.randomUUID(),agentId:body.scope==='shared'?'shared':body.agentId,scope:body.scope,title:body.title.trim(),content:body.content.trim(),url,reviewedAt:now.toISOString(),expiresAt:new Date(now.getTime()+days*86400000).toISOString()};
}
export function memoryStore(db){
 if(typeof db?.prepare!=='function')throw Error('MEMORY_NOT_CONNECTED');
 return {
  async save(note){await db.prepare('INSERT INTO brain_notes(id,agent_id,scope,title,content,url,reviewed_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').bind(note.id,note.agentId,note.scope,note.title,note.content,note.url,note.reviewedAt,note.expiresAt).run();return note;},
  async read(agent){
   if(!agent?.id)throw Error('UNKNOWN_AGENT');
   // Reserve four slots per scope so shared traffic cannot erase individual/department context.
   const columns='id,title,content,url,scope,reviewed_at AS reviewedAt,expires_at AS expiresAt';
   const now=new Date().toISOString();
   const read=async(scope,id)=>{const r=await db.prepare(`SELECT ${columns} FROM brain_notes WHERE scope=? AND agent_id=? AND expires_at > ? AND reviewed_at <= ? ORDER BY reviewed_at DESC,id ASC LIMIT 4`).bind(scope,id,now,now).all();return r.results||[];};
   const individual=await read('agent',agent.id);
   const department=agent.id==='scotty'?[]:await read('department',agent.chiefId||agent.id);
   const shared=await read('shared','shared');
   return [...individual,...department,...shared];
  }
 };
}
