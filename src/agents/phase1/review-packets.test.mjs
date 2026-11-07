import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {makePhase1ReviewPackets} from "./review-packets.mjs";

const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url),"utf8"));
const roster=read("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const drafts=createPhase1BrainDrafts(roster,lock);
const review=makePhase1ReviewPackets(drafts);

test("Phase B1 review queue contains exactly the frozen 185 IDs across 25 chiefs",()=>{
 assert.equal(review.summary.packets,185);
 assert.equal(review.summary.departments,25);
 assert.equal(review.queue.length,25);
 assert.equal(new Set(review.packets.map(p=>p.canonicalAgentId)).size,185);
 assert.deepEqual(new Set(review.packets.map(p=>p.canonicalAgentId)),new Set(roster.records.map(p=>p["Agent ID"])));
 assert.equal(review.queue.reduce((n,dept)=>n+dept.agentIds.length,0),185);
 for(const dept of review.queue)assert.ok(review.packets.some(p=>p.role==="Chief"&&p.canonicalAgentId===dept.chiefId&&p.department===dept.department));
});
test("Every packet requires eight independent evidence gates and has zero approvals",()=>{
 assert.equal(review.summary.evidenceChecks,1480);
 assert.equal(review.summary.plannedTests,555);
 assert.equal(review.summary.modelTestsPassed,0);
 assert.equal(review.summary.approvedPersonalities,0);
 assert.equal(review.summary.liveAgents,0);
 for(const p of review.packets){
  assert.equal(p.evidenceChecklist.length,8);
  assert.equal(p.evidenceChecklist.every(x=>x.passed===false&&x.evidenceRef===null),true);
  assert.equal(p.behaviorCases.length,3);
  assert.equal(p.behaviorCases.every(x=>x.status==="NOT_RUN"),true);
  assert.equal(p.certification,"NOT_CERTIFIED");
  assert.equal(p.authorization.productionAccessAllowed,false);
  assert.equal(p.authorization.liveAgentEnabled,false);
  assert.equal(p.authorization.memoryWriteEnabled,false);
  assert.equal(p.ownerDecisions.adoptedRoleMethod,false);
  assert.deepEqual(p.ownerDecisions.adoptedPersonalityTraits,[]);
  assert.equal(p.methodology.sourceVerificationComplete,false);
 }
});
test("legacy TROI ID conflict and department drift cannot be silently adopted",()=>{
 const troi=review.packets.find(p=>p.displayName==="TROI");
 assert.equal(troi.canonicalAgentId,"chief-expansion-troi");
 assert.equal(troi.identityConflict.legacyAgentId,"chief-troi");
 assert.equal(troi.identityConflict.ownerDecisionRequired,true);
 assert.equal(troi.identityConflict.automaticMigrationAllowed,false);
 for(const p of review.packets.filter(p=>p.departmentDrift))assert.equal(p.departmentDrift.ownerDecisionRequired,true);
 assert.equal(review.packets.filter(p=>p.identityConflict).length,1);
});
test("review packets exporter needs no credentials and cannot activate",()=>{
 const path=new URL("../../../scripts/phase1-export-review-packets.mjs",import.meta.url).pathname;
 const o=spawnSync(process.execPath,[path],{encoding:"utf8",maxBuffer:8*1024*1024});
 assert.equal(o.status,0,o.stderr);
 assert.equal(JSON.parse(o.stdout).packets.length,185);
 const illegal=spawnSync(process.execPath,[path,"--apply"],{encoding:"utf8",maxBuffer:1024*1024});
 assert.notEqual(illegal.status,0);
 assert.match(illegal.stderr,/No execution/);
});
