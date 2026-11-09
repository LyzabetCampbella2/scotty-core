import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validateSecondTenExpansionSpecialists} from "./phase3-second-ten-expansion-specialists.mjs";

const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=load("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const chief1=load("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const chief2=load("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const chief3=load("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json");
const eight=load("../../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json");
const eleven=load("../../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json");
const firstTen=load("../../docs/stage-b/b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json");
const secondTen=load("../../docs/stage-b/b3-second-ten-expansion-specialist-public-pilot-2026-11-08.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(roster,lock));
const inspect=m=>validateSecondTenExpansionSpecialists(
 m,firstTen,eleven,eight,roster,queue,chief1,chief2,chief3);
const checked=inspect(secondTen);
const amend=(index,fields)=>{
 const copy=structuredClone(secondTen);
 copy.items[index]={...copy.items[index],...fields};
 return copy;
};

test("second ten specialists are exact 011-020 roles: 39 specialists and 25 chiefs have initial source candidates",()=>{
 assert.equal(checked.kind,"B3_SECOND_TEN_SPECIALISTS_PENDING_REVIEW");
 assert.equal(checked.review.length,10);
 assert.equal(checked.summary.canonicalAgents,185);
 assert.equal(checked.summary.chiefsWithFirstPublicSourceCandidate,25);
 assert.equal(checked.summary.specialistsWithFirstPublicSourceCandidate,39);
 assert.equal(checked.summary.specialistsStillWithoutCandidate,121);
 assert.equal(checked.summary.evidenceDocketsTotal,555);
 assert.equal(checked.summary.docketsWithSourceCandidate,64);
 assert.equal(checked.summary.docketsWithoutSourceCandidate,491);
 assert.equal(checked.summary.independentDocketDecisionsStillPending,555);
 assert.equal(checked.summary.humanIndependentClaimApprovals,0);
 assert.equal(checked.summary.ownerApprovedKnowledgeLibraries,0);
 assert.equal(checked.summary.permissionedLiveCitations,0);
 assert.equal(checked.summary.realModelRetrievalRuns,0);
 assert.equal(checked.summary.activeAgents,0);
 assert.deepEqual(new Set(checked.review.map(x=>x.agentId)),
  new Set(Array.from({length:10},(_,i)=>"agent-expansion-"+String(i+11).padStart(3,"0"))));
 assert.equal(new Set(checked.review.map(x=>x.requirementId)).size,10);
});
test("source entries preserve frozen identity, chief, department, specialty and exactly one open K1 docket",()=>{
 for(const row of secondTen.items){
  const r=roster.records.find(x=>x["Agent ID"]===row.agentId);
  assert.ok(r);
  assert.equal(r.Role,"Specialist");
  assert.equal(row.displayName,r.Name);
  assert.equal(row.department,r.Department);
  assert.equal(row.chiefId,r["Chief ID"]);
  assert.equal(row.specialty,r.Specialty);
  assert.equal(row.requirementId,row.agentId+"-K1");
  assert.ok(queue.items.some(x=>x.canonicalAgentId===row.agentId&&
   x.requirementId===row.requirementId&&
   x.reviewState==="PENDING_SOURCE_EVIDENCE"&&!x.mayCiteExternalClaim));
 }
 for(const row of checked.review){
  assert.equal(row.externalClaimIndependentlyReviewed,false);
  assert.equal(row.sourceRightsReviewed,false);
  assert.equal(row.ownerApproved,false);
  assert.equal(row.liveAgentCitationAllowed,false);
  assert.equal(row.eligibleForKnowledgeImport,false);
  assert.equal(row.productionRecordsUsed,false);
 }
});
test("reject foreign ID, duplicate source, wrong chief or specialty, cross-docket replay",()=>{
 assert.throws(()=>inspect(amend(0,{agentId:"agent-expansion-001"})),
  /B3_SECOND_TEN_DUPLICATE_OR_INVALID_ID/);
 assert.throws(()=>inspect(amend(0,{agentId:"agent-expansion-012"})),
  /B3_SECOND_TEN_CANONICAL_ID_OR_REQUIREMENT_MISMATCH|B3_SECOND_TEN_DUPLICATE_OR_INVALID_ID/);
 assert.throws(()=>inspect(amend(0,{specialty:"frontend engineering"})),
  /B3_SECOND_TEN_CANONICAL_ID_OR_REQUIREMENT_MISMATCH/);
 assert.throws(()=>inspect(amend(0,{chiefId:"chief-worf"})),
  /B3_SECOND_TEN_CANONICAL_ID_OR_REQUIREMENT_MISMATCH/);
 assert.throws(()=>inspect(amend(0,{department:"Home & Logistics"})),
  /B3_SECOND_TEN_CANONICAL_ID_OR_REQUIREMENT_MISMATCH/);
 assert.throws(()=>inspect(amend(0,{requirementId:"agent-expansion-011-K3"})),
  /B3_SECOND_TEN_CANONICAL_ID_OR_REQUIREMENT_MISMATCH/);
 const dupe=structuredClone(secondTen);dupe.items[1]=dupe.items[0];
 assert.throws(()=>inspect(dupe),/B3_SECOND_TEN_DUPLICATE_OR_INVALID_ID/);
});
test("refuse non-HTTPS, private, alternate hostname/URL path and embedded credentials",()=>{
 const urls=[
  "http://www.grants.nih.gov/policy-and-compliance/policy-topics/reproducibility",
  "https://www.grants.nih.gov.evil.invalid/policy-and-compliance/policy-topics/reproducibility",
  "https://localhost/policy-and-compliance/policy-topics/reproducibility",
  "https://127.0.0.1/policy-and-compliance/policy-topics/reproducibility",
  "https://user:password@www.grants.nih.gov/policy-and-compliance/policy-topics/reproducibility",
  "https://www.grants.nih.gov:8443/policy-and-compliance/policy-topics/reproducibility",
  "https://www.grants.nih.gov/policy-and-compliance/policy-topics/reproducibility?oauth=fake",
  "https://www.grants.nih.gov/policy-and-compliance/policy-topics/reproducibility#altered",
  "https://www.grants.nih.gov/policy-and-compliance/policy-topics/other",
  "file:///etc/passwd"
 ];
 for(const url of urls)assert.throws(()=>inspect(amend(0,{url})),
  /B3_SECOND_TEN_SOURCE_URL_INVALID/,url);
});
test("no candidate may assert owner acceptance, license approval, source verification or live access",()=>{
 for(let i=0;i<secondTen.items.length;i++){
  for(const field of [
   "originalSourceTextCopied","independentPublisherAuthentication",
   "independentlyVerifiedClaim","licensingReviewed",
   "ownerApproved","citableByLiveAgents","sharedMemoryPromotionAllowed"
  ]){
   assert.throws(()=>inspect(amend(i,{[field]:true})),
    /B3_SECOND_TEN_CANNOT_PROMOTE_TO_APPROVED/);
  }
 }
 assert.throws(()=>inspect(amend(0,{ownerToken:"I approve"})),
  /B3_SECOND_TEN_DUPLICATE_OR_INVALID_ID/);
 const elevation=structuredClone(secondTen);elevation.ownerApproval="GRANTED";
 assert.throws(()=>inspect(elevation),/B3_SECOND_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
 const changed=structuredClone(secondTen);changed.summary.liveCitationsAllowed=10;
 assert.throws(()=>inspect(changed),/B3_SECOND_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
});
test("fake dates, unknown source claims, incomplete set and truncated roster fail closed",()=>{
 assert.throws(()=>inspect(amend(0,{publicationDate:"2026-02-30"})),
  /B3_SECOND_TEN_SOURCE_METADATA_INVALID/);
 assert.throws(()=>inspect(amend(0,{publicationDate:"2027-12-01"})),
  /B3_SECOND_TEN_SOURCE_METADATA_INVALID/);
 assert.throws(()=>inspect(amend(0,{paraphrase:""})),
  /B3_SECOND_TEN_SOURCE_METADATA_INVALID/);
 const partial=structuredClone(secondTen);partial.items.pop();
 assert.throws(()=>inspect(partial),/B3_SECOND_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
 assert.throws(()=>validateSecondTenExpansionSpecialists(secondTen,firstTen,eleven,eight,
  {...roster,records:roster.records.slice(1)},queue,chief1,chief2,chief3),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
