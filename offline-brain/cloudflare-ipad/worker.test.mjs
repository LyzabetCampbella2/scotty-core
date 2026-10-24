import test from "node:test";
import assert from "node:assert/strict";
import worker,{designAudit} from "./worker.mjs";
import {pageHtml} from "./page.mjs";
import {browserScript} from "./browser-script.mjs";

const TOKEN="owner-secret-synthetic-token-0123456789abcdefghijkl";
const BASE="https://scotty-example.workers.dev";
const environment=(props={})=>({OWNER_BEARER_TOKEN:TOKEN,AI_ENABLED:"false",...props});
const request=(path,{method="GET",token=TOKEN,data,headers={}}={})=>
 new Request(BASE+path,{method,
  headers:{...(token===null?{}:{"authorization":"Bearer "+token}),
   ...(data?{"content-type":"application/json"}:{}),...headers},
  ...(data?{body:JSON.stringify(data)}:{})});
const json=async response=>({status:response.status,body:await response.json(),headers:response.headers});
const sampleQuestion="Review a synthetic software engineering testing plan";
const approve={agentId:"agent-geordi-01",question:sampleQuestion,
  ownerApproved:true,shareWithCloudflare:true,noPrivateDataConfirmed:true};
test("static iPad dashboard is usable without exposing any owner credential",async()=>{
 const res=await worker.fetch(request("/",{token:null}),environment());
 assert.equal(res.status,200);
 const html=await res.text();
 assert.ok(html.includes("Independent Brain Lab"));
 assert.ok(html.includes('src="/ui.js"'));
 assert.ok(!html.includes(TOKEN));
 assert.ok(!html.includes("DATABASE_URL"));
 assert.match(res.headers.get("content-security-policy"),/connect-src 'self'/);
 assert.match(res.headers.get("cache-control"),/no-store/);
 const ui=await worker.fetch(request("/ui.js",{token:null}),environment());
 assert.equal(ui.status,200);
 assert.ok((await ui.text()).includes("noPrivateDataConfirmed"));
 assert.ok(!pageHtml().includes("<script>"));
 assert.ok(browserScript.includes("ownerToken"));
});
test("fail closed without owner secret; never use provider",async()=>{
 let invoked=0;
 const env=environment({OWNER_BEARER_TOKEN:undefined,AI_ENABLED:"true",
 AI:{run:async()=>{invoked++;return {response:"unwanted"}}}});
 const r=await json(await worker.fetch(request("/api/status"),env));
 assert.equal(r.status,503);assert.equal(r.body.error,"OWNER_SECRET_MISSING");
 assert.equal(invoked,0);
});
test("bearer authentication and method boundaries protect entire API",async()=>{
 for(const token of [null,"bad","short",'a'.repeat(48)]) {
  const r=await json(await worker.fetch(request("/api/catalog",{token}),environment()));
  assert.equal(r.status,401);
 }
 const slash=await json(await worker.fetch(request("/api/nope"),environment()));
 assert.equal(slash.status,404);
 const badMethod=await json(await worker.fetch(request("/api/catalog",{method:"POST",data:{}}),environment()));
 assert.equal(badMethod.status,404);
});
test("health reports isolation without secrets, production or AI calls",async()=>{
 const x=await json(await worker.fetch(request("/health",{token:null}),environment()));
 assert.equal(x.status,200);assert.equal(x.body.productionConnected,false);
 assert.equal(x.body.aiUsed,false);assert.ok(!JSON.stringify(x.body).includes(TOKEN));
});
test("128 synthetic agents and 12 chiefs, not real production records",async()=>{
 const r=await json(await worker.fetch(request("/api/catalog"),environment()));
 assert.equal(r.status,200);
 assert.equal(r.body.agentCount,128);
 assert.equal(r.body.agents.filter(a=>a.isChief).length,12);
 assert.equal(r.body.agents.every(a=>a.synthetic===true),true);
 const unique=new Set(r.body.agents.map(a=>a.id));
 assert.equal(unique.size,128);
});
test("brain is disabled by default; neither plans nor sources use AI",async()=>{
 let calls=0;
 const env=environment({AI:{run:async()=>{calls++;throw Error("Unexpected AI request")}}});
 const status=await json(await worker.fetch(request("/api/status"),env));
 assert.equal(status.body.aiEnabled,false);
 assert.equal(status.body.groqConnected,false);
 assert.equal(status.body.renderMemoryConnected,false);
 const s=await json(await worker.fetch(request("/api/sources"),env));
 assert.equal(s.status,200);assert.equal(s.body.liveRefresh,false);assert.equal(s.body.autoVerified,false);
 const p=await json(await worker.fetch(request("/api/plan",{method:"POST",data:{question:sampleQuestion}}),env));
 assert.equal(p.status,200);assert.equal(p.body.status,"OFFLINE_ROUTING_ONLY");
 assert.equal(p.body.assignments.length,4);
 assert.ok(p.body.assignments.some(a=>a.department==="Engineering & Systems"));
 assert.equal(calls,0);
});
test("unauthorized and malformed input must never trigger AI",async()=>{
 let calls=0;
 const env=environment({AI_ENABLED:"true",AI:{run:async()=>{calls++;return {response:"oops"}}}});
 const cases=[
 request("/api/ask",{method:"POST",token:null,data:approve}),
 request("/api/ask",{method:"POST",data:{...approve,question:""}}),
 request("/api/ask",{method:"POST",data:{...approve,question:"q".repeat(501)}}),
 request("/api/ask",{method:"POST",data:{...approve,ownerApproved:false}}),
 request("/api/ask",{method:"POST",data:{...approve,shareWithCloudflare:false}}),
 request("/api/ask",{method:"POST",data:{...approve,noPrivateDataConfirmed:false}}),
 request("/api/ask",{method:"POST",data:{...approve,agentId:"chief-not-in-roster"}}),
 request("/api/ask",{method:"POST",headers:{"content-type":"text/plain"},data:approve}),
 ];
 for(const q of cases) {
  const result=await json(await worker.fetch(q,env));
  assert.ok(result.status>=400,JSON.stringify(result.body));
 }
 assert.equal(calls,0);
});
test("one explicitly approved Workers AI call, no fallback or production access",async()=>{
 const calls=[];
 const env=environment({AI_ENABLED:"true",AI:{run:async(model,payload)=>{
  calls.push({model,payload});
  return {response:"Synthetic software testing plans should define acceptance criteria and test coverage."};
 }}});
 const r=await json(await worker.fetch(request("/api/ask",{method:"POST",data:approve}),env));
 assert.equal(r.status,200,JSON.stringify(r.body));
 assert.equal(r.body.status,"UNVERIFIED_CLOUDFLARE_METHOD_DEMO");
 assert.equal(r.body.productionWrites,0);
 assert.equal(r.body.groqCalls,0);
 assert.equal(r.body.grokCalls,0);
 assert.equal(r.body.factualClaimsVerified,false);
 assert.equal(calls.length,1);
 assert.equal(calls[0].model,"@cf/meta/llama-3.2-3b-instruct");
 assert.equal(calls[0].payload.max_tokens,160);
 assert.equal(calls[0].payload.stream,false);
 assert.ok(JSON.stringify(calls[0].payload).includes("Reviewed factual evidence: NONE"));
 assert.ok(!JSON.stringify(calls[0].payload).includes("scotty-memory"));
});
test("Workers AI 429 or capacity failure never falls back to Groq",async()=>{
 const env=environment({AI_ENABLED:"true",AI:{run:async()=>{throw Error("429 out of capacity / quota")}}});
 const result=await json(await worker.fetch(request("/api/ask",{method:"POST",data:approve}),env));
 assert.equal(result.status,503);
 assert.equal(result.body.error,"AI_FREE_LIMIT_OR_CAPACITY");
 assert.ok(!JSON.stringify(result.body).includes(TOKEN));
});
test("inference returns 503 without AI binding; still no paid service",async()=>{
 const env=environment({AI_ENABLED:"true",AI:undefined});
 const r=await json(await worker.fetch(request("/api/ask",{method:"POST",data:approve}),env));
 assert.equal(r.status,503);assert.equal(r.body.error,"AI_BINDING_MISSING");
});
test("unverified methodology pack is not falsely presented as expert facts",async()=>{
 const env=environment({AI_ENABLED:"true",AI:{run:async()=>({response:"test"})}});
 const r=await json(await worker.fetch(request("/api/ask",{method:"POST",data:approve}),env));
 assert.equal(r.body.sourceMaterialsAreNotFactChecked,true);
 assert.equal(r.body.ownerReviewRequired,true);
 assert.ok(r.body.sourceMethodIds.every(s=>s.startsWith("department-")||s.startsWith("profile-")));
});
test("no need to provision KV, D1, R2, or paid database",()=>{
 assert.equal(designAudit.hasRuntimeLogs,false);
 assert.equal(designAudit.maxOutputTokens,160);
 assert.ok(pageHtml().includes("token stays in this browser tab"));
});
