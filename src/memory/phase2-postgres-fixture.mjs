/**
 * B2 disposable CI PostgreSQL persistence TEST FIXTURE ONLY.
 * Not an application API, trusted authentication layer, or approved memory store.
 * Synthetic-only contents and test owner sessions are intentionally mintable.
 */
import {createHash,randomUUID} from "node:crypto";
const sha=s=>createHash("sha256").update(s).digest("hex");
const validId=s=>typeof s==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(s);
const synthetic=s=>typeof s==="string"&&s.startsWith("SYNTHETIC:")&&s.length<=1024;
const time=s=>typeof s==="string"&&Number.isFinite(Date.parse(s));
const uuid=s=>typeof s==="string"&&/^[a-f0-9-]{36}$/i.test(s);

export function assertEphemeralB2Ci(){
 const raw=process.env.B2_CI_DATABASE_URL;
 let u;
 try{u=new URL(raw);}catch{throw Error("DISPOSABLE_B2_CI_DATABASE_REQUIRED")}
 if(process.env.GITHUB_ACTIONS!=="true"||
    process.env.SCOTTY_B2_EPHEMERAL_DB_TEST!=="yes"||
    u.protocol!=="postgres:"||u.hostname!=="127.0.0.1"||
    u.pathname!=="/scotty_b2_ci"||u.username!=="b2_ci"||
    raw===process.env.DATABASE_URL||
    raw===process.env.SCOTTY_A0_STAGING_DATABASE_URL)
  throw Error("DISPOSABLE_B2_CI_DATABASE_REQUIRED");
 return raw;
}

