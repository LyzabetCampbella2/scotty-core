import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePhase5RosterSnapshot,createPhase5RosterMemoryPolicyReview} from './phase5-roster-memory-policy-review.mjs';

const path=new URL('./phase5-185-agent-roster-review.json',import.meta.url);
const roster=JSON.parse(readFileSync(path,'utf8'));
const policy=createPhase5RosterMemoryPolicyReview(roster,{enabled:true});
const PROJECT='SYN-PROJECT-REVIEW';
const approvedInProduction=({actorId,ownerAgentId,scope})=>
 policy.review({actorId,ownerAgentId,scope,projectId:PROJECT});
const chiefs=roster.agents.filter(a=>a.role==='Chief');
const specialists=roster.agents.filter(a=>a.role==='Specialist');

test('snapshot is complete, unique, and strictly development only',()=>{
 const summary=validatePhase5RosterSnapshot(roster);
 assert.deepEqual(summary.counts,{agents:185,chiefs:25,specialists:160});
 assert.equal(summary.uniqueIds,185);
 assert.equal(summary.chiefsWithSpecialists,25);
 assert.deepEqual(summary.provenance,{fallback:128,proposed:57});
 assert.equal(summary.byId,undefined,'lookup map must remain private');
 assert.equal(roster.agents.filter(x=>x.runtimeStatus!=='Development profile — not executing').length,0);
});
test('policy reviewer provides no raw roster, DB client or execute method',()=>{
 assert.deepEqual(Object.keys(policy),['rosterSummary','review']);
 assert.ok(Object.isFrozen(policy));
 assert.equal(policy.execute,undefined);
 assert.equal(policy.authorize,undefined);
 assert.equal(policy.byId,undefined);
 assert.equal(policy.memory,undefined);
 assert.equal(policy.grant,undefined);
});
test('default disabled policy denies without inspecting hypothetical privileges',()=>{
 const off=createPhase5RosterMemoryPolicyReview(roster);
 const result=off.review({actorId:'chief-spock',ownerAgentId:'chief-spock',scope:'individual',projectId:PROJECT});
 assert.equal(result.decision,'DENY');
 assert.equal(result.reason,'ROSTER_REVIEW_DISABLED_BY_DEFAULT');
 assert.equal(result.actualPermissionGranted,false);
});
test('all chiefs are present and each manages at least one specialist in matching department',()=>{
 const map=new Map(roster.agents.map(x=>[x.id,x]));
 assert.equal(chiefs.length,25);
 assert.equal(specialists.length,160);
 for(const c of chiefs){
  const assigned=specialists.filter(s=>s.chiefId===c.id);
  assert.ok(assigned.length>0,'Chief lacking specialist: '+c.id);
  assert.ok(assigned.every(s=>s.department===c.department));
 }
 assert.ok(specialists.every(s=>map.get(s.chiefId)?.role==='Chief'));
});
for(const agent of roster.agents){
 test('roster individual scope review: '+agent.id,()=>{
  const review=approvedInProduction({actorId:agent.id,ownerAgentId:agent.id,scope:'individual'});
  assert.equal(review.decision,'REVIEW_ONLY_PENDING_APPROVAL');
  assert.equal(review.actualPermissionGranted,false);
  assert.equal(review.ownerApprovalVerified,false);
  assert.equal(review.authorizedResourceAccess,false);
  assert.equal(review.canExecute,false);
  assert.equal(review.stagingOnly,true);
  assert.ok(review.requiredApprovals.includes('owner-signed-specific-grant'));
  assert.ok(review.requiredApprovals.includes('global-emergency-stop'));
  assert.ok(review.requiredApprovals.includes('redacted-read-audit'));
 });
}
test('no specialist may read own chief\'s individual memory',()=>{
 for(const spec of specialists){
  const result=approvedInProduction({actorId:spec.id,ownerAgentId:spec.chiefId,scope:'individual'});
  assert.equal(result.decision,'DENY');
  assert.equal(result.reason,'INDIVIDUAL_SCOPE_DIFFERENT_AGENT');
 }
});
test('no chief may read a specialist\'s individual memory merely by rank',()=>{
 for(const spec of specialists){
  const result=approvedInProduction({actorId:spec.chiefId,ownerAgentId:spec.id,scope:'individual'});
  assert.equal(result.decision,'DENY');
 }
});
test('same-Chief departmental relationship still always requires explicit owner approval',()=>{
 for(const spec of specialists){
  const result=approvedInProduction({actorId:spec.chiefId,ownerAgentId:spec.id,scope:'departmental'});
  assert.equal(result.decision,'REVIEW_ONLY_PENDING_APPROVAL');
  assert.equal(result.actualPermissionGranted,false);
  assert.equal(result.ownerApprovalVerified,false);
  assert.ok(result.requiredApprovals.includes('owner-signed-department-grant'));
  assert.ok(result.requiredApprovals.includes('department-consent-revocation'));
 }
});
test('cross-Chief department access is denied even for two chiefs',()=>{
 for(let i=0;i<chiefs.length;i++){
  const a=chiefs[i],b=chiefs[(i+1)%chiefs.length];
  assert.notEqual(a.department,b.department);
  const result=approvedInProduction({actorId:a.id,ownerAgentId:b.id,scope:'departmental'});
  assert.equal(result.decision,'DENY');
  assert.equal(result.reason,'CROSS_DEPARTMENT_SCOPE');
 }
});
test('all 185 actors must request object-specific owner consent for hypothetical shared memory',()=>{
 for(const agent of roster.agents){
  const result=approvedInProduction({actorId:agent.id,ownerAgentId:'chief-spock',scope:'shared'});
  assert.equal(result.decision,'REVIEW_ONLY_PENDING_APPROVAL');
  assert.equal(result.actualPermissionGranted,false);
  assert.equal(result.ownerApprovalVerified,false);
  assert.equal(result.authorizedResourceAccess,false);
  assert.ok(result.requiredApprovals.includes('owner-signed-object-specific-share-grant'));
  assert.ok(result.requiredApprovals.includes('shared-memory-RLS'));
 }
});
test('unknown, removed and client-invented agents cannot obtain a favorable review',()=>{
 for(const id of ['chief-attacker','agent-fake','agent-creative-pulse','prototype-admin','owner']){
  assert.equal(approvedInProduction({actorId:id,ownerAgentId:'chief-spock',scope:'shared'}).decision,'DENY');
  assert.equal(approvedInProduction({actorId:'chief-spock',ownerAgentId:id,scope:'shared'}).decision,'DENY');
 }
});
test('real-world project names cannot be used in synthetic policy review',()=>{
 const r=policy.review({actorId:'chief-spock',ownerAgentId:'chief-spock',scope:'individual',projectId:'production'});
 assert.equal(r.decision,'DENY');assert.equal(r.reason,'SYNTHETIC_PROJECT_REQUIRED');
});
test('unspecified and unknown scopes fail closed',()=>{
 for(const scope of [undefined,'memory:write','all','production','management']){
  assert.equal(policy.review({actorId:'chief-spock',ownerAgentId:'chief-spock',scope,projectId:PROJECT}).decision,'DENY');
 }
});
test('input fields cannot change the review into a permission grant',()=>{
 const result=policy.review({
  actorId:'chief-spock',ownerAgentId:'chief-spock',scope:'individual',projectId:PROJECT,
  role:'admin',ownerSignedGrant:true,forceAllow:true,disableAudit:true,production:true
 });
 assert.equal(result.decision,'REVIEW_ONLY_PENDING_APPROVAL');
 assert.equal(result.actualPermissionGranted,false);
 assert.equal(result.ownerApprovalVerified,false);
 assert.equal(result.canExecute,false);
});
test('duplicate agent IDs fail validation before any review',()=>{
 const copy=structuredClone(roster);
 copy.agents[1].id=copy.agents[0].id;
 assert.throws(()=>validatePhase5RosterSnapshot(copy),/INVALID_OR_DUPLICATE_AGENT_PROFILE/);
});
test('missing roster member fails validation',()=>{
 const copy=structuredClone(roster);
 copy.agents.pop();
 assert.throws(()=>validatePhase5RosterSnapshot(copy),/UNTRUSTED_OR_INCOMPLETE_ROSTER/);
});
test('unrecognized runtime-activated member fails validation',()=>{
 const copy=structuredClone(roster);
 copy.agents[0].runtimeStatus='Executing in production';
 assert.throws(()=>validatePhase5RosterSnapshot(copy),/INVALID_OR_DUPLICATE_AGENT_PROFILE/);
});
test('specialist moved to unrelated Chief fails validation',()=>{
 const copy=structuredClone(roster);
 const s=copy.agents.find(x=>x.role==='Specialist');
 const unrelated=chiefs.find(x=>x.department!==s.department);
 s.chiefId=unrelated.id;
 assert.throws(()=>validatePhase5RosterSnapshot(copy),/CROSS_DEPARTMENT_OR_MISSING_CHIEF/);
});
test('specialist with missing Chief ID fails validation',()=>{
 const copy=structuredClone(roster);
 const s=copy.agents.find(x=>x.role==='Specialist');
 s.chiefId='chief-not-in-roster';
 assert.throws(()=>validatePhase5RosterSnapshot(copy),/CROSS_DEPARTMENT_OR_MISSING_CHIEF/);
});
test('Chief parent spoofing fails validation',()=>{
 const copy=structuredClone(roster);
 const chief=copy.agents.find(x=>x.role==='Chief');
 chief.chiefId='chief-spock';
 assert.throws(()=>validatePhase5RosterSnapshot(copy),/INVALID_CHIEF_PARENT/);
});
test('metadata must say review only, not become live entitlement',()=>{
 const copy=structuredClone(roster);
 copy.source.authority='live-agent-permissions';
 assert.throws(()=>validatePhase5RosterSnapshot(copy),/UNTRUSTED_OR_INCOMPLETE_ROSTER/);
});
