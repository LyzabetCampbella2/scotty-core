/** Optional PostgreSQL adapter for an approved isolated staging database only.
 * Requires caller-provided SQL client and reviewed schema/RLS. No connections created.
 */
const parseKey=(k)=>{let p;try{p=JSON.parse(k);}catch{throw Error('INVALID_KEY');}
 if(!Array.isArray(p)||p.length!==3||p.some(x=>typeof x!=='string'||!x))throw Error('INVALID_KEY');
 const [projectId,kind,id]=p;
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(projectId)||!['assignment','knowledge','audit'].includes(kind)||id.length>160)throw Error('INVALID_KEY');
 return {projectId,kind,id};
};
const copy=x=>structuredClone(x);
export class StagingPostgresWorkspaceStore{
 constructor(sql,{stagingConfirmed=false}={}){if(!stagingConfirmed||typeof sql!=='function'||typeof sql.begin!=='function')throw Error('EXPLICIT_STAGING_APPROVAL_REQUIRED');this.sql=sql;}
 async read(k){const {projectId,kind,id}=parseKey(k);const rows=await this.sql`select payload from scotty_workspace_records_v1 where project_id=${projectId} and record_kind=${kind} and record_id=${id}`;return rows[0]?copy(rows[0].payload):null;}
 async readPrefix(prefix){
  if(typeof prefix!=='string'||prefix.length>500)throw Error('INVALID_PREFIX');
  const matches=prefix.match(/^\["([A-Za-z0-9_-]{1,100})","(assignment|knowledge)",$/);
  if(!matches)throw Error('INVALID_PREFIX');
  const [,projectId,kind]=matches;
  const rows=await this.sql`select payload from scotty_workspace_records_v1 where project_id=${projectId} and record_kind=${kind} order by updated_at,record_id limit 1000`;
  return rows.map(x=>copy(x.payload));
 }
 async transaction(fn){
  return this.sql.begin(async tx=>{
   const t={
    read:async k=>{const {projectId,kind,id}=parseKey(k);const rows=await tx`select payload from scotty_workspace_records_v1 where project_id=${projectId} and record_kind=${kind} and record_id=${id} for update`;return rows[0]?copy(rows[0].payload):null;},
    write:async(k,payload)=>{const {projectId,kind,id}=parseKey(k);await tx`insert into scotty_workspace_records_v1(record_key,project_id,record_kind,record_id,payload) values(${k},${projectId},${kind},${id},${tx.json(payload)}) on conflict(record_key) do update set payload=excluded.payload,revision=scotty_workspace_records_v1.revision+1,updated_at=now()`;},
    append:async(k,value)=>{const {projectId,kind,id}=parseKey(k);if(kind!=='audit')throw Error('AUDIT_ONLY');await tx`insert into scotty_workspace_records_v1(record_key,project_id,record_kind,record_id,payload) values(${k},${projectId},${kind},${id},${tx.json([value])}) on conflict(record_key) do update set payload=scotty_workspace_records_v1.payload || excluded.payload,revision=scotty_workspace_records_v1.revision+1,updated_at=now()`;}
   };
   return fn(t);
  });
 }
}
