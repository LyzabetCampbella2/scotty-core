import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {openPrivateKnowledgeStore} from "./private-store.mjs";
import {createLocalReasoner} from "./local-reasoner.mjs";
import {createAgentInference,evaluateLocalDraft} from "./agent-inference.mjs";
import {buildSyntheticRoster} from "./catalog.mjs";

const doc=(id,scope,extra={})=>({
  id,title:"Reviewed synthetic source "+id,
  content:"CODEWORD-VELVET describes a completely fictional engineering test harness with coverage metrics and reference specifications.",
  scope,department:"Engineering & Systems",
  citation:"Owner-approved fictional test reference / "+id,sourceType:"owner-file",
  reviewedAt:"2026-10-24",approved:true,...extra});
async function withStore(fn){
 const dir=await mkdtemp(join(tmpdir(),"scotty-private-knowledge-phase4-"));
 try{return await fn(await openPrivateKnowledgeStore(dir));}
 finally{await rm(dir,{recursive:true,force:true});}
}
function localMock(count={requests:[]},answer="The fictional engineering harness has reference specifications [Source 1]."){
 return createLocalReasoner({enabled:true,model:"llama3.2:3b",fetcher:async (url,opts)=>{
  count.requests.push({url,method:opts.method,body:opts.body||""});
  if(url.endsWith("/api/tags"))
   return new Response(JSON.stringify({models:[{name:"llama3.2:3b",model:"llama3.2:3b",size:1800000000}]}),{status:200});
  if(url.endsWith("/api/generate"))
   return new Response(JSON.stringify({response:answer,done:true}),{status:200});
  throw Error("Unexpected URL "+url);
 }});
}
test("128 synthetic profiles visible in phase 4, without a provider connection",async()=>withStore(async store=>{
 const runner=createAgentInference({store});
 assert.equal(runner.state.agentCount,128);
 assert.equal(buildSyntheticRoster().filter(a=>a.isChief).length,12);
 assert.equal(runner.state.status,"DISCONNECTED");
 assert.equal(runner.state.groqConnected,false);
 assert.equal(runner.state.productionConnected,false);
 await assert.rejects(()=>runner.answer({agentId:"chief-geordi",question:"CODEWORD-VELVET",ownerApproved:true}),/LOCAL_MODEL_DISABLED/);
}));
test("rejects evidence-free generated claims even with an enabled local model",async()=>withStore(async store=>{
 const count={requests:[]},runner=createAgentInference({store,reasoner:localMock(count)});
 const p=await runner.preview({agentId:"agent-geordi-01",question:"CODEWORD-VELVET"});
 assert.equal(p.status,"NO_APPROVED_DOMAIN_EVIDENCE");
 await assert.rejects(()=>runner.answer({agentId:"agent-geordi-01",question:"CODEWORD-VELVET",ownerApproved:true}),/NO_APPROVED_DOMAIN_EVIDENCE/);
 assert.equal(count.requests.length,0);
}));
test("generates only after private source retrieval and direct owner consent",async()=>withStore(async store=>{
 await store.upsert(doc("engineering-one","department",{allowedAgentIds:["agent-geordi-01"]}),{expectedRevision:0});
 const count={requests:[]},runner=createAgentInference({store,reasoner:localMock(count)});
 const p=await runner.preview({agentId:"agent-geordi-01",question:"CODEWORD-VELVET"});
 assert.equal(p.status,"EVIDENCE_READY");assert.equal(p.sourceCount,1);
 assert.equal(p.citations[0],"engineering-one");
 await assert.rejects(()=>runner.answer({agentId:"agent-geordi-01",question:"CODEWORD-VELVET"}),/OWNER_APPROVAL_REQUIRED/);
 assert.equal(count.requests.length,0);
 const result=await runner.answer({agentId:"agent-geordi-01",question:"CODEWORD-VELVET",ownerApproved:true});
 assert.equal(result.status,"UNVERIFIED_LOCAL_DRAFT");
 assert.equal(result.evaluation.verdict,"requires_factual_review");
 assert.deepEqual(result.evaluation.citedSourceIds,["engineering-one"]);
 assert.equal(result.productionWrites,0);assert.equal(result.groqCalls,0);assert.equal(result.grokCalls,0);
 assert.equal(result.automaticPublication,false);assert.equal(result.automaticMemoryTraining,false);
 assert.deepEqual(count.requests.map(x=>new URL(x.url).hostname),["127.0.0.1","127.0.0.1"]);
 const payload=JSON.parse(count.requests[1].body);
 assert.ok(payload.prompt.includes("CODEWORD-VELVET"));
 assert.ok(payload.prompt.includes("Owner-approved fictional test reference"));
}));
test("department and project boundaries prevent source-bearing inference",async()=>withStore(async store=>{
 await store.upsert(doc("private-code","department",{allowedAgentIds:["agent-geordi-01"]}));
 await store.upsert(doc("project-code","project",{projectId:"p-one",department:undefined,allowedAgentIds:["agent-zora-01"]}));
 const count={requests:[]},runner=createAgentInference({store,reasoner:localMock(count)});
 assert.equal((await runner.preview({agentId:"chief-zora",question:"CODEWORD-VELVET"})).sourceCount,0);
 assert.equal((await runner.preview({agentId:"agent-geordi-02",question:"CODEWORD-VELVET"})).sourceCount,0);
 assert.equal((await runner.preview({agentId:"agent-zora-01",question:"CODEWORD-VELVET"})).sourceCount,0);
 assert.equal((await runner.preview({agentId:"agent-zora-01",question:"CODEWORD-VELVET",context:{projectId:"p-one",authorizedProjectIds:["p-one"]}})).sourceCount,1);
 assert.equal((await runner.preview({agentId:"agent-zora-01",question:"CODEWORD-VELVET",context:{projectId:"p-wrong",authorizedProjectIds:["p-wrong"]}})).sourceCount,0);
 await assert.rejects(()=>runner.answer({agentId:"chief-zora",question:"CODEWORD-VELVET",ownerApproved:true}),/NO_APPROVED_DOMAIN_EVIDENCE/);
 assert.equal(count.requests.length,0);
}));
test("model mistakes are surfaced as warnings, never verified facts",()=>{
 const missing=evaluateLocalDraft("Uncited claim.",["d1"]);
 assert.equal(missing.verdict,"requires_citation_review");assert.equal(missing.missingCitations,true);
 const invented=evaluateLocalDraft("Citing [Source 27].",["d1"]);
 assert.deepEqual(invented.invalidCitationNumbers,[27]);
 assert.equal(invented.verifiedFactualAccuracy,false);
});
test("rejects non-local adapters and unknown IDs",async()=>withStore(async store=>{
 assert.throws(()=>createAgentInference({store,reasoner:{
  config:{mode:"LOCAL_ONLY_EXPLICIT",host:"api.groq.com",groqConnected:true,grokConnected:false},ask:()=>{},preview:()=>{}
 }}),/Loopback-only/);
 const runner=createAgentInference({store});
 await assert.rejects(()=>runner.preview({agentId:"not-a-real-agent",question:"Safety"}),/Known synthetic/);
 await assert.rejects(()=>runner.preview({agentId:"chief-worf",question:""}),/Question/);
}));
test("after owner source revocation, generated answers are denied",async()=>withStore(async store=>{
 await store.upsert(doc("revocable","department",{allowedAgentIds:["chief-geordi"]}));
 const count={requests:[]},runner=createAgentInference({store,reasoner:localMock(count)});
 assert.equal((await runner.preview({agentId:"chief-geordi",question:"CODEWORD-VELVET"})).sourceCount,1);
 await store.revoke("revocable",{expectedRevision:1});
 await assert.rejects(()=>runner.answer({agentId:"chief-geordi",question:"CODEWORD-VELVET",ownerApproved:true}),/NO_APPROVED_DOMAIN_EVIDENCE/);
 assert.equal(count.requests.length,0);
}));
