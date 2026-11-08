import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildMemoryBlueprints,previewMemoryAccess,planMemoryLifecycle,MEMORY_SCOPES} from "./phase2-policy.mjs";

const frozen=JSON.parse(readFileSync(new URL("../../docs/a0/roster-frozen-2026-11-07.json",import.meta.url),"utf8"));
const lock=JSON.parse(readFileSync(new URL("../../docs/a0/roster-freeze-lock-2026-11-07.json",import.meta.url),"utf8"));
const roots=new Map(frozen.records.map(x=>[x["Agent ID"],x]));
const chief=frozen.records.find(x=>x.Role==="Chief");
const specialist=frozen.records.find(x=>x.Role==="Specialist");
const unrelated=frozen.records.find(x=>x.Role==="Specialist"&&x.Department!==specialist.Department);
const blueprint=buildMemoryBlueprints(frozen,lock.snapshotGitBlobSha);
const record={
 memoryId:"synthetic-mem-1",canonicalAgentId:specialist["Agent ID"],
 department:specialist.Department,projectId:"project-synthetic-1",
 scope:"individual",dataClass:"SYNTHETIC_PUBLIC",version:1
};
const request={
 agentId:specialist["Agent ID"],department:specialist.Department,
 projectId:"project-synthetic-1",intent:"read",dataClass:"SYNTHETIC_PUBLIC"
};
test("B2 builds exact 185 frozen identity blueprints and 25 departments without DB access",()=>{
 assert.equal(blueprint.profiles.length,185);
 assert.equal(blueprint.summary.blueprints,185);
 assert.equal(blueprint.summary.durableStores,0);
 assert.equal(blueprint.summary.realRecords,0);
 assert.equal(blueprint.summary.verifiedRetrievals,0);
 assert.equal(blueprint.summary.independentRestartTests,0);
 assert.equal(new Set(blueprint.profiles.map(p=>p.canonicalAgentId)).size,185);
 assert.deepEqual(new Set(blueprint.profiles.map(p=>p.canonicalAgentId)),new Set(frozen.records.map(r=>r["Agent ID"])));
 assert.equal(MEMORY_SCOPES.length,5);
 for(const profile of blueprint.profiles){
  assert.equal(profile.scopesProposed.length,5);
  assert.ok(profile.scopesProposed.every(s=>!s.canReadRealData&&!s.canWriteRealData&&s.runtimePermission==="DENY_BY_DEFAULT"));
  assert.equal(profile.actualDurableMemoryRecords,0);
  assert.equal(profile.dataSourceAccess,false);
  assert.equal(profile.operationalStatus,"ARCHITECTURE_ONLY_NO_MEMORY_DATABASE");
 }
});
test("Matching synthetic individual memory descriptor remains non-executable until trusted authorization",()=>{
 const status=previewMemoryAccess(record,request,frozen);
 assert.equal(status.decision,"NEEDS_EXTERNAL_PERMISSION_VERIFICATION");
 assert.equal(status.realDataAccessAllowed,false);
 assert.equal(status.requiresTrustedRuntime,true);
 assert.equal(status.requiredChecks.length,4);
});
test("Same-department request is insufficient for individual memory; cross-department forged roles denied",()=>{
 assert.equal(previewMemoryAccess(record,{...request,agentId:unrelated["Agent ID"],department:unrelated.Department},frozen).decision,"DENY");
 const sameDept=frozen.records.find(x=>x["Agent ID"]!==specialist["Agent ID"]&&x.Department===specialist.Department);
 assert.ok(sameDept);
 assert.equal(previewMemoryAccess(record,{...request,agentId:sameDept["Agent ID"],department:sameDept.Department},frozen).reason,"SCOPE_BOUNDARY_MISMATCH");
 assert.equal(previewMemoryAccess(record,{...request,department:"Different department"},frozen).reason,"FORGED_DEPARTMENT");
});
test("Department and project matches are only structural; forged owner approval never becomes data access",()=>{
 const scopeDepartment={...record,scope:"department"};
 const scopeProject={...record,scope:"project"};
 const matching=previewMemoryAccess(scopeDepartment,{...request,agentId:specialist["Agent ID"]},frozen);
 assert.equal(matching.decision,"NEEDS_EXTERNAL_PERMISSION_VERIFICATION");
 assert.equal(matching.realDataAccessAllowed,false);
 const scoped=previewMemoryAccess(scopeProject,request,frozen);
 assert.equal(scoped.decision,"NEEDS_EXTERNAL_PERMISSION_VERIFICATION");
 assert.equal(scoped.realDataAccessAllowed,false);
 assert.equal(previewMemoryAccess(scopeProject,{...request,projectId:"other"},frozen).reason,"SCOPE_BOUNDARY_MISMATCH");
 const forged=previewMemoryAccess(record,{...request,ownerApproved:true,permissions:["admin"],ownerSession:"fake"},frozen);
 assert.equal(forged.realDataAccessAllowed,false);
 assert.equal(forged.decision,"NEEDS_EXTERNAL_PERMISSION_VERIFICATION");
});
test("Owner-only, shared and restricted source material deny regardless of agent claims",()=>{
 for(const scope of ["owner_only","explicit_shared"]){
  const result=previewMemoryAccess({...record,scope},request,frozen);
  assert.equal(result.decision,"DENY");
 }
 for(const dataClass of ["OWNER_PRIVATE","PROJECT_CONFIDENTIAL","THIRD_PARTY_RESTRICTED"]){
  const result=previewMemoryAccess({...record,dataClass},{...request,dataClass},frozen);
  assert.equal(result.decision,"DENY");
  assert.equal(result.reason,"RESTRICTED_DATA_NEEDS_SEPARATE_OWNER_CONSENT");
 }
 assert.equal(previewMemoryAccess(record,{...request,extraGrant:"self-asserted"},frozen).reason,"MALFORMED_OR_UNTRUSTED_REQUEST");
 assert.equal(previewMemoryAccess(record,{...request,agentId:"fake-agent"},frozen).reason,"UNKNOWN_CANONICAL_AGENT");
});
test("Corrections, superseding, archiving and deletion are non-executable owner-reviewed plans",()=>{
 for(const action of ["CORRECT","SUPERSEDE","ARCHIVE","REQUEST_DELETE"]){
  const plan=planMemoryLifecycle(record,action,"Synthetic plan for future owner review");
  assert.equal(plan.approvalStatus,"NOT_APPROVED");
  assert.equal(plan.memoryRecordChanged,false);
  assert.equal(plan.recordPurged,false);
  assert.equal(plan.actualDataRead,false);
  assert.equal(plan.actualDataWritten,false);
  assert.equal(plan.encryptedBackupReconciled,false);
  assert.equal(plan.requiresSeparateOwnerDecision,true);
 }
 assert.throws(()=>planMemoryLifecycle(record,"PURGE_NOW","unapproved"),/INVALID_MEMORY_LIFECYCLE_PLAN/);
});
test("Tampered identity or truncated roster prevents blueprints",()=>{
 assert.throws(()=>buildMemoryBlueprints({...frozen,records:frozen.records.slice(1)},lock.snapshotGitBlobSha),/APPROVED_185_ROSTER_REQUIRED/);
 assert.throws(()=>buildMemoryBlueprints(frozen,"bad sha"),/ROSTER_BLOB_REQUIRED/);
 assert.equal(roots.size,185);
 assert.ok(chief);
});
