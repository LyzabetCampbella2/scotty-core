import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm,readFile,symlink,stat,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {openPrivateKnowledgeStore} from "./private-store.mjs";
const make=(id,extra={})=>({id,title:"Synthetic knowledge "+id,
 content:"PERSISTWORD-QUARTZ is a synthetic source about cybersecurity risks, evidence checks and harmless test details. No production data.",scope:"department",department:"Security & Defense",
 sourceType:"owner-file",citation:"SCOTTY private-store synthetic test",reviewedAt:"2026-10-24",approved:true,...extra});
async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),"scotty-private-knowledge-test-"));
 try{return await fn(root);}finally{await rm(root,{recursive:true,force:true});}
}
test("only accepts explicit dedicated local private-storage directories",async()=>{
 await assert.rejects(()=>openPrivateKnowledgeStore("/tmp/not-a-private-scotty-dir"),/dedicated/);
 await assert.rejects(()=>openPrivateKnowledgeStore("relative-folder"),/absolute/);
});
test("creates protected directory and persists reviewed sources across reopen",async()=>fixture(async root=>{
 const db=await openPrivateKnowledgeStore(root);
 const first=await db.upsert(make("test-document"),{expectedRevision:0});
 assert.equal(first.revision,1);
 const perms=(await stat(root)).mode&0o777;
 const filePerms=(await stat(join(root,"knowledge-v1.json"))).mode&0o777;
 assert.equal(perms,0o700);assert.equal(filePerms,0o600);
 const reopened=await openPrivateKnowledgeStore(root);
 const status=await reopened.status();
 assert.equal(status.recordCount,1);assert.equal(status.records[0].id,"test-document");
 const allowed=await reopened.search("chief-worf","PERSISTWORD-QUARTZ");
 assert.ok(allowed.results.some(r=>r.sourceId==="test-document"));
 const notAllowed=await reopened.search("chief-zora","PERSISTWORD-QUARTZ");
 assert.ok(!notAllowed.results.some(r=>r.sourceId==="test-document"));
}));
test("requires compare-and-swap revisions; maintains metadata-only local history",async()=>fixture(async root=>{
 const db=await openPrivateKnowledgeStore(root);
 const a=await db.upsert(make("versioned"),{expectedRevision:0});
 await assert.rejects(()=>db.upsert(make("versioned",{content:"different"}),{expectedRevision:0}),/REVIEW_CONFLICT/);
 const b=await db.upsert(make("versioned",{content:"SAFENEWCONTENT controlled test revision about cyber security research."}),{expectedRevision:1});
 assert.equal(b.revision,2);
 const raw=JSON.parse(await readFile(join(root,"knowledge-v1.json"),"utf8"));
 assert.equal(raw.audit.length,2);
 assert.ok(!JSON.stringify(raw.audit).includes("SAFENEWCONTENT"));
 assert.equal((await db.status()).records[0].revision,2);
 assert.ok((await db.search("chief-worf","SAFENEWCONTENT")).results.some(x=>x.sourceId==="versioned"));
 assert.ok(!(await db.search("chief-worf","PERSISTWORD-QUARTZ")).results.some(x=>x.sourceId==="versioned"));
}));
test("revokes knowledge in store and enforces project recipients",async()=>fixture(async root=>{
 const db=await openPrivateKnowledgeStore(root);
 const doc=make("project-note",{content:"PROJECTSWEEP-ORBIT evidence inside novel-alpha",
  scope:"project",projectId:"novel-alpha",department:undefined,allowedAgentIds:["agent-zora-01"]});
 await db.upsert(doc);
 const allowed=await db.search("agent-zora-01","PROJECTSWEEP-ORBIT",{projectId:"novel-alpha",authorizedProjectIds:["novel-alpha"]});
 assert.equal(allowed.results[0].sourceId,"project-note");
 assert.ok(!(await db.search("chief-zora","PROJECTSWEEP-ORBIT",{projectId:"novel-alpha",authorizedProjectIds:["novel-alpha"]})).results.some(r=>r.sourceId==="project-note"));
 assert.ok(!(await db.search("agent-zora-01","PROJECTSWEEP-ORBIT",{projectId:"novel-beta",authorizedProjectIds:["novel-beta"]})).results.some(r=>r.sourceId==="project-note"));
 assert.equal((await db.revoke("project-note",{expectedRevision:1})).status,"REVOKED_LOCALLY");
 assert.equal((await db.status()).recordCount,0);
 assert.equal((await db.search("agent-zora-01","PROJECTSWEEP-ORBIT",{projectId:"novel-alpha",authorizedProjectIds:["novel-alpha"]})).results.length,0);
}));
test("disallows unapproved material, unknown recipients and cross-department recipients",async()=>fixture(async root=>{
 const db=await openPrivateKnowledgeStore(root);
 await assert.rejects(()=>db.upsert(make("not-approved",{approved:false})),/approved/);
 await assert.rejects(()=>db.upsert(make("unknown-agent",{allowedAgentIds:["agent-no-such-identity"]})),/synthetic agent/);
 await assert.rejects(()=>db.upsert(make("wrong-dept",{allowedAgentIds:["chief-zora"]})),/recipient mismatch/);
 assert.equal((await db.status()).recordCount,0);
}));
test("rejects symlinked store file and tampered hashes; never repairs corrupt data silently",async()=>fixture(async root=>{
 const db=await openPrivateKnowledgeStore(root);
 const data=join(root,"knowledge-v1.json");
 await symlink("/etc/passwd",data);
 await assert.rejects(()=>db.status(),/symbolic link/);
 await rm(data);
 await db.upsert(make("tamper"));
 const s=JSON.parse(await readFile(data,"utf8"));
 s.records[0].document.content="tampered";
 await writeFile(data,JSON.stringify(s));
 await assert.rejects(()=>db.status(),/checksum mismatch/);
}));
test("no implicit network calls or production backend dependencies",async()=>fixture(async root=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=()=>{calls++;throw Error("Not allowed");};
 try{
  const db=await openPrivateKnowledgeStore(root);
  await db.upsert(make("safe"));
  const plan=await db.createRetrievalPlan("cybersecurity risk and evidence");
  assert.equal(plan.productionWrites,0);
  assert.equal(plan.providerCalls,0);
  assert.equal(calls,0);
 }finally{globalThis.fetch=previous;}
}));
