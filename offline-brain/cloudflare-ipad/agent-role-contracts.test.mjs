import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster} from './connected-roster.mjs';
import {INDIVIDUAL_BRAINS,agentBrain,roleResponsePreview} from './individual-agent-brains.mjs';
import {INDIVIDUAL_ROLE_CONTRACTS,roleContract,buildRoleContracts,overlappingSpecialtyReport,ROLE_CONTRACT_VERSION} from './agent-role-contracts.mjs';

test('all 185 canon agents get separate source-only specialist/department work contracts',()=>{
 const base=connectedRoster();
 assert.equal(INDIVIDUAL_ROLE_CONTRACTS.length,185);
 assert.equal(INDIVIDUAL_ROLE_CONTRACTS.filter(x=>x.stage==='department-chief').length,25);
 assert.equal(INDIVIDUAL_ROLE_CONTRACTS.filter(x=>x.stage!=='department-chief').length,160);
 assert.deepEqual(INDIVIDUAL_ROLE_CONTRACTS.map(x=>x.agentId),base.map(x=>x.id));
 assert.equal(new Set(INDIVIDUAL_ROLE_CONTRACTS.map(x=>x.agentId)).size,185);
 assert.ok(INDIVIDUAL_ROLE_CONTRACTS.every(x=>x.schemaVersion===ROLE_CONTRACT_VERSION));
 for(const c of INDIVIDUAL_ROLE_CONTRACTS){
  assert.ok(c.method.length>40);
  assert.ok(c.artifact.length>10);
  assert.ok(c.evidenceRequired.length>12);
  assert.ok(c.reviewQuestion.endsWith('?'));
  assert.equal(c.roleScope,'DESIGN_TIME_ONLY');
  assert.equal(c.ownerReviewed,false);
  assert.equal(c.certified,false);
  assert.deepEqual(c.activePermissions,[]);
  assert.deepEqual(c.qualifiedExternalTools,[]);
  assert.equal(agentBrain(c.agentId).individualRoleContract.agentId,c.agentId);
  assert.ok(agentBrain(c.agentId).prompt.includes(c.artifact));
 }
});
test('shared specialties across departments receive substantive different workstream assignments',()=>{
 const r=overlappingSpecialtyReport();
 assert.ok(r.overlappingGroups>0);
 assert.ok(r.overlappingAgents>=2);
 assert.equal(r.automaticAssignmentPermitted,false);
 for(const group of r.groups){
  assert.equal(group.distinctArtifacts,true);
  assert.equal(new Set(group.agentIds).size,group.agentIds.length);
  assert.equal(new Set(group.stages).size,group.stages.length);
  const agents=group.agentIds.map(roleContract);
  assert.equal(new Set(agents.map(x=>x.artifact)).size,agents.length);
  assert.equal(new Set(agents.map(x=>x.method)).size,agents.length);
  const previews=group.agentIds.map(id=>roleResponsePreview(id,'Plan a fictional, accessible, owner-reviewed feature.'));
  assert.equal(new Set(previews.map(x=>x.workContract.method)).size,agents.length);
 }
});
test('frontend engineering, backend engineering and application testing still have different evidence requirements',()=>{
 const a=agentBrain('agent-geordi-02');
 const b=agentBrain('agent-geordi-01');
 const q=agentBrain('agent-expansion-038');
 assert.notEqual(a.individualRoleContract.method,b.individualRoleContract.method);
 assert.notEqual(b.individualRoleContract.evidenceRequired,q.individualRoleContract.evidenceRequired);
 assert.equal(a.chiefId,'chief-geordi');
 assert.equal(b.chiefId,'chief-geordi');
 assert.equal(q.chiefId,'chief-expansion-torres');
 assert.equal(a.grantedToolIds.length,0);
 assert.equal(b.grantedToolIds.length,0);
});
test('contract compiler is deterministic and rejects wrong roster, duplicates and mutation',()=>{
 const a=buildRoleContracts();
 const b=buildRoleContracts();
 assert.deepEqual(a,b);
 assert.ok(Object.isFrozen(INDIVIDUAL_ROLE_CONTRACTS[0]));
 assert.throws(()=>{INDIVIDUAL_ROLE_CONTRACTS[0].activePermissions.push('deploy');},TypeError);
 const changed=roleContract('agent-geordi-02');
 changed.activePermissions.push('deploy');
 assert.deepEqual(roleContract('agent-geordi-02').activePermissions,[]);
 assert.throws(()=>roleContract('unknown-agent'),/UNKNOWN_ROLE_CONTRACT_AGENT/);
 assert.throws(()=>buildRoleContracts(connectedRoster().slice(1)),/EXPECTED_185_ROSTER/);
 const bad=connectedRoster();
 bad[3]={...bad[0]};
 assert.throws(()=>buildRoleContracts(bad),/INVALID_ROLE_CONTRACT_ROSTER/);
});
