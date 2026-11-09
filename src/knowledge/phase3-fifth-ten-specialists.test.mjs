import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validateFifthTenSpecialistSources} from "./phase3-fifth-ten-specialists.mjs";

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=read("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const c1=read("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const c2=read("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const c3=read("../../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json");
const b8=read("../../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json");
const d11=read("../../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json");
const t1=read("../../docs/stage-b/b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json");
const t2=read("../../docs/stage-b/b3-second-ten-expansion-specialist-public-pilot-2026-11-08.json");
const t3=read("../../docs/stage-b/b3-third-ten-expansion-specialist-public-pilot-2026-11-08.json");
const t4=read("../../docs/stage-b/b3-fourth-ten-expansion-specialist-public-pilot-2026-11-09.json");
const t5=read("../../docs/stage-b/b3-fifth-ten-specialist-public-pilot-2026-11-09.json");
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(frozen,lock));
const run=p=>validateFifthTenSpecialistSources(p,t4,t3,t2,t1,d11,b8,frozen,queue,c1,c2,c3);
const change=(index,delta)=>{
 const m=structuredClone(t5);m.items[index]={...m.items[index],...delta};return m;
};
test("Reusable schema validates fifth batch: 25 chiefs, 69 specialists, 94 candidates, zero approval",()=>{
 const report=run(t5);
 assert.equal(report.added.length,10);
 assert.equal(report.summary.chiefsWithFirstCandidate,25);
 assert.equal(report.summary.specialistsWithFirstCandidate,69);
 assert.equal(report.summary.specialistsWithoutFirstCandidate,91);
 assert.equal(report.summary.docketsWithCandidate,94);
 assert.equal(report.summary.docketsWithoutCandidate,461);
 assert.equal(report.summary.independentReviewsPending,555);
 assert.equal(report.summary.verifiedClaims,0);
 assert.equal(report.summary.ownerApprovedLibraries,0);
 assert.equal(report.summary.liveCitationPermissions,0);
 assert.equal(report.summary.actualModelEvaluations,0);
 assert.equal(report.summary.activatedAgents,0);
 assert.equal(new Set(report.added.map(x=>x.agentId)).size,10);
 assert.deepEqual(new Set(report.added.map(x=>x.agentId)),
  new Set(["agent-expansion-041","agent-expansion-042","agent-expansion-043",
   "agent-expansion-044","agent-geordi-01","agent-geordi-02","agent-geordi-03",
   "agent-geordi-04","agent-geordi-05","agent-geordi-06"]));
});
test("Each fifth-batch source belongs to correct frozen chief, specialty and open K1 requirement",()=>{
 for(const item of t5.items){
  const record=frozen.records.find(r=>r["Agent ID"]===item.agentId);
  assert.ok(record);
  assert.equal(record.Role,"Specialist");
  assert.equal(record.Name,item.displayName);
  assert.equal(record.Department,item.department);
  assert.equal(record.Specialty,item.specialty);
  assert.equal(record["Chief ID"],item.chiefId);
  assert.equal(item.requirementId,item.agentId+"-K1");
  assert.equal(item.observedOn,"2026-11-09");
  assert.ok(queue.items.some(d=>d.requirementId===item.requirementId&&
   d.canonicalAgentId===item.agentId&&d.reviewState==="PENDING_SOURCE_EVIDENCE"));
  assert.equal(item.independentlyVerifiedClaim,false);
  assert.equal(item.ownerApproved,false);
  assert.equal(item.citableByLiveAgents,false);
 }
});
test("Unsafe host, port, credentials, query, fragment, wrong path and non-HTTPS rejected",()=>{
 for(const url of [
  "http://csrc.nist.gov/glossary/term/repeatability",
  "https://csrc.nist.gov.evil.invalid/glossary/term/repeatability",
  "https://localhost/glossary/term/repeatability",
  "https://127.0.0.1/glossary/term/repeatability",
  "https://user:password@csrc.nist.gov/glossary/term/repeatability",
  "https://csrc.nist.gov:8443/glossary/term/repeatability",
  "https://csrc.nist.gov/glossary/term/repeatability?token=secret",
  "https://csrc.nist.gov/glossary/term/repeatability#claim",
  "https://csrc.nist.gov/glossary/term/reproducibility",
  "file:///etc/passwd"
 ])assert.throws(()=>run(change(0,{url})),/B3_GENERIC_BATCH_SOURCE_URL_INVALID/,url);
});
test("Forged IDs, replayed previous agents, wrong specialty and modified dockets denied",()=>{
 assert.throws(()=>run(change(0,{agentId:"agent-expansion-031"})),/B3_GENERIC_BATCH_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 assert.throws(()=>run(change(0,{agentId:"agent-geordi-01"})),
  /B3_GENERIC_BATCH_FROZEN_AGENT_OR_DOCKET_MISMATCH|B3_GENERIC_BATCH_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 assert.throws(()=>run(change(0,{displayName:"Wrong"})),/B3_GENERIC_BATCH_FROZEN_AGENT_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(change(0,{specialty:"backend engineering"})),/B3_GENERIC_BATCH_FROZEN_AGENT_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(change(0,{chiefId:"chief-geordi"})),/B3_GENERIC_BATCH_FROZEN_AGENT_OR_DOCKET_MISMATCH/);
 assert.throws(()=>run(change(0,{requirementId:"agent-expansion-041-K2"})),/B3_GENERIC_BATCH_FROZEN_AGENT_OR_DOCKET_MISMATCH/);
 const dup=structuredClone(t5);dup.items[1]=dup.items[0];
 assert.throws(()=>run(dup),/B3_GENERIC_BATCH_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
});
test("Claimed owner consent, independent source verification or live grants never pass",()=>{
 for(let i=0;i<t5.items.length;i++)
  for(const key of ["originalSourceTextCopied","independentPublisherAuthentication",
   "independentlyVerifiedClaim","licensingReviewed","ownerApproved",
   "citableByLiveAgents","sharedMemoryPromotionAllowed"])
    assert.throws(()=>run(change(i,{[key]:true})),/B3_GENERIC_BATCH_FALSE_REVIEW_APPROVAL/);
 assert.throws(()=>run(change(0,{ownerToken:"forged"})),/B3_GENERIC_BATCH_DUPLICATE_UNKNOWN_OR_REPLAY_ID/);
 const fake=structuredClone(t5);fake.ownerApproval="GRANTED";
 assert.throws(()=>run(fake),/B3_GENERIC_BATCH_MANIFEST_MUST_REMAIN_UNAPPROVED/);
 const inflated=structuredClone(t5);inflated.summary.verifiedClaims=10;
 assert.throws(()=>run(inflated),/B3_GENERIC_BATCH_MANIFEST_MUST_REMAIN_UNAPPROVED/);
});
test("Bad dates, incomplete batch and truncated frozen roster are rejected",()=>{
 assert.throws(()=>run(change(0,{publicationDate:"2026-02-30"})),/B3_GENERIC_BATCH_INVALID_SOURCE_METADATA/);
 assert.throws(()=>run(change(0,{publicationDate:"2027-01-01"})),/B3_GENERIC_BATCH_INVALID_SOURCE_METADATA/);
 assert.throws(()=>run(change(0,{paraphrase:""})),/B3_GENERIC_BATCH_INVALID_SOURCE_METADATA/);
 const incomplete=structuredClone(t5);incomplete.items.pop();
 assert.throws(()=>run(incomplete),/B3_GENERIC_BATCH_MANIFEST_MUST_REMAIN_UNAPPROVED/);
 assert.throws(()=>validateFifthTenSpecialistSources(t5,t4,t3,t2,t1,d11,b8,
  {...frozen,records:frozen.records.slice(1)},queue,c1,c2,c3),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
