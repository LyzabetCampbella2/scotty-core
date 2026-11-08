import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {NEW_CHIEF_CONCEPTS,newChiefConcept} from "./new-chief-concepts.mjs";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {makePhase1ReviewPackets} from "./review-packets.mjs";

const read = p => JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=read("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const drafts=createPhase1BrainDrafts(frozen,lock);
const packets=makePhase1ReviewPackets(drafts);

test("exact 17 remaining chiefs have distinctive authored proposals mapped by canonical identity",()=>{
 const unreferenced=drafts.profiles.filter(p=>p.role==="Chief"&&!p.priorChiefReview);
 assert.equal(NEW_CHIEF_CONCEPTS.length,17);
 assert.equal(unreferenced.length,17);
 assert.equal(drafts.summary.newChiefConceptProposals,17);
 assert.equal(drafts.summary.newChiefConceptsApproved,0);
 assert.equal(new Set(NEW_CHIEF_CONCEPTS.map(c=>c.id)).size,17);
 assert.equal(new Set(NEW_CHIEF_CONCEPTS.map(c=>c.signatureQuestion)).size,17);
 assert.equal(new Set(NEW_CHIEF_CONCEPTS.map(c=>c.archetype)).size,17);
 assert.equal(new Set(NEW_CHIEF_CONCEPTS.map(c=>c.exampleDeliverable)).size,17);
 for(const p of unreferenced){
  const c=p.proposedNewChiefConcept;
  assert.ok(c,p.canonicalAgentId);
  assert.equal(c.id,p.canonicalAgentId);
  assert.equal(c.name,p.displayName);
  assert.equal(c.department,p.department);
  assert.equal(c.traits.length,5,p.canonicalAgentId);
  assert.equal(new Set(c.traits).size,5);
  assert.equal(c.sourceKind,"ASSISTANT_AUTHORED_ROLE_DERIVED_PROPOSAL");
  assert.equal(c.ownerReviewed,false);
  assert.equal(c.certified,false);
  assert.equal(c.ownerApproval,"PENDING");
  assert.deepEqual(c.actualTools,[]);
  assert.deepEqual(p.traits,[]);
  assert.equal(p.ownerApproved,false);
  assert.equal(p.ownerPreferenceEvidence,null);
 }
});
test("legacy chief references are never silently replaced by new suggestions",()=>{
 const previouslySourced=drafts.profiles.filter(p=>p.role==="Chief"&&p.priorChiefReview);
 assert.equal(previouslySourced.length,8);
 assert.ok(previouslySourced.every(p=>p.proposedNewChiefConcept===null));
 const troi=previouslySourced.find(p=>p.displayName==="TROI");
 assert.equal(troi.canonicalAgentId,"chief-expansion-troi");
 assert.equal(troi.priorChiefReview.identityStatus,"LEGACY_ID_MISMATCH_REQUIRES_OWNER_REVIEW");
 assert.equal(troi.priorChiefSourceApplied,false);
});
test("review packets expose 17 concepts but keep all 1480 evidence gates unchecked",()=>{
 const chiefProposals=packets.packets.filter(p=>p.role==="Chief"&&p.ownerDecisions.proposedLeadershipArchetype);
 assert.equal(chiefProposals.length,17);
 assert.equal(packets.summary.evidenceChecks,1480);
 assert.equal(packets.summary.approvedPersonalities,0);
 for(const p of chiefProposals){
  assert.equal(p.ownerDecisions.proposedPersonalityTraits.length,5);
  assert.ok(p.ownerDecisions.proposedSignatureQuestion);
  assert.ok(p.ownerDecisions.proposedChiefMethod);
  assert.ok(p.ownerDecisions.proposedChiefFailureRisk);
  assert.equal(p.provenance.proposedChief.sourceKind,"ASSISTANT_AUTHORED_ROLE_DERIVED_PROPOSAL");
  assert.deepEqual(p.ownerDecisions.adoptedPersonalityTraits,[]);
  assert.equal(p.evidenceChecklist.every(x=>!x.passed),true);
  assert.equal(p.certification,"NOT_CERTIFIED");
 }
});
test("new chief proposals reject wrong name/department for existing ID",()=>{
 const source=NEW_CHIEF_CONCEPTS[0];
 assert.throws(()=>newChiefConcept({id:source.id,name:"IMPOSTOR",department:source.department}),/CANONICAL_CHIEF_IDENTITY_MISMATCH/);
 assert.throws(()=>newChiefConcept({id:source.id,name:source.name,department:"Wrong dept"}),/CANONICAL_CHIEF_IDENTITY_MISMATCH/);
 assert.equal(newChiefConcept({id:"chief-nonexistent",name:"UNKNOWN",department:"None"}),null);
});
