import test from "node:test";
import assert from "node:assert/strict";
import {handleIndependentBrain} from "./independent-bridge.mjs";

const PREFIX="https://scotty-core.onrender.com/api/independent-brain";
const TOKEN="test-scotty-staging-owner-token-0123456789";
const ENV={
 SCOTTY_INDEPENDENT_BRAIN_ENABLED:"true",
 SCOTTY_INDEPENDENT_BRAIN_URL:"https://scotty-independent-ipad-brain-lab.example.workers.dev",
 SCOTTY_INDEPENDENT_BRAIN_TOKEN:TOKEN,
};
function request(path,{method="GET",data,origin=undefined}={}){
 const url=PREFIX+"/"+path;
 return new Request(url,{
  method,headers:{"cookie":"scotty_session=owner-private-test-cookie",
   ...(data?{"content-type":"application/json"}:{}),...(origin?{origin}:{})},
  ...(data?{body:JSON.stringify(data)}:{})
 });
}
async function run(path,{env=ENV,authenticated=true,method="GET",data,origin}={}){
 let calls=0,last;
 const req=request(path,{method,data,origin});
 const result=await handleIndependentBrain(req,new URL(req.url),{
  env,authenticated:async()=>authenticated,
  fetcher:async(url,options)=>{
   calls++;last={url,options};
   return Response.json({ok:true,status:"ISOLATED_CLOUDFLARE_BRAIN_LAB"});
  }
 });
 return {calls,last,status:result.status,data:await result.json()};
}
test("fails closed with no enabled bridge or owner session",async()=>{
 const disabled=await run("status",{env:{...ENV,SCOTTY_INDEPENDENT_BRAIN_ENABLED:"false"}});
 assert.equal(disabled.status,503);assert.equal(disabled.calls,0);
 const unauth=await run("status",{authenticated:false});
 assert.equal(unauth.status,401);assert.equal(unauth.calls,0);
});
test("blocks missing credentials and unsafe worker hosts",async()=>{
 for(const env of [
  {...ENV,SCOTTY_INDEPENDENT_BRAIN_TOKEN:"short"},
  {...ENV,SCOTTY_INDEPENDENT_BRAIN_URL:"http://example.workers.dev"},
  {...ENV,SCOTTY_INDEPENDENT_BRAIN_URL:"https://localhost"},
  {...ENV,SCOTTY_INDEPENDENT_BRAIN_URL:"https://a.workers.dev/other"},
  {...ENV,SCOTTY_INDEPENDENT_BRAIN_URL:"https://a.workers.dev:1234"},
 ]){const x=await run("status",{env});assert.equal(x.status,503);assert.equal(x.calls,0);}
});
test("forwards only allowlisted routes; never forwards cookie, password or browser token",async()=>{
 const safe=await run("catalog");
 assert.equal(safe.status,200);assert.equal(safe.calls,1);
 assert.equal(safe.last.options.headers.authorization,"Bearer "+TOKEN);
 assert.equal(safe.last.options.headers.cookie,undefined);
 assert.equal(safe.last.options.redirect,"error");
 for(const path of ["admin","status/../status","/api/auth","catalog?secret=leak"]){
  const x=await run(path);assert.notEqual(x.status,200);assert.equal(x.calls,0);
 }
});
test("planning is available without AI and stays bounded",async()=>{
 const okay=await run("plan",{method:"POST",data:{question:"Review a synthetic testing plan"}});
 assert.equal(okay.status,200);assert.equal(okay.calls,1);
 const long=await run("plan",{method:"POST",data:{question:"x".repeat(501)}});
 assert.equal(long.status,400);assert.equal(long.calls,0);
 const cross=await run("plan",{method:"POST",origin:"https://attacker.example",data:{question:"testing"}});
 assert.equal(cross.status,403);assert.equal(cross.calls,0);
});
test("team AI requires BOTH bridge flag and all owner disclosures",async()=>{
 const data={question:"Synthetic plan",ownerApproved:true,shareWithCloudflare:true,noPrivateDataConfirmed:true};
 const blocked=await run("team",{method:"POST",data});
 assert.equal(blocked.status,503);assert.equal(blocked.calls,0);
 const enabled={...ENV,SCOTTY_INDEPENDENT_BRAIN_AI_PROXY_ENABLED:"true"};
 const missing=await run("team",{method:"POST",data:{...data,noPrivateDataConfirmed:false},env:enabled});
 assert.equal(missing.status,403);assert.equal(missing.calls,0);
 const success=await run("team",{method:"POST",data,env:enabled});
 assert.equal(success.status,200);assert.equal(success.calls,1);
 assert.equal(JSON.parse(success.last.options.body).question,"Synthetic plan");
});
test("persistent memory writes require separately enabled proxy and explicit review",async()=>{
 const data={agentId:"agent-geordi-01",scope:"individual",content:"synthetic",approved:true,noPrivateDataConfirmed:true};
 const off=await run("memory",{method:"POST",data});assert.equal(off.status,503);assert.equal(off.calls,0);
 const env={...ENV,SCOTTY_INDEPENDENT_BRAIN_MEMORY_PROXY_ENABLED:"true"};
 const denied=await run("memory",{method:"POST",env,data:{...data,approved:false}});
 assert.equal(denied.status,403);assert.equal(denied.calls,0);
 const yes=await run("memory",{method:"POST",env,data});assert.equal(yes.status,200);assert.equal(yes.calls,1);
 const noAgent=await run("memory?agentId=../../bad",{env});assert.equal(noAgent.status,400);assert.equal(noAgent.calls,0);
});
