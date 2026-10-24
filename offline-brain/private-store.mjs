/**
 * S.C.O.T.T.Y. Phase 3 — PRIVATE LOCAL storage of owner-reviewed knowledge.
 *
 * No database, network, Groq, xAI, production or backup integration.
 * The caller MUST supply an explicit path to a new dedicated local directory.
 * Atomic file replacement + exclusive write lock + metadata-only audit events.
 * Prototype for one local writer. NOT hardened production multi-user storage.
 */
import {constants} from "node:fs";
import {mkdir,lstat,readFile,open,rename,rm,chmod} from "node:fs/promises";
import {isAbsolute,basename,join,resolve} from "node:path";
import {randomUUID,createHash} from "node:crypto";
import {createOfflineBrain} from "./engine.mjs";
import {buildSyntheticRoster} from "./catalog.mjs";

const MAX_BYTES=24*1024*1024;
const MAX_DOCS=1500;
const names=new Set(buildSyntheticRoster().map(a=>a.id));
const digest=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
function assert(condition,message){if(!condition)throw Error(message);}
function normalize(x) {
  assert(x&&typeof x==="object"&&!Array.isArray(x),"Reviewed source object required");
  const copy={
    id:x.id,title:x.title,content:x.content,scope:x.scope,
    sourceType:x.sourceType,citation:x.citation,reviewedAt:x.reviewedAt,approved:x.approved,
    ...(x.department?{department:x.department}:{}),
    ...(x.projectId?{projectId:x.projectId}:{}),
    ...(x.url?{url:x.url}:{})
  };
  const allowedAgentIds=x.allowedAgentIds??[];
  assert(Array.isArray(allowedAgentIds)&&allowedAgentIds.every(a=>names.has(a)),"Recipients must have an existing synthetic agent ID");
  if(allowedAgentIds.length)copy.allowedAgentIds=[...allowedAgentIds];
  if(copy.scope==="department")assert(allowedAgentIds.every(id=>buildSyntheticRoster().find(a=>a.id===id)?.department===copy.department),"Department recipient mismatch");
  // Reuse Phase 1's record provenance + project/department validation.
  createOfflineBrain({documents:[copy]});
  return copy;
}
const fresh=()=>({schemaVersion:1,records:[],audit:[],sequence:0});
async function secureRead(file){
  let stat;
  try{stat=await lstat(file)}catch(e){if(e.code==="ENOENT")return null;throw e;}
  assert(stat.isFile()&&!stat.isSymbolicLink(),"Refusing nonregular file or symbolic link");
  assert(stat.size>0&&stat.size<=MAX_BYTES,"Knowledge store is missing, empty or exceeds configured capacity");
  const fd=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    const v=JSON.parse(await fd.readFile({encoding:"utf8"}));
    assert(v?.schemaVersion===1&&Array.isArray(v.records)&&Array.isArray(v.audit)&&Number.isSafeInteger(v.sequence),"Unrecognized private knowledge snapshot");
    assert(v.records.length<=MAX_DOCS&&v.audit.length<=5000,"Private knowledge store quota exceeded");
    const ids=new Set();
    for(const r of v.records){
      assert(r?.revision>0&&Number.isSafeInteger(r.revision)&&r?.document&&r?.hash,"Malformed private knowledge record");
      const checked=normalize(r.document);
      assert(digest(checked)===r.hash,"Local knowledge checksum mismatch");
      assert(!ids.has(r.document.id),"Duplicate stored knowledge IDs");
      ids.add(r.document.id);
    }
    return v;
  } finally { await fd.close(); }
}
async function safeReplace(file,root,body){
  assert(Buffer.byteLength(body,"utf8")<MAX_BYTES,"Private knowledge snapshot exceeds quota");
  const temp=join(root,".knowledge-"+randomUUID()+".tmp");
  let fd;
  try{
    fd=await open(temp,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
    await fd.writeFile(body,{encoding:"utf8"});
    await fd.sync();
    await fd.close();fd=undefined;
    await rename(temp,file);
    await chmod(file,0o600);
  }finally{if(fd)await fd.close();await rm(temp,{force:true}).catch(()=>{});}
}
export async function openPrivateKnowledgeStore(root){
  assert(typeof root==="string"&&isAbsolute(root)&&basename(resolve(root)).startsWith("scotty-private-knowledge"),"An absolute, dedicated scotty-private-knowledge directory is required");
  const dir=resolve(root),data=join(dir,"knowledge-v1.json"),lock=join(dir,".knowledge-write.lock");
  // mkdir cannot be used to overwrite an existing symlink.
  await mkdir(dir,{recursive:true,mode:0o700});
  const stat=await lstat(dir);
  assert(stat.isDirectory()&&!stat.isSymbolicLink(),"Private knowledge directory must be a real directory");
  await chmod(dir,0o700);
  const read=async()=>await secureRead(data)||fresh();
  const withLock=async mutate=>{
    const fd=await open(lock,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
    try{
      const value=await read();
      const result=mutate(value);
      assert(value.records.length<=MAX_DOCS,"Private knowledge store full");
      value.audit=value.audit.slice(-5000);
      await safeReplace(data,dir,JSON.stringify(value,null,2)+"\n");
      return result;
    }finally{await fd.close();await rm(lock,{force:true});}
  };
  return Object.freeze({
    path:dir,
    async status(){
      const s=await read();
      return {schemaVersion:1,recordCount:s.records.length,events:s.audit.length,sequence:s.sequence,
        records:s.records.map(r=>({id:r.document.id,revision:r.revision,hash:r.hash,scope:r.document.scope,reviewedAt:r.document.reviewedAt,updatedAt:r.updatedAt})),
        networkCalls:0,providerCalls:0,productionWrites:0};
    },
    async upsert(document,{expectedRevision=0,reviewedBy="owner",now=new Date()}={}){
      const clean=normalize(document);
      assert(typeof reviewedBy==="string"&&/^[a-z0-9._:-]{1,80}$/i.test(reviewedBy),"Named owner reviewer required");
      assert(Number.isSafeInteger(expectedRevision)&&expectedRevision>=0,"Expected revision required");
      assert(now instanceof Date&&Number.isFinite(now.getTime()),"Invalid update timestamp");
      return withLock(s=>{
        const previous=s.records.find(r=>r.document.id===clean.id);
        assert((previous?.revision||0)===expectedRevision,"REVIEW_CONFLICT: knowledge changed since last review");
        const revision=expectedRevision+1,hash=digest(clean),updatedAt=now.toISOString();
        if(previous){previous.document=clean;previous.hash=hash;previous.revision=revision;previous.updatedAt=updatedAt;}
        else s.records.push({document:clean,revision,hash,updatedAt});
        s.sequence++;
        s.audit.push({sequence:s.sequence,id:clean.id,action:previous?"revision":"approved",revision,hash,updatedAt,reviewedBy});
        return {id:clean.id,revision,hash,updatedAt,status:"OWNER_REVIEWED_LOCAL_ONLY",productionWrites:0};
      });
    },
    async revoke(id,{expectedRevision,reviewedBy="owner",now=new Date()}={}){
      assert(typeof id==="string"&&/^[a-z0-9._:-]{1,160}$/i.test(id),"Valid ID required");
      assert(Number.isSafeInteger(expectedRevision)&&expectedRevision>0,"Expected existing revision required");
      return withLock(s=>{
        const i=s.records.findIndex(r=>r.document.id===id);
        assert(i>=0&&s.records[i].revision===expectedRevision,"REVIEW_CONFLICT: source missing or revision changed");
        s.records.splice(i,1);s.sequence++;
        s.audit.push({sequence:s.sequence,id,action:"revoked",previousRevision:expectedRevision,updatedAt:now.toISOString(),reviewedBy});
        return {id,status:"REVOKED_LOCALLY",productionWrites:0};
      });
    },
    async search(agentId,question,context={}){
      const s=await read();
      const b=createOfflineBrain({documents:s.records.map(r=>r.document)});
      return b.search(agentId,question,context);
    },
    async createRetrievalPlan(question,context={}){
      const s=await read();
      const b=createOfflineBrain({documents:s.records.map(r=>r.document)});
      return b.plan(question,context);
    }
  });
}
