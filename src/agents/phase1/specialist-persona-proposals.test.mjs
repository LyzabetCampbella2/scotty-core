import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createAllSpecialistPersonaProposals,specialistPersonaProposal} from "./specialist-persona-proposals.mjs";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {makePhase1ReviewPackets} from "./review-packets.mjs";

const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=load("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const proposals=createAllSpecialistPersonaProposals(roster);
const drafts=createPhase1BrainDrafts(roster,lock);
const review=makePhase1ReviewPackets(drafts);

test("All 160 specialists have five distinct proposed traits and unique scoped charter",()=>{
 assert.equal(proposals.length,160);
 assert.equal(new Set(proposals.map(p=>p.canonicalAgentId)).size,160);
 assert.equal(new Set(proposals.map(p=>p.signatureInquiry)).size,160);
 assert.equal(new Set(proposals.map(p=>p.proposedDeliverable)).size,160);
 assert.ok(new Set(proposals.map(p=>p.proposedArchetype)).size>=12);
 for(const p of proposals){
  assert.equal(p.sourceKind,"ROLE_AND_METHOD_DERIVED_CONCEPT_NOT_OWNER_PREFERENCE");
  assert.equal(p.proposedTraits.length,5);
  assert.equal(new Set(p.proposedTraits).size,5,p.canonicalAgentId);
  assert.equal(p.proposedReasoningMethod.length,5);
  assert.ok(p.signatureInquiry.includes(p.specialty));
  assert.ok(p.signatureInquiry.includes(p.department));
  assert.ok(p.proposedDeliverable.startsWith(p.specialty));
  assert.ok(p.proposedReasoningMethod.some(step=>step.includes(p.chiefId)));
  assert.equal(p.ownerApproved,false);
  assert.equal(p.ownerReviewedAt,null);
  assert.equal(p.behaviorModelTestsRun,0);
  assert.equal(p.realDomainSourcesVerified,false);
  assert.equal(p.executionEnabled,false);
  assert.equal(p.memoryWriteEnabled,false);
  assert.deepEqual(p.liveTools,[]);
 }
});
test("Every source roster specialty and chief remains exactly matched",()=>{
 const sources=roster.records.filter(r=>r.Role==="Specialist");
 const byId=new Map(proposals.map(p=>[p.canonicalAgentId,p]));
 for(const source of sources){
  const p=byId.get(source["Agent ID"]);
  assert.ok(p);
  assert.equal(p.displayName,source.Name);
  assert.equal(p.specialty,source.Specialty);
  assert.equal(p.department,source.Department);
  assert.equal(p.chiefId,source["Chief ID"]);
 }
 assert.throws(()=>specialistPersonaProposal({...sources[0],Name:""}),/INVALID_CANONICAL_SPECIALIST/);
 assert.throws(()=>specialistPersonaProposal({...sources[0],Department:"Unknown department"}),/UNKNOWN_CANONICAL_DEPARTMENT/);
 assert.throws(()=>createAllSpecialistPersonaProposals({...roster,records:roster.records.slice(1)}),/OWNER_APPROVED_ROSTER_REQUIRED/);
});
test("All 160 review packets offer concepts without adopting user preferences or certifications",()=>{
 const specialistDrafts=drafts.profiles.filter(p=>p.role==="Specialist");
 assert.equal(specialistDrafts.length,160);
 assert.equal(drafts.summary.specialistPersonaProposals,160);
 assert.equal(drafts.summary.specialistPersonaProposalsApproved,0);
 const packets=review.packets.filter(p=>p.role==="Specialist");
 assert.equal(packets.length,160);
 for(const d of specialistDrafts){
  assert.ok(d.proposedSpecialistPersona,d.canonicalAgentId);
  assert.deepEqual(d.traits,[]);
  assert.equal(d.ownerPreferenceEvidence,null);
  assert.equal(d.permissions.executionEnabled,false);
  assert.equal(d.ownerApproved,false);
 }
 for(const p of packets){
  assert.equal(p.ownerDecisions.proposedPersonalityTraits.length,5);
  assert.ok(p.ownerDecisions.proposedSpecialistQuestion.includes(p.specialty));
  assert.equal(p.ownerDecisions.proposedSpecialistMethod.length,5);
  assert.ok(p.ownerDecisions.proposedSpecialistFailureRisk);
  assert.equal(p.provenance.proposedSpecialist.sourceKind,"ROLE_AND_METHOD_DERIVED_CONCEPT_NOT_OWNER_PREFERENCE");
  assert.deepEqual(p.ownerDecisions.adoptedPersonalityTraits,[]);
  assert.equal(p.ownerDecisions.adoptedRoleMethod,false);
  assert.equal(p.evidenceChecklist.every(g=>g.passed===false),true);
  assert.equal(p.behaviorCases.every(t=>t.status==="NOT_RUN"),true);
  assert.equal(p.certification,"NOT_CERTIFIED");
 }
 assert.equal(review.summary.evidenceChecks,1480);
 assert.equal(review.summary.plannedTests,555);
 assert.equal(review.summary.liveAgents,0);
});
test("strategy and mission risk proposals do not impersonate cybersecurity or real deployments",()=>{
 const byId=new Map(proposals.map(p=>[p.canonicalAgentId,p]));
 const strategy=byId.get("agent-spock-07");
 const mission=byId.get("agent-kirk-09");
 const ops=byId.get("agent-riker-02");
 const security=byId.get("agent-worf-04");
 assert.equal(strategy.proposedArchetype,"decision and assumption strategist");
 assert.match(strategy.signatureInquiry,/assumptions|alternatives/);
 assert.equal(mission.proposedArchetype,"mission authorization coordinator");
 assert.match(mission.proposedDeliverable,/mission gate/);
 assert.equal(ops.proposedArchetype,"operational handoff steward");
 assert.match(ops.primaryFailureRisk,/schedule/);
 assert.equal(security.proposedArchetype,"trust-boundary examiner");
 assert.equal([strategy,mission,ops,security].every(p=>p.executionEnabled===false),true);
});
test("Role-derived proposals remain deterministic and never perform actions",()=>{
 const once=JSON.stringify(createAllSpecialistPersonaProposals(roster));
 const again=JSON.stringify(createAllSpecialistPersonaProposals(roster));
 assert.equal(once,again);
 assert.equal(proposals.some(p=>p.ownerApproved||p.executionEnabled),false);
});
