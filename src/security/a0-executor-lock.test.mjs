import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {checkA0ExecutionLock} from "./a0-executor-lock.mjs";

const check=(path,method="GET",headers={})=>{
 const url=new URL("https://scotty.example"+path);
 const req=new Request(url,{method,headers});
 return checkA0ExecutionLock(req,url);
};
test("unverified reads of owner projects and agent memory are locked",()=>{
 for(const p of ["/api/agents","/api/agents/agent-spock-01/memories","/api/workspace",
                   "/api/workspace/projects","/api/workspace/recommend","/api/memory/get"]){
  const r=check(p);
  assert.equal(r.status,503,p);
  assert.equal(r.headers.get("Cache-Control"),"no-store");
 }
});
test("mutations are blocked even when caller claims to be owner",()=>{
 const h={authorization:"Bearer synthetic-secret","x-scotty-csrf":"1"};
 for(const [p,m] of [
  ["/api/agents","POST"],["/api/agents/agent-spock-01/learning","POST"],
  ["/api/workspace/projects","POST"],["/api/workspace/projects/a/missions","PATCH"],
  ["/api/eyes/analyze","POST"],["/api/voice/speak","POST"],
  ["/api/memory/promote","POST"],["/api/workspace/recommend","POST"]]){
  assert.equal(check(p,m,h).status,503,m+" "+p);
 }
});
test("only non-content diagnostics are admitted to existing route handlers",()=>{
 for(const p of ["/api/eyes/status","/api/eyes/test","/api/voice/status","/api/memory/status"]){
  assert.equal(check(p),null,p);
 }
 assert.equal(check("/api/a0/status"),null,"A0 separate staged owner API retains its own authentication");
 assert.equal(check("/health"),null);
});
test("path boundary prevents route prefix tricks",()=>{
 assert.equal(check("/api/agents-malicious"),null);
 assert.equal(check("/api/workspace-malicious"),null);
 assert.equal(check("/api/agents/details","HEAD").status,503);
 assert.equal(check("/api/eyes/analyze","GET").status,503);
});
test("server invokes lock before agent, workspace, voice and eyes handlers",()=>{
 const source=readFileSync(new URL("../server.ts",import.meta.url),"utf8");
 const guardIndex=source.indexOf("checkA0ExecutionLock(req,u)");
 assert.notEqual(guardIndex,-1);
 const enforceIndex=source.indexOf("if(executionLock) return executionLock;");
 assert.ok(enforceIndex>guardIndex);
 for(const fragment of ["handleAgents(req,u)","handleWorkspace(req,u)","handleEyesOn(req,u)","handleVoice(req,u)","handleMemory(req,u)","handleWorkspaceRecommendations(u)"]){
  const idx=source.indexOf(fragment);
  assert.ok(idx>enforceIndex,fragment+" must remain behind A0 ingress lock");
 }
});