export async function openEphemeralB2Fixture(sql,frozen){
 assertEphemeralB2Ci();
 if(frozen?.freezeStatus!=="OWNER_APPROVED_VERSIONED_SNAPSHOT"||
    frozen.records?.length!==185)throw Error("FROZEN_ROSTER_REQUIRED");
 const agents=new Map(frozen.records.map(r=>[r["Agent ID"],{dept:r.Department,role:r.Role,chief:r["Chief ID"]}]));
 if(agents.size!==185||
    [...agents.values()].filter(a=>a.role==="Chief").length!==25||
    [...agents.values()].filter(a=>a.role==="Specialist").length!==160)
  throw Error("INVALID_FROZEN_ROSTER");
 for(const [id,a] of agents){
  if(!validId(id)||!a.dept||
     a.role==="Specialist"&&(!agents.has(a.chief)||agents.get(a.chief).dept!==a.dept))
   throw Error("INVALID_FROZEN_ROLE");
 }
 const q=(query,values=[])=>sql.unsafe(query,values);
 const [db]=await q("select current_database() as name");
 if(db?.name!=="scotty_b2_ci")throw Error("UNEXPECTED_MEMORY_FIXTURE_DATABASE");
 const [schema]=await q("select to_regclass('public.scotty_b2_fixture_memory') is not null as m, to_regclass('public.scotty_b2_fixture_audit') is not null as a");
 if(!schema?.m||!schema?.a)throw Error("B2_FIXTURE_SCHEMA_REQUIRED");
 const contexts=new WeakMap();
 const context=token=>{
  const v=token&&typeof token==="object"?contexts.get(token):null;
  if(!v)throw Error("FORGED_SYNTHETIC_TEST_SESSION");
  return v;
 };
 const actor=token=>{
  const v=context(token);
  if(v.kind!=="agent")throw Error("TEST_AGENT_ONLY");
  return v;
 };
 const owner=token=>{
  const v=context(token);
  if(v.kind!=="owner")throw Error("TEST_OWNER_ONLY");
  return v;
 };
 const row=async(tx,id)=>{
  if(!uuid(id))throw Error("BAD_SYNTHETIC_ID");
  const [r]=await tx.unsafe("select * from scotty_b2_fixture_memory where memory_id=$1 for update",[id]);
  if(!r)throw Error("UNKNOWN_SYNTHETIC_MEMORY");
  return r;
 };
 const audit=(tx,id,type,subject)=>tx.unsafe(
  "insert into scotty_b2_fixture_audit(event_id,memory_id,actor_id,event_type) values($1,$2,$3,$4)",
  [randomUUID(),id,subject,type]);
 return Object.freeze({
  testAgent(id,{projects=[]}={}){
   if(!agents.has(id)||!Array.isArray(projects)||projects.some(p=>!validId(p)))
    throw Error("UNKNOWN_TEST_AGENT_OR_PROJECT");
   const token=Object.freeze({});
   contexts.set(token,{kind:"agent",id,dept:agents.get(id).dept,projects:[...new Set(projects)]});
   return token;
  },
  testOwner(){
   const token=Object.freeze({});
   contexts.set(token,{kind:"owner"});
   return token;
  },
  async createCandidate(token,{content,projectId=null,sourceId="synthetic-ci",expiresAt=null}={}){
   const a=actor(token);
   if(!synthetic(content)||!validId(sourceId)||
      !(projectId===null||validId(projectId))||
      projectId!==null&&!a.projects.includes(projectId)||
      !(expiresAt===null||time(expiresAt)))
    throw Error("INVALID_SYNTHETIC_CANDIDATE");
   return sql.begin(async tx=>{
    const id=randomUUID(),digest=sha(content);
    const inserted=await tx.unsafe(
      "insert into scotty_b2_fixture_memory(memory_id,agent_id,department,project_id,content,content_sha256,source_id,expires_at) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing returning memory_id",
      [id,a.id,a.dept,projectId,content,digest,sourceId,expiresAt]);
    if(inserted.length){
     await audit(tx,id,"candidate",a.id);
     return {memoryId:id,status:"candidate",deduplicated:false,realOwnerApproval:false};
    }
    const [prior]=await tx.unsafe(
     "select memory_id,status from scotty_b2_fixture_memory where agent_id=$1 and coalesce(project_id,'')=$2 and content_sha256=$3 and status in ('candidate','accepted') limit 1",
     [a.id,projectId??"",digest]);
    if(!prior)throw Error("SYNTHETIC_DEDUPE_CONFLICT");
    return {memoryId:prior.memory_id,status:prior.status,deduplicated:true,realOwnerApproval:false};
   });
  },
  async acceptForTest(token,id){
   owner(token);
   return sql.begin(async tx=>{
    const r=await row(tx,id);
    if(r.status!=="candidate")throw Error("NOT_SYNTHETIC_CANDIDATE");
    await tx.unsafe("update scotty_b2_fixture_memory set status='accepted',updated_at=now() where memory_id=$1",[id]);
    await audit(tx,id,"accepted","test-owner");
    return {memoryId:id,acceptedInFixture:true,realOwnerApproval:false};
   });
  },
  async shareForTest(token,id,{scope,recipients=[],consentRef}={}){
   owner(token);
   if(!["department","project","explicit_shared"].includes(scope)||
      !validId(consentRef)||!consentRef.startsWith("synthetic-consent-")||
      !Array.isArray(recipients)||
      (scope!=="explicit_shared"&&recipients.length>0)||
      (scope==="explicit_shared"&&(recipients.length===0||
         new Set(recipients).size!==recipients.length||
         recipients.some(r=>!agents.has(r)))))
    throw Error("INVALID_SYNTHETIC_SHARE");
   return sql.begin(async tx=>{
    const r=await row(tx,id);
    if(r.status!=="accepted"||scope==="project"&&r.project_id===null)
     throw Error("SYNTHETIC_SHARE_REQUIRES_ACCEPTED_SCOPE");
    await tx.unsafe(
     "update scotty_b2_fixture_memory set scope=$1,recipients=$2,consent_ref=$3,updated_at=now() where memory_id=$4",
     [scope,sql.array(recipients,25),consentRef,id]);
    await audit(tx,id,"shared","test-owner");
    return {sharedOnlyInFixture:true,realConsentVerified:false};
   });
  },
  async find(token,{query,projectId=null,at="2026-11-08T12:00:00Z"}={}){
   const a=actor(token);
   if(typeof query!=="string"||!query.trim()||query.length>120||
      !(projectId===null||validId(projectId))||!time(at))
    throw Error("INVALID_SYNTHETIC_SEARCH");
   const rows=await q(
    "select memory_id,agent_id,department,project_id,scope,status,content,version,supersedes_id from scotty_b2_fixture_memory "+
    "where status='accepted' and data_class='SYNTHETIC_PUBLIC' and "+
    "(expires_at is null or expires_at > $1::timestamptz) and strpos(lower(content),lower($2::text))>0 "+
    "and ($3::text is null or project_id=$3) "+
    "and (project_id is null or project_id=any($4::text[])) and ("+
    "(scope='individual' and agent_id=$5) or "+
    "(scope='department' and department=$6) or "+
    "(scope='project' and project_id=any($4::text[])) or "+
    "(scope='explicit_shared' and $5=any(recipients))) order by created_at,memory_id",
    [at,query,projectId,sql.array(a.projects,25),a.id,a.dept]);
   return rows.map(r=>({memoryId:r.memory_id,canonicalAgentId:r.agent_id,
    department:r.department,projectId:r.project_id,scope:r.scope,
    content:r.content,version:r.version,supersedesId:r.supersedes_id,
    realDataAccess:false}));
  },
  async correctForTest(token,id,content){
   owner(token);
   if(!synthetic(content))throw Error("SYNTHETIC_CORRECTION_REQUIRED");
   return sql.begin(async tx=>{
    const old=await row(tx,id);
    if(old.status!=="accepted")throw Error("SYNTHETIC_CORRECTION_REQUIRES_ACCEPTED");
    await tx.unsafe("update scotty_b2_fixture_memory set status='superseded',updated_at=now() where memory_id=$1",[id]);
    const next=randomUUID();
    await tx.unsafe(
     "insert into scotty_b2_fixture_memory(memory_id,agent_id,department,project_id,content,content_sha256,source_id,expires_at,version,supersedes_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
     [next,old.agent_id,old.department,old.project_id,content,sha(content),old.source_id,
      old.expires_at,old.version+1,id]);
    await audit(tx,next,"corrected-pending","test-owner");
    return {memoryId:next,status:"candidate",version:old.version+1,
      supersedesId:id,realCorrectionPerformed:false};
   });
  },
  async deleteForTest(token,id){
   owner(token);
   return sql.begin(async tx=>{
    const old=await row(tx,id);
    if(old.status==="deleted")throw Error("ALREADY_DELETED");
    await tx.unsafe(
     "update scotty_b2_fixture_memory set status='deleted',content=null,content_sha256=null,recipients='{}'::text[],consent_ref=null,updated_at=now() where memory_id=$1",[id]);
    await audit(tx,id,"tombstoned","test-owner");
    return {syntheticTextDeleted:true,realDataDeletion:false,realBackupReconciliation:false};
   });
  },
  async expireForTest(token,at){
   owner(token);
   if(!time(at))throw Error("INVALID_TEST_CLOCK");
   return sql.begin(async tx=>{
    const rows=await tx.unsafe(
     "update scotty_b2_fixture_memory set status='deleted',content=null,content_sha256=null,recipients='{}'::text[],consent_ref=null,updated_at=now() where expires_at <= $1::timestamptz and status <> 'deleted' returning memory_id",
     [at]);
    for(const r of rows)await audit(tx,r.memory_id,"expired","test-owner");
    return {syntheticErased:rows.length,realRetentionEnforced:false};
   });
  },
  async auditForTest(token){
   owner(token);
   return q("select event_type,actor_id,memory_id,at from scotty_b2_fixture_audit order by at,event_id");
  },
  async status(){
   const [n]=await q("select count(*)::int as n from scotty_b2_fixture_memory");
   return {memoryRecords:n.n,disposableCiDatabase:true,realOwnerAuthentication:false,
     liveAgentAccess:false,privateDataImported:false};
  }
 });
}
