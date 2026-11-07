/**
 * Owner-reviewed PUBLIC/SYNTHETIC creative knowledge writes for isolated D1.
 * Not routed from Worker, not available to Activepieces, and not an automatic
 * model-learning path. A real private memory feature needs separate encryption,
 * user-data consent, retention and recipient permission design.
 */
const ids=new Set(['chief-lumen','agent-creative-pulse','agent-creative-frame','agent-creative-iris']);
const ref=/^[a-z0-9][a-z0-9_-]{3,129}$/i;
const isGrantDate=(s,now,days)=>{
 const time=Date.parse(s||'');
 return Number.isFinite(time)&&time>now&&time<=now+days*86400000;
};
const die=code=>{throw Error(code);};
async function digestContent(note){
 const payload=JSON.stringify([
   note.noteId,note.projectId,note.agentId,note.scope,
   note.allowedAgentIds,note.title,note.content,note.sourceRef,
   note.expiresAt||null
 ]);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload));
 return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function fingerprintCreativeNote(note){return digestContent(note);}

export async function approveCreativePublicNote(db,{owner,project,grant,note,now=new Date()}={}){
 if(typeof db?.prepare!=='function'||typeof db.batch!=='function')
   die('ISOLATED_CREATIVE_MEMORY_DB_REQUIRED');
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))
   die('INVALID_SERVER_CLOCK');
 if(owner?.verifiedByScotty!==true||owner.provenance!=='scotty-server-side-session'||
   owner.role!=='owner'||!ref.test(owner.ownerId||''))
   die('VERIFIED_OWNER_REQUIRED');
 if(!note||!ref.test(note.noteId||'')||!ref.test(note.projectId||'')||
   !ids.has(note.agentId)||!['agent','department','project','shared-reviewed'].includes(note.scope)||
   !Array.isArray(note.allowedAgentIds)||note.allowedAgentIds.length<1||
   note.allowedAgentIds.length>4||new Set(note.allowedAgentIds).size!==note.allowedAgentIds.length||
   note.allowedAgentIds.some(x=>!ids.has(x))||
   !/^[a-z0-9][a-z0-9_-]{3,129}$/i.test(note.sourceRef||'')||
   typeof note.title!=='string'||!note.title.trim()||note.title.length>120||
   typeof note.content!=='string'||!note.content.trim()||note.content.length>600||
   note.classification!=='public-or-synthetic'||note.containsPrivateData!==false||
   !isGrantDate(note.expiresAt,now.getTime(),365))
   die('INVALID_PUBLIC_CREATIVE_NOTE');
 if(note.scope==='agent'&&(note.allowedAgentIds.length!==1||
   note.allowedAgentIds[0]!==note.agentId))
   die('INVALID_AGENT_MEMORY_AUDIENCE');
 if(note.scope==='department'&&!note.allowedAgentIds.every(x=>ids.has(x)))
   die('INVALID_DEPARTMENT_MEMORY_AUDIENCE');
 if(project?.source!=='scotty-server-project-store'||project.active!==true||
   project.id!==note.projectId||!Array.isArray(project.allowedAgentIds)||
   !project.allowedAgentIds.includes(note.agentId)||
   note.allowedAgentIds.some(x=>!project.allowedAgentIds.includes(x))||
   !Array.isArray(owner.allowedProjects)||!owner.allowedProjects.includes(note.projectId))
   die('PROJECT_MEMORY_MEMBERSHIP_REQUIRED');
 const hash=await digestContent(note);
 if(grant?.source!=='scotty-server-memory-approval-grant'||
   grant.approvalKind!=='memory.approve'||grant.ownerReviewConfirmed!==true||
   grant.revoked!==false||grant.ownerId!==owner.ownerId||
   grant.noteId!==note.noteId||grant.projectId!==note.projectId||
   grant.contentDigest!==hash||grant.classification!=='public-or-synthetic'||
   grant.privateDataAllowed!==false||grant.externalActionsAllowed!==false||
   !isGrantDate(grant.expiresAt,now.getTime(),1))
   die('OWNER_REVIEWED_MEMORY_GRANT_REQUIRED');
 const previous=await db.prepare(
   'SELECT note_id,project_id,owner_agent_id,department_id,scope,allowed_agent_ids_json,title,content_text,classification,owner_reviewed,review_state,source_ref,expires_at FROM scotty_creative_memory_v1 WHERE note_id=? LIMIT 1'
 ).bind(note.noteId).first();
 const expected={
   note_id:note.noteId,project_id:note.projectId,owner_agent_id:note.agentId,
   department_id:'chief-lumen',scope:note.scope,
   allowed_agent_ids_json:JSON.stringify(note.allowedAgentIds),
   title:note.title.trim(),content_text:note.content.trim(),
   classification:'public-or-synthetic',owner_reviewed:1,review_state:'approved',
   source_ref:note.sourceRef,expires_at:new Date(note.expiresAt).toISOString()
 };
 const compare=record=>Object.entries(expected).every(([k,v])=>record?.[k]===v);
 if(previous){
   if(!compare(previous))die('MEMORY_NOTE_ID_CONFLICT');
   return {status:'ALREADY_OWNER_REVIEWED',noteId:note.noteId,
     projectId:note.projectId,scope:note.scope,memoryWrites:0,
     modelCalls:0,automaticSharing:false};
 }
 const command=db.prepare(
   "INSERT OR IGNORE INTO scotty_creative_memory_v1(note_id,project_id,owner_agent_id,department_id,scope,allowed_agent_ids_json,title,content_text,classification,owner_reviewed,review_state,source_ref,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
 ).bind(...Object.values(expected),now.toISOString());
 let response;
 try{response=await db.batch([command]);}catch{die('MEMORY_NOTE_WRITE_FAILED');}
 if(Number(response?.[0]?.meta?.changes??response?.[0]?.changes??0)!==1)
   die('MEMORY_NOTE_CONCURRENT_CONFLICT');
 const saved=await db.prepare(
   'SELECT note_id,project_id,owner_agent_id,department_id,scope,allowed_agent_ids_json,title,content_text,classification,owner_reviewed,review_state,source_ref,expires_at FROM scotty_creative_memory_v1 WHERE note_id=? LIMIT 1'
 ).bind(note.noteId).first();
 if(!compare(saved))die('MEMORY_NOTE_READBACK_FAILED');
 return {status:'OWNER_REVIEWED_PUBLIC_MEMORY_STORED',
   noteId:note.noteId,projectId:note.projectId,scope:note.scope,
   recipientCount:note.allowedAgentIds.length,privateDataStored:false,
   memoryWrites:1,modelCalls:0,automaticSharing:false,
   note:'Explicit reviewed public/synthetic memory only; not automatic model learning.'};
}
