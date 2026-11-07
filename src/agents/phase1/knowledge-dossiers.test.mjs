import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {createAllKnowledgeDossiers,knowledgeDossier} from "./knowledge-dossiers.mjs";
import {makePhase1ReviewPackets} from "./review-packets.mjs";

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),"utf8"));
const roster=load("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const drafts=createPhase1BrainDrafts(roster,lock);
const knowledge=createAllKnowledgeDossiers(drafts);

test("185 role-scoped knowledge dossiers cover all frozen identities and departments",()=>{
 assert.equal(knowledge.summary.dossiers,185);
 assert.equal(knowledge.summary.knowledgeChecks,555);
 assert.equal(knowledge.summary.researchQuestions,740);
 assert.equal(knowledge.summary.verifiedSourceChecks,0);
 assert.equal(knowledge.summary.certifiedKnowledgeDossiers,0);
 assert.equal(new Set(knowledge.dossiers.map(d=>d.canonicalAgentId)).size,185);
 assert.equal(new Set(knowledge.dossiers.map(d=>d.department)).size,25);
 assert.deepEqual(new Set(knowledge.dossiers.map(d=>d.canonicalAgentId)),new Set(roster.records.map(r=>r["Agent ID"])));
 for(const d of knowledge.dossiers){
  assert.equal(d.proposedKnowledgeRequirements.length,3);
  assert.equal(d.researchQuestions.length,4);
  assert.ok(d.researchQuestions.every(q=>q.includes(d.specialty)),d.canonicalAgentId);
  assert.ok(d.proposedKnowledgeRequirements.every(k=>k.status==="NEEDS_INDEPENDENT_VERIFICATION"&&k.evidenceRef===null));
  assert.equal(d.candidateReading.every(s=>s.usedAsEvidence===false&&s.verified===false&&s.checkedAt===null),true);
  assert.equal(d.sourceAccess,"NONE");
  assert.equal(d.factualKnowledgeCertified,false);
  assert.equal(d.externalSourceChecksRun,0);
  assert.equal(d.reviewerDecision,"PENDING");
  assert.equal(d.readyForCertification,false);
  assert.equal(d.updatePolicy.mayPromoteToSharedMemory,false);
  assert.equal(d.updatePolicy.mayRequestPrivateSources,false);
 }
});
test("Every review packet includes matching unverified, non-operational knowledge requirements",()=>{
 const packets=makePhase1ReviewPackets(drafts);
 assert.equal(packets.summary.knowledgeRequirements,555);
 assert.equal(packets.summary.researchQuestions,740);
 assert.equal(packets.summary.verifiedKnowledgeSources,0);
 for(const p of packets.packets){
  const x=p.knowledgeReadiness;
  assert.equal(x.canonicalAgentId,p.canonicalAgentId);
  assert.equal(x.specialty,p.specialty);
  assert.equal(x.rosterBlobSha,p.provenance.rosterGitBlobSha);
  assert.equal(x.factualKnowledgeCertified,false);
  assert.equal(x.readyForCertification,false);
  assert.equal(p.certification,"NOT_CERTIFIED");
 }
});
test("Reject malformed, missing or falsely verified candidate references",()=>{
 const p=drafts.profiles.find(p=>p.role==="Specialist"&&p.distinctiveReasoning.domainSources.length>0);
 assert.ok(p);
 assert.throws(()=>knowledgeDossier({...p,department:"Unknown"}),/UNKNOWN_DEPARTMENT_KNOWLEDGE/);
 assert.throws(()=>knowledgeDossier({...p,canonicalAgentId:""}),/INVALID_PROFILE_FOR_KNOWLEDGE/);
 const sources=p.distinctiveReasoning.domainSources.map(s=>({...s,verified:true,checkedAt:"2026-11-07"}));
 assert.throws(()=>knowledgeDossier({...p,distinctiveReasoning:{...p.distinctiveReasoning,domainSources:sources}}),/UNVERIFIED_SOURCE_STATUS_REQUIRED/);
 assert.throws(()=>createAllKnowledgeDossiers({...drafts,profiles:drafts.profiles.slice(1)}),/B1_DRAFTS_REQUIRED/);
});
