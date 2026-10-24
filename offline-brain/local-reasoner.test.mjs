import test from "node:test";
import assert from "node:assert/strict";
import {createLocalReasoner} from "./local-reasoner.mjs";
const evidence=[{sourceId:"approved-syn-1",title:"Synthetic verified research note",citation:"Synthetic test citation",excerpt:"QUARTZ-BRIDGE is a fictional technical method used for test-only source citation."}];
test("local reasoning is disconnected by default and makes zero calls",async()=>{
 let calls=0;
 const r=createLocalReasoner({fetcher:()=>{calls++;throw Error("Network unexpectedly accessed")}});
 assert.equal(r.config.groqConnected,false);
 assert.equal(r.config.grokConnected,false);
 assert.equal(r.preview({agentId:"agent-geordi-01",question:"Explain code testing"}).allowedToRun,false);
 await assert.rejects(()=>r.ask({agentId:"agent-geordi-01",question:"Explain code testing"}),/LOCAL_MODEL_DISABLED/);
 assert.equal(calls,0);
});
test("disallows cloud models and remote endpoint changes",()=>{
 for(const bad of ["gpt-oss:120b-cloud","hosted/model:latest","anything:remote","with spaces","https://ollama.com"])assert.throws(()=>createLocalReasoner({enabled:true,model:bad}),/non-cloud/);
 const r=createLocalReasoner({enabled:true,model:"llama3.2:3b",fetcher:async()=>{}});
 assert.equal(r.config.host,"127.0.0.1");
});
test("local answers require explicit permission before including reviewed excerpts",async()=>{
 let calls=0;
 const r=createLocalReasoner({enabled:true,model:"llama3.2:3b",fetcher:()=>{calls++;throw Error("Unexpected network");}});
 await assert.rejects(()=>r.ask({agentId:"agent-geordi-01",question:"Explain QUARTZ-BRIDGE",evidence}),/OWNER_APPROVAL_REQUIRED/);
 assert.equal(calls,0);
});
test("only preinstalled LOCAL model can run; no pull or cloud calls",async()=>{
 const urls=[];
 const fetcher=async(url,opts)=>{
  urls.push({url,method:opts.method,redirect:opts.redirect,body:opts.body??""});
  if(url.endsWith("/api/tags"))return new Response(JSON.stringify({models:[{name:"llama3.2:3b",model:"llama3.2:3b",size:2_000_000_000}]}),{status:200,headers:{"content-type":"application/json"}});
  if(url.endsWith("/api/generate"))return new Response(JSON.stringify({model:"llama3.2:3b",response:"Synthetic reviewed answer [Source 1]",done:true}),{status:200,headers:{"content-type":"application/json"}});
  throw Error("Unexpected route");
 };
 const r=createLocalReasoner({enabled:true,model:"llama3.2:3b",fetcher});
 const out=await r.ask({agentId:"agent-geordi-01",question:"Explain QUARTZ-BRIDGE",evidence,allowLocalKnowledgeAccess:true});
 assert.equal(out.modelUsed,"llama3.2:3b");assert.equal(out.groqCalls,0);assert.equal(out.grokCalls,0);
 assert.equal(out.productionWrites,0);assert.equal(out.unverifiedModelDraft,true);
 assert.deepEqual(urls.map(u=>u.url),["http://127.0.0.1:11434/api/tags","http://127.0.0.1:11434/api/generate"]);
 assert.ok(urls.every(u=>u.redirect==="error"));
 assert.equal(urls[1].method,"POST");
 const body=JSON.parse(urls[1].body);
 assert.equal(body.stream,false);assert.ok(body.prompt.includes("QUARTZ-BRIDGE"));assert.ok(body.system.includes("untrusted"));
 assert.ok(!JSON.stringify(body).includes("DATABASE_URL"));
});
test("local model is rejected when not installed and never pulls it automatically",async()=>{
 let requests=0;
 const fetcher=async(url)=>{requests++;return new Response(JSON.stringify({models:[]}),{status:200});};
 const r=createLocalReasoner({enabled:true,model:"llama3.2:3b",fetcher});
 await assert.rejects(()=>r.ask({agentId:"chief-data",question:"Give a research outline"}),/LOCAL_MODEL_NOT_INSTALLED/);
 assert.equal(requests,1);
});
test("rejects unexpected model response rather than treating it as reliable knowledge",async()=>{
 const fetcher=async url=>new Response(JSON.stringify(url.endsWith("/api/tags")?{models:[{name:"llama3.2:3b",size:2000000}]}:{response:"missing done"}),{status:200});
 const r=createLocalReasoner({enabled:true,model:"llama3.2:3b",fetcher});
 await assert.rejects(()=>r.ask({agentId:"chief-data",question:"Report on synthetic science"}),/Unexpected local inference response/);
});
test("malformed sources and oversized questions fail before any connection",async()=>{
 let called=0;
 const r=createLocalReasoner({enabled:true,model:"llama3.2:3b",fetcher:()=>{called++;throw Error("Unexpected call");}});
 await assert.rejects(()=>r.ask({agentId:"",question:"Hi"}),/Agent ID/);
 await assert.rejects(()=>r.ask({agentId:"chief-data",question:"x".repeat(5000)}),/Question required/);
 await assert.rejects(()=>r.ask({agentId:"chief-data",question:"Hi",evidence:[{title:"missing fields"}]}),/Only scoped/);
 assert.equal(called,0);
});
