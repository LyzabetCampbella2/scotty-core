import test from "node:test";
import assert from "node:assert/strict";
import {localMachineSummary,inspectInstalledLocalModel} from "./local-readiness.mjs";

test("readiness reports only safe aggregate local hardware hints",()=>{
 const s=localMachineSummary({system:{
  totalmem:()=>16*1024**3,freemem:()=>8*1024**3,
  cpus:()=>[{}, {}, {}, {}],arch:()=> "arm64",platform:()=> "darwin"
 }});
 assert.equal(s.physicalRAMGiB,16);assert.equal(s.currentlyAvailableRAMGiB,8);
 assert.equal(s.suitability,"NOT_EVALUATED");
 assert.equal(s.networkCalls,0);assert.equal(s.productionWrites,0);
 assert.ok(!Object.keys(s).includes("hostname"));
});
test("disabled readiness never calls local endpoint",async()=>{
 let calls=0;
 const v=await inspectInstalledLocalModel({enabled:false,model:"llama3.2:3b",fetcher:()=>{calls++;throw Error("must not call")}});
 assert.equal(calls,0);assert.equal(v.state,"DISABLED");
});
test("probe only a locally named installed model on pinned loopback",async()=>{
 const seen=[];
 const fetcher=async(url,options)=>{
  seen.push({url,opts:options});
  return new Response(JSON.stringify({models:[{name:"llama3.2:3b",model:"llama3.2:3b",size:1234567890}]}),{status:200});
 };
 const v=await inspectInstalledLocalModel({enabled:true,model:"llama3.2:3b",fetcher});
 assert.equal(v.modelPresent,true);assert.equal(v.modelDiskBytes,1234567890);
 assert.equal(seen.length,1);
 assert.equal(seen[0].url,"http://127.0.0.1:11434/api/tags");
 assert.equal(seen[0].opts.redirect,"error");
 assert.equal(seen[0].opts.method,"GET");
 assert.equal(seen[0].opts.headers.authorization,undefined);
});
test("cloud model names rejected before network",async()=>{
 let calls=0;
 await assert.rejects(()=>inspectInstalledLocalModel({enabled:true,model:"my-model:cloud",fetcher:()=>{calls++}}),/local model/);
 assert.equal(calls,0);
});
test("wrong or absent model is not considered ready",async()=>{
 const fetcher=async()=>new Response(JSON.stringify({models:[{name:"different:latest",model:"different:latest",size:2000000000}]}),{status:200});
 const r=await inspectInstalledLocalModel({enabled:true,model:"llama3.2:3b",fetcher});
 assert.equal(r.modelPresent,false);
 assert.equal(r.state,"MODEL_NOT_INSTALLED_OR_CLOUD");
});
test("refuse model metadata redirects or errors instead of falling back to cloud",async()=>{
 const fetcher=async()=>new Response("",{status:302});
 await assert.rejects(()=>inspectInstalledLocalModel({enabled:true,model:"llama3.2:3b",fetcher}),/No local Ollama/);
});
