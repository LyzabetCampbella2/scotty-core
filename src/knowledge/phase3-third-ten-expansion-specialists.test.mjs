import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validateThirdTenExpansionSpecialists} from "./phase3-third-ten-expansion-specialists.mjs";
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=load("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const chief1=load("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const chief2=load("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const chief3=load("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json");
const eight=load("../../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json");
const eleven=load("../../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json");
const ten1=load("../../docs/stage-b/b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json");
const ten2=load("../../docs/stage-b/b3-second-ten-expansion-specialist-public-pilot-2026-11-08.json");
const ten3=load("../../docs/stage-b/b3-third-ten-expansion-specialist-public-pilot-2026-11-08.json");
const dockets=createPhase3EvidenceQueue(createPhase1BrainDrafts(frozen,lock));
const run=p=>validateThirdTenExpansionSpecialists(p,ten2,ten1,eleven,eight,
 frozen,dockets,chief1,chief2,chief3);
const edit=(i,change)=>{
 const result=structuredClone(ten3);
 result.items[i]={...result.items[i],...change};
 return result;
};
test("New official-public source candidates cover exact expansion agents 021–030, not approved knowledge",()=>{
 const result=run(ten3);
 assert.equal(result.added.length,10);
 assert.equal(result.summary.frozenAgents,185);
 assert.equal(result.summary.chiefsWithFirstSourceCandidate,25);
 assert.equal(result.summary.specialistsWithFirstSourceCandidate,49);
 assert.equal(result.summary.specialistsMissingFirstSource,111);
 assert.equal(result.summary.sourceDockets,555);
 assert.equal(result.summary.publicDocketsWithCandidate,74);
 assert.equal(result.summary.publicDocketsMissingCandidate,481);
 assert.equal(result.summary.pendingIndependentDocketReviews,555);
 assert.equal(result.summary.independentlyVerifiedClaims,0);
 assert.equal(result.summary.ownerApprovedKnowledgeLibraries,0);
 assert.equal(result.summary.activeLiveCitations,0);
 assert.equal(result.summary.realModelEvaluations,0);
 assert.equal(result.summary.activeAgents,0);
 assert.deepEqual(new Set(result.added.map(x=>x.agentId)),
  new Set(Array.from({length:10},(_,i)=>"agent-expansion-"+String(i+21).padStart(3,"0"))));
 assert.equal(new Set(result.added.map(x=>x.requirementId)).size,10);
 for(const r of result.added){
  assert.equal(r.independentClaimVerified,false);
  assert.equal(r.rightsApproved,false);
  assert.equal(r.ownerApproved,false);
  assert.equal(r.liveCitationAllowed,false);
  assert.equal(r.productionDataProcessed,false);
  assert.equal(r.modelTestPerformed,false);
  assert.ok(dockets.items.some(x=>x.requirementId===r.requirementId&&
   x.canonicalAgentId===r.agentId&&x.reviewState==="PENDING_SOURCE_EVIDENCE"));
 }
});
test("Source assignments preserve immutable agent names, departments, chiefs, and open K1 dockets",()=>{
 for(const m of ten3.items){
  const row=frozen.records.find(x=>x["Agent ID"]===m.agentId);
  assert.ok(row);
  assert.equal(row.Role,"Specialist");
  assert.equal(m.displayName,row.Name);
  assert.equal(m.specialty,row.Specialty);
  assert.equal(m.department,row.Department);
  assert.equal(m.chiefId,row["Chief ID"]);
  assert.equal(m.requirementId,m.agentId+"-K1");
  assert.equal(m.ownerApproved,false);
  assert.equal(m.citableByLiveAgents,false);
 }
});
test("Duplicated/foreign identities, inaccurate specialties and cross-agent dockets cannot pass",()=>{
 assert.throws(()=>run(edit(0,{agentId:"agent-expansion-001"})),/B3_THIRD_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 assert.throws(()=>run(edit(0,{agentId:"agent-expansion-022"})),/B3_THIRD_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH|B3_THIRD_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 assert.throws(()=>run(edit(0,{displayName:"Unknown Person"})),/B3_THIRD_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(edit(0,{specialty:"photography"})),/B3_THIRD_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(edit(0,{chiefId:"chief-expansion-pike"})),/B3_THIRD_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(edit(0,{requirementId:"agent-expansion-021-K2"})),/B3_THIRD_TEN_FROZEN_ROLE_OR_DOCKET_MISMATCH/);
 const dupe=structuredClone(ten3);dupe.items[1]=dupe.items[0];
 assert.throws(()=>run(dupe),/B3_THIRD_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
});
test("Exact official HTTPS sources required, excluding private hosts and URL credentials/queries",()=>{
 const invalid=[
  "http://sre.google/sre-book/service-level-objectives/",
  "https://sre.google.evil.invalid/sre-book/service-level-objectives/",
  "https://localhost/sre-book/service-level-objectives/",
  "https://127.0.0.1/sre-book/service-level-objectives/",
  "https://user:secret@sre.google/sre-book/service-level-objectives/",
  "https://sre.google:8443/sre-book/service-level-objectives/",
  "https://sre.google/sre-book/service-level-objectives/?token=fake",
  "https://sre.google/sre-book/service-level-objectives/#incorrect",
  "https://sre.google/sre-book/monitoring-distributed-systems/",
  "file:///etc/passwd"
 ];
 for(const url of invalid)assert.throws(()=>run(edit(0,{url})),
  /B3_THIRD_TEN_SOURCE_URL_INVALID/,url);
});
test("No false owner approval, independent verification, licensing or live source ingestion",()=>{
 const fields=[
  "originalSourceTextCopied","independentPublisherAuthentication",
  "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
  "citableByLiveAgents","sharedMemoryPromotionAllowed"
 ];
 for(let i=0;i<10;i++){
  for(const k of fields)assert.throws(()=>run(edit(i,{[k]:true})),
   /B3_THIRD_TEN_FALSE_SOURCE_APPROVAL_OR_GRANT/);
 }
 assert.throws(()=>run(edit(0,{claimedOwnerAuthorization:"approved"})),
  /B3_THIRD_TEN_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 const fake=structuredClone(ten3);fake.ownerApproval="GRANTED";
 assert.throws(()=>run(fake),/B3_THIRD_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
 const inflated=structuredClone(ten3);inflated.summary.verifiedClaims=10;
 assert.throws(()=>run(inflated),/B3_THIRD_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
});
test("Malformed or future publication dates, changed roster and missing sources fail closed",()=>{
 assert.throws(()=>run(edit(0,{publicationDate:"2026-02-30"})),/B3_THIRD_TEN_INVALID_SOURCE_METADATA/);
 assert.throws(()=>run(edit(0,{publicationDate:"2028-01-01"})),/B3_THIRD_TEN_INVALID_SOURCE_METADATA/);
 assert.throws(()=>run(edit(0,{criticalLimit:""})),/B3_THIRD_TEN_INVALID_SOURCE_METADATA/);
 const shorter=structuredClone(ten3);shorter.items.pop();
 assert.throws(()=>run(shorter),/B3_THIRD_TEN_UNAPPROVED_MANIFEST_REQUIRED/);
 assert.throws(()=>validateThirdTenExpansionSpecialists(ten3,ten2,ten1,eleven,eight,
  {...frozen,records:frozen.records.slice(1)},dockets,chief1,chief2,chief3),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
