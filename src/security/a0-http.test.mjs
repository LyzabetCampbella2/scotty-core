import test from "node:test";
import assert from "node:assert/strict";
import { handleA0 as rawHandleA0 } from "./a0-http.mjs";
// Test-only verifier stub; the actual SCOTTY server installs no verifier and cannot mint grants.
const handleA0=(req,url,options={})=>rawHandleA0(req,url,{verifyOwnerEvidence:async()=>true,...options});

const base="https://scotty-staging.example/api/a0";
const token="a".repeat(56);
const original={};
for(const k of ["SCOTTY_A0_ENABLED","SCOTTY_A0_ENV","SCOTTY_A0_ADMIN_TOKEN","SCOTTY_A0_OWNER_ID","SCOTTY_A0_CLAIM_TESTS_ENABLED"]) original[k]=process.env[k];
const restore=()=>{for(const [k,v] of Object.entries(original)){if(v===undefined)delete process.env[k];else process.env[k]=v;}};
const config=()=>{
 process.env.SCOTTY_A0_ENABLED="true";
 process.env.SCOTTY_A0_ENV="staging";
 process.env.SCOTTY_A0_ADMIN_TOKEN=token;
 process.env.SCOTTY_A0_OWNER_ID="owner-1";
 delete process.env.SCOTTY_A0_CLAIM_TESTS_ENABLED;
};
const grantInput=()=>({
 agentId:"agent-spock-01",taskId:"task-1",projectId:"project-1",
 action:"read-public",resourceId:"public-doc-1",accountId:"",channelId:"",
 revision:"rev-1",toolId:"web-read",dataClass:"SYNTHETIC_PUBLIC",
 approvalEvidenceId:"owner-review-1",expiresAt:"2026-11-07T15:00:00Z",
 maxSpendUsd:0,ownerApproved:true
});
function req(path,{method="GET",body,auth=token,origin=base.replace("/api/a0",""),csrf=true,contentType="application/json"}={}){
 const headers={};
 if(auth)headers.authorization="Bearer "+auth;
 if(origin)headers.origin=origin;
 if(body!==undefined){headers["content-type"]=contentType;if(csrf)headers["x-scotty-a0-csrf"]="1";}
 return new Request(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
}
const fake=()=>{
 const records=[];
 return {records,status:async()=>({stopAll:true,enabled:false,externalExecutionEnabled:false}),
  listGrants:async()=>records,
  createGrant:async grant=>{records.push(grant);return grant;},
  revokeGrant:async id=>({grantId:id,status:"revoked"}),
  stopAll:async()=>({stopAll:true,enabled:false}),
  claim:async()=>({permitted:false,reason:"emergency-stop-or-unconfigured"})
 };
};
async function status(response){return response.status;}
test("A0 owner HTTP: fail-closed behavior, no real database or providers",async t=>{
 try {
  const store=fake(),now=new Date("2026-11-07T12:00:00Z");
  config();
  await t.test("disabled by default flag",async()=>{
    delete process.env.SCOTTY_A0_ENABLED;
    let reached=false;
    const r=await handleA0(req("/status"),new URL(base+"/status"),{storeFactory:async()=>{reached=true;return store;}});
    assert.equal(r.status,503);assert.equal(reached,false);
    config();
  });
  await t.test("production environment denied",async()=>{
    process.env.SCOTTY_A0_ENV="production";
    assert.equal(await status(await handleA0(req("/status"),new URL(base+"/status"),{store})),503);
    config();
  });
  await t.test("missing long token denied",async()=>{
    process.env.SCOTTY_A0_ADMIN_TOKEN="tiny";
    assert.equal(await status(await handleA0(req("/status"),new URL(base+"/status"),{store})),503);
    config();
  });
  await t.test("invalid bearer denied",async()=>{
    assert.equal(await status(await handleA0(req("/status",{auth:"x".repeat(56)}),new URL(base+"/status"),{store})),401);
  });
  await t.test("bearer-only refuses cookies",async()=>{
    const r=new Request(base+"/status",{headers:{"cookie":"scotty_owner_session="+token}});
    assert.equal(await status(await handleA0(r,new URL(r.url),{store})),401);
  });
  await t.test("cross-origin denied",async()=>{
    assert.equal(await status(await handleA0(req("/status",{origin:"https://other.example"}),new URL(base+"/status"),{store})),403);
  });
  await t.test("cross-origin write never calls store",async()=>{
    let calls=0;
    const testStore={...store,createGrant:async()=>{calls++;return {};}};
    const q=req("/grants",{method:"POST",body:grantInput(),origin:"https://evil.example"});
    assert.equal(await status(await handleA0(q,new URL(q.url),{store:testStore,now})),403);
    assert.equal(calls,0);
  });
  await t.test("owner write requires confirmation header",async()=>{
    const q=req("/grants",{method:"POST",body:grantInput(),csrf:false});
    assert.equal(await status(await handleA0(q,new URL(q.url),{store,now})),403);
  });
  await t.test("explicit approval intent is required",async()=>{
    const b=grantInput();delete b.ownerApproved;
    const q=req("/grants",{method:"POST",body:b});
    assert.equal(await status(await handleA0(q,new URL(q.url),{store,now})),400);
  });
  await t.test("rejects unbounded expiry",async()=>{
    const b=grantInput();b.expiresAt="2026-11-09T15:00:00Z";
    const q=req("/grants",{method:"POST",body:b});
    assert.equal(await status(await handleA0(q,new URL(q.url),{store,now})),400);
  });
  await t.test("rejects positive spending at A0",async()=>{
    const b=grantInput();b.maxSpendUsd=0.01;
    const q=req("/grants",{method:"POST",body:b});
    assert.equal(await status(await handleA0(q,new URL(q.url),{store,now})),400);
  });
  await t.test("rejects cross-project wildcard",async()=>{
    const b=grantInput();b.projectId="*";
    const q=req("/grants",{method:"POST",body:b});
    assert.equal(await status(await handleA0(q,new URL(q.url),{store,now})),400);
  });
  await t.test("caller-supplied approval flag cannot mint a grant when verifier absent",async()=>{
    const before=store.records.length;
    const q=req("/grants",{method:"POST",body:grantInput()});
    const r=await rawHandleA0(q,new URL(q.url),{store,now});
    assert.equal(r.status,503);
    assert.equal(store.records.length,before);
  });
  await t.test("unverified grant request cannot even open staging storage",async()=>{
    const q=req("/grants",{method:"POST",body:grantInput()});
    let reached=false;
    const r=await rawHandleA0(q,new URL(q.url),{
      now,storeFactory:async()=>{reached=true;throw Error("Store should not open");}
    });
    assert.equal(r.status,503);
    assert.equal(reached,false);
  });
  await t.test("a verifier rejection cannot mint a grant",async()=>{
    const before=store.records.length;
    const q=req("/grants",{method:"POST",body:grantInput()});
    const r=await handleA0(q,new URL(q.url),{store,now,verifyOwnerEvidence:async()=>false});
    assert.equal(r.status,403);
    assert.equal(store.records.length,before);
  });
  await t.test("verifier checks exact owner and project scope arguments",async()=>{
    const q=req("/grants",{method:"POST",body:grantInput()});
    const seen=[];
    const result=await handleA0(q,new URL(q.url),{store,now,
      verifyOwnerEvidence:async(scope)=>{seen.push(scope);return false;}});
    assert.equal(result.status,403);
    assert.equal(seen.length,1);
    assert.equal(seen[0].ownerId,"owner-1");
    assert.equal(seen[0].projectId,"project-1");
    assert.equal(seen[0].approvalEvidenceId,"owner-review-1");
  });
  await t.test("exact owner-reviewed staging grant stays a record",async()=>{
    const q=req("/grants",{method:"POST",body:grantInput()});
    const r=await handleA0(q,new URL(q.url),{store,now});
    assert.equal(r.status,201);
    const g=(await r.json()).grant;
    assert.equal(g.ownerId,"owner-1");assert.equal(g.maxUses,1);assert.equal(g.maxSpendUsd,0);
    assert.equal(g.projectId,"project-1");assert.equal(g.ownerApproved,true);
    assert.equal(store.records.length,1);
  });
  await t.test("owner can list existing grant records",async()=>{
    const r=await handleA0(req("/grants"),new URL(base+"/grants"),{store,now});
    assert.equal(r.status,200);assert.equal((await r.json()).grants.length,1);
  });
  await t.test("claim path disabled by separate flag",async()=>{
    const q=req("/claims",{method:"POST",body:{grantId:"some-id"}});
    assert.equal(await status(await handleA0(q,new URL(q.url),{store,now})),503);
  });
  await t.test("emergency stop only blocks, never arms",async()=>{
    const q=req("/stop-all",{method:"POST",body:{}});
    const r=await handleA0(q,new URL(q.url),{store,now});
    assert.equal(r.status,200);
    assert.deepEqual((await r.json()).status,{stopAll:true,enabled:false});
  });
  await t.test("revoke targets exact grant ID",async()=>{
    const id=store.records[0].grantId;
    const q=req("/grants/"+id+"/revoke",{method:"POST",body:{}});
    const r=await handleA0(q,new URL(q.url),{store,now});
    assert.equal((await r.json()).grant.status,"revoked");
  });
  await t.test("no unsupported methods",async()=>{
    const q=req("/status",{method:"HEAD"});
    assert.equal(await status(await handleA0(q,new URL(q.url),{store})),405);
  });
 }finally{restore();}
});
