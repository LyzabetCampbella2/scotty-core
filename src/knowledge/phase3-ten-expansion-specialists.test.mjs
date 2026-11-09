import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validateTenExpansionSpecialists} from "./phase3-ten-expansion-specialists.mjs";

const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=load("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const first=load("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const second=load("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const third=load("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json");
const eight=load("../../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json");
const eleven=load("../../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json");
const pilot=load("../../docs/stage-b/b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(frozen,lock));
const validate=p=>validateTenExpansionSpecialists(p,eleven,eight,frozen,queue,first,second,third);
const mutate=(index,fields)=>{
 const next=structuredClone(pilot);
 next.items[index]={...next.items[index],...fields};
 return next;
};
test("10 unique expansion specialists bring initial public candidates to 29 specialists and 25 chiefs",()=>{
 const report=validate(pilot);
 assert.equal(report.added.length,10);
 assert.equal(report.summary.totalFrozenAgents,185);
 assert.equal(report.summary.chiefsWithCandidate,25);
 assert.equal(report.summary.specialistsWithCandidate,29);
 assert.equal(report.summary.remainingSpecialistsWithoutCandidate,131);
 assert.equal(report.summary.totalDockets,555);
 assert.equal(report.summary.sourceDocketsWithInspectedCandidate,54);
 assert.equal(report.summary.sourceDocketsWithoutInspectedCandidate,501);
 assert.equal(report.summary.pendingIndependentDecisions,555);
 assert.equal(report.summary.actualSourcesIndependentlyVerified,0);
 assert.equal(report.summary.ownerApprovedKnowledgeLibraries,0);
 assert.equal(report.summary.liveCitationsAuthorized,0);
 assert.equal(report.summary.realModelEvaluations,0);
 assert.equal(report.summary.activeAgents,0);
 assert.deepEqual(new Set(report.added.map(x=>x.agentId)),
  new Set(Array.from({length:10},(_,i)=>"agent-expansion-"+String(i+1).padStart(3,"0"))));
 assert.equal(new Set(report.added.map(x=>x.requirementId)).size,10);
 for(const row of report.added){
  assert.equal(row.independentlyReviewed,false);
  assert.equal(row.verifiedKnowledgeClaim,false);
  assert.equal(row.ownerApproved,false);
  assert.equal(row.liveCitationAllowed,false);
  assert.equal(row.sourceImportedToAgent,false);
  assert.equal(row.permissionsGranted,false);
  assert.ok(queue.items.find(x=>x.requirementId===row.requirementId&&
   x.canonicalAgentId===row.agentId&&x.reviewState==="PENDING_SOURCE_EVIDENCE"));
 }
});
test("Each of 10 review candidates matches exact immutable name, specialty, chief and K1 docket",()=>{
 for(const item of pilot.items){
  const row=frozen.records.find(x=>x["Agent ID"]===item.agentId);
  assert.ok(row);
  assert.equal(item.displayName,row.Name);
  assert.equal(item.specialty,row.Specialty);
  assert.equal(item.department,row.Department);
  assert.equal(item.chiefId,row["Chief ID"]);
  assert.equal(item.requirementId,item.agentId+"-K1");
  assert.equal(item.ownerApproved,false);
  assert.equal(item.citableByLiveAgents,false);
 }
});
test("Wrong frozen ID or department/claim assignment fails closed",()=>{
 assert.throws(()=>validate(mutate(0,{agentId:"agent-bones-09"})),
  /B3_EXPANSION_SPECIALIST_DUPLICATE_OR_UNRECOGNIZED_ID/);
 assert.throws(()=>validate(mutate(0,{agentId:"agent-expansion-002"})),
  /B3_EXPANSION_SPECIALIST_WRONG_ROLE_OR_DOCKET|B3_EXPANSION_SPECIALIST_DUPLICATE_OR_UNRECOGNIZED_ID/);
 assert.throws(()=>validate(mutate(0,{displayName:"Not Janeway"})),
  /B3_EXPANSION_SPECIALIST_WRONG_ROLE_OR_DOCKET/);
 assert.throws(()=>validate(mutate(0,{specialty:"fact checking"})),
  /B3_EXPANSION_SPECIALIST_WRONG_ROLE_OR_DOCKET/);
 assert.throws(()=>validate(mutate(0,{department:"Quality & Verification"})),
  /B3_EXPANSION_SPECIALIST_WRONG_ROLE_OR_DOCKET/);
 assert.throws(()=>validate(mutate(0,{requirementId:"agent-expansion-001-K2"})),
  /B3_EXPANSION_SPECIALIST_WRONG_ROLE_OR_DOCKET/);
 const duplicate=structuredClone(pilot);duplicate.items[1]=duplicate.items[0];
 assert.throws(()=>validate(duplicate),/B3_EXPANSION_SPECIALIST_DUPLICATE_OR_UNRECOGNIZED_ID/);
});
test("Only exact HTTPS official URL paths accepted; no local targets, credentials or query strings",()=>{
 const invalid=[
  "http://science.nasa.gov/exoplanets/whats-a-transit/",
  "https://science.nasa.gov.evil.invalid/exoplanets/whats-a-transit/",
  "https://localhost/exoplanets/whats-a-transit/",
  "https://127.0.0.1/exoplanets/whats-a-transit/",
  "https://user:pass@science.nasa.gov/exoplanets/whats-a-transit/",
  "https://science.nasa.gov:8443/exoplanets/whats-a-transit/",
  "https://science.nasa.gov/exoplanets/whats-a-transit/?token=fake",
  "https://science.nasa.gov/exoplanets/whats-a-transit/#anything",
  "https://science.nasa.gov/exoplanets/another-page/",
  "file:///etc/passwd"
 ];
 for(const url of invalid)assert.throws(()=>validate(mutate(0,{url})),
  /B3_EXPANSION_SPECIALIST_SOURCE_URL_INVALID/,url);
});
test("No claimed owner, licensing, independent verification or live citation permission",()=>{
 const flags=[
  "originalSourceTextCopied","independentPublisherAuthentication",
  "independentlyVerifiedClaim","licensingReviewed",
  "ownerApproved","citableByLiveAgents","sharedMemoryPromotionAllowed"
 ];
 for(let i=0;i<pilot.items.length;i++){
  for(const k of flags)assert.throws(()=>validate(mutate(i,{[k]:true})),
    /B3_EXPANSION_SPECIALIST_FAKE_APPROVAL_OR_LICENSE/);
 }
 assert.throws(()=>validate(mutate(0,{ownerToken:"anything"})),
  /B3_EXPANSION_SPECIALIST_DUPLICATE_OR_UNRECOGNIZED_ID/);
 const forged=structuredClone(pilot);forged.ownerApproval="GRANTED";
 assert.throws(()=>validate(forged),/B3_EXPANSION_SPECIALIST_UNAPPROVED_MANIFEST_REQUIRED/);
 const forgedSummary=structuredClone(pilot);forgedSummary.summary.ownerApprovedLibraries=5;
 assert.throws(()=>validate(forgedSummary),/B3_EXPANSION_SPECIALIST_UNAPPROVED_MANIFEST_REQUIRED/);
});
test("Missing/invalid/future date, changed roster and incomplete batch are rejected",()=>{
 assert.throws(()=>validate(mutate(0,{publicationDate:"2026-02-30"})),
  /B3_EXPANSION_SPECIALIST_BAD_SOURCE_METADATA/);
 assert.throws(()=>validate(mutate(0,{publicationDate:"2030-01-01"})),
  /B3_EXPANSION_SPECIALIST_BAD_SOURCE_METADATA/);
 assert.throws(()=>validate(mutate(0,{paraphrase:""})),
  /B3_EXPANSION_SPECIALIST_BAD_SOURCE_METADATA/);
 const small=structuredClone(pilot);small.items.pop();
 assert.throws(()=>validate(small),/B3_EXPANSION_SPECIALIST_UNAPPROVED_MANIFEST_REQUIRED/);
 assert.throws(()=>validateTenExpansionSpecialists(pilot,eleven,eight,
  {...frozen,records:frozen.records.slice(1)},queue,first,second,third),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
