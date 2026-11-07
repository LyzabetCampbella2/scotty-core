import test from 'node:test';
import assert from 'node:assert/strict';
import {phase1ReadinessReport,phase1AgentReview} from './phase1-agent-review.mjs';

test('Phase 1 report includes all canonical identities and honestly indicates review gaps',()=>{
 const report=phase1ReadinessReport();
 assert.equal(report.counts.profiles,185);
 assert.equal(report.counts.chiefs,25);
 assert.equal(report.counts.specialists,160);
 assert.equal(report.counts.structuralPasses,185);
 assert.equal(report.counts.sourceBackedChiefProfiles,8);
 assert.equal(report.counts.generatedChiefProfiles,17);
 assert.equal(report.counts.specialistProfilesPendingOwnerReview,160);
 assert.equal(report.counts.ownerAccepted,0);
 assert.equal(report.counts.modelBehaviorCertified,0);
 assert.equal(report.activeRealAgents,0);
 assert.equal(report.modelCallsMade,0);
 assert.equal(report.unauthorizedToolsGranted,0);
 assert.equal(report.allProfilesCertified,false);
 assert.equal(report.profiles.length,185);
 assert.equal(new Set(report.profiles.map(x=>x.agentId)).size,185);
 assert.ok(report.profiles.every(x=>x.structuralPasses!==false));
 assert.ok(report.profiles.every(x=>x.certificationStatus==='NOT_CERTIFIED'));
});
test('owner-recorded RIKER, GEORDI and canonical TROI are identified without false owner acceptance',()=>{
 for(const id of ['chief-riker','chief-geordi','chief-expansion-troi']){
   const b=phase1AgentReview(id);
   assert.equal(b.ownerRecordStatus,'SOURCE_BACKED_CHIEF_RECORD');
   assert.ok(b.sourceRecord);
   assert.equal(b.ownerAcceptance,false);
   assert.equal(b.roleBehaviorEvaluatedWithRealModel,false);
   assert.equal(b.productionPermissionGranted,false);
   assert.match(b.nextAction,/Review mapped selections/);
 }
 assert.equal(phase1AgentReview('chief-expansion-torres').sourceRecord,null);
 assert.equal(phase1AgentReview('agent-geordi-02').ownerRecordStatus,'GENERATED_DEFAULT_NEEDS_OWNER_REVIEW');
 assert.throws(()=>phase1AgentReview('chief-troi'),/UNKNOWN_AGENT_ID/);
});
test('every agent review has a nine-part fail-closed rubric without AI or memory reads',()=>{
 const report=phase1ReadinessReport();
 for(const x of report.profiles){
   assert.equal(Object.keys(x.structural).length,9);
   assert.ok(Object.values(x.structural).every(Boolean));
   assert.equal(x.aiCalls,0);
   assert.equal(x.toolExecutions,0);
   assert.equal(x.privateMemoryVerified,false);
   assert.equal(x.productionPermissionGranted,false);
 }
});
