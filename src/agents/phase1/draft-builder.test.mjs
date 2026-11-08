import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";

function load(relative){
 const bytes=readFileSync(new URL(relative,import.meta.url));
 const blob=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
 return {obj:JSON.parse(bytes.toString("utf8")),blob};
}
const frozen=load("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../../docs/a0/roster-freeze-lock-2026-11-07.json").obj;
const original=load("../../../docs/a0/roster-candidate-2026-11-07.json");
test("B1 source IDs and display names match owner-approved immutable roster",()=>{
 assert.equal(frozen.blob,lock.snapshotGitBlobSha);
 assert.equal(original.blob,lock.candidateGitBlobSha);
 assert.deepEqual(frozen.obj.records,original.obj.records);
 const o=createPhase1BrainDrafts(frozen.obj,lock);
 assert.equal(o.profiles.length,185);
 assert.equal(o.summary.chiefs,25);
 assert.equal(o.summary.specialists,160);
 assert.equal(o.summary.plannedBehaviorTests,555);
 assert.equal(o.summary.realModelEvaluationsPassed,0);
 assert.equal(o.summary.ownerApprovedBrainVersions,0);
 assert.equal(o.summary.independentlyCallableLiveAgents,0);
 assert.deepEqual(new Set(o.profiles.map(p=>p.canonicalAgentId)),new Set(frozen.obj.records.map(p=>p["Agent ID"])));
 for(const p of o.profiles){
  const source=frozen.obj.records.find(r=>r["Agent ID"]===p.canonicalAgentId);
  assert.equal(p.displayName,source.Name);
  assert.equal(p.department,source.Department);
  assert.equal(p.specialty,source.Specialty);
  assert.equal(p.title.includes(p.role==="Chief"?"Chief":"Specialist"),true);
 }
});
test("all B1 drafts prohibit tools, memory writes, external accounts and false approval",()=>{
 const o=createPhase1BrainDrafts(frozen.obj,lock);
 for(const p of o.profiles){
  assert.equal(p.ownerApproved,false);
  assert.equal(p.ownerReview,"PENDING");
  assert.equal(p.realModelEvaluation,"NOT_RUN");
  assert.equal(p.permissions.executionEnabled,false);
  assert.deepEqual(p.permissions.liveTools,[]);
  assert.equal(p.permissions.externalAppAccess,false);
  assert.equal(p.permissions.memoryWriteEnabled,false);
  assert.deepEqual(p.permissions.allowedDataClasses,["SYNTHETIC_PUBLIC"]);
  assert.equal(p.ownerPreferenceEvidence,null);
  assert.equal(p.traits.length,0);
  assert.equal(p.behaviorTestPlan.length,3);
  assert.deepEqual(p.behaviorTestPlan.map(t=>t.caseType),["shared","specialty","adversarial"]);
  assert.ok(p.behaviorTestPlan.every(t=>t.result==="NOT_RUN"&&!t.evidence));
 }
});
test("B1 proposals have correct chief and department relationships",()=>{
 const o=createPhase1BrainDrafts(frozen.obj,lock);
 const chiefs=new Map(o.profiles.filter(p=>p.role==="Chief").map(p=>[p.canonicalAgentId,p]));
 for(const p of o.profiles.filter(p=>p.role==="Specialist")){
  assert.ok(chiefs.has(p.chiefId));
  assert.equal(chiefs.get(p.chiefId).department,p.department);
 }
 assert.equal(chiefs.size,25);
});
test("B1 exporter is offline and disallows apply and deploy actions",()=>{
 const path=new URL("../../../scripts/phase1-export-drafts.mjs",import.meta.url).pathname;
 const o=spawnSync(process.execPath,[path],{encoding:"utf8",maxBuffer:1024*1024*2});
 assert.equal(o.status,0,o.stderr);
 assert.equal(JSON.parse(o.stdout).profiles.length,185);
 for(const illegal of ["--apply","--deploy"]){
  const r=spawnSync(process.execPath,[path,illegal],{encoding:"utf8",maxBuffer:1024*1024*2});
  assert.notEqual(r.status,0);
  assert.match(r.stderr,/does not support writes or activation/);
 }
});
test("B1 creation fails closed on tampered identity counts and unsigned source",()=>{
 assert.throws(()=>createPhase1BrainDrafts({...frozen.obj,records:frozen.obj.records.slice(1)},lock),/Locked A0 canonical roster required/);
 assert.throws(()=>createPhase1BrainDrafts({...frozen.obj,freezeStatus:"CANDIDATE_NOT_FROZEN"},lock),/Locked A0 canonical roster required/);
 assert.throws(()=>createPhase1BrainDrafts(frozen.obj,{...lock,status:"PENDING"}),/Locked A0 canonical roster required/);
});
