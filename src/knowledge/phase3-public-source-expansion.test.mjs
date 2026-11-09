import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {validatePublicSourceExpansion} from "./phase3-public-source-expansion.mjs";

const load=relative=>JSON.parse(readFileSync(new URL(relative,import.meta.url),"utf8"));
const frozen=load("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const original=load("../../docs/stage-b/b3-public-source-pilot-2026-11-08.json");
const expansion=load("../../docs/stage-b/b3-public-source-expansion-2026-11-08.json");
const drafts=createPhase1BrainDrafts(frozen,lock);
const queue=createPhase3EvidenceQueue(drafts);
const combined=validatePublicSourceExpansion(expansion,original,queue,frozen);
function rewrite(i,changes){
 const x=structuredClone(expansion);x.items[i]={...x.items[i],...changes};return x;
}
test("New five inspected official sources extend pilot to 10 unique canonical chiefs",()=>{
 assert.equal(combined.entries.length,10);
 assert.equal(combined.originals,5);
 assert.equal(combined.additional,5);
 assert.equal(combined.summary.assistantReportedOfficialPagesInspected,10);
 assert.equal(combined.summary.frozenChiefsLinked,10);
 assert.equal(combined.summary.pendingDocketsAssociated,10);
 assert.equal(combined.summary.independentHumanVerified,0);
 assert.equal(combined.summary.ownerApproved,0);
 assert.equal(combined.summary.factualCitationsAuthorized,0);
 assert.equal(combined.summary.productionDataReads,0);
 assert.equal(combined.summary.modelEvaluations,0);
 assert.equal(combined.summary.activatedAgents,0);
 const expectedNew=[
  "chief-data","chief-expansion-janeway","chief-expansion-seven",
  "chief-quark","chief-zora"
 ];
 assert.deepEqual(new Set(expansion.items.map(x=>x.agentId)),new Set(expectedNew));
 assert.equal(new Set(combined.entries.map(x=>x.agentId)).size,10);
 assert.equal(new Set(combined.entries.map(x=>x.requirementId)).size,10);
 for(const row of combined.entries){
  assert.equal(row.approvedForCitation,false);
  assert.equal(row.ownerApproved,false);
  assert.equal(row.independentlyVerified,false);
  assert.ok(queue.items.some(x=>x.requirementId===row.requirementId&&
    x.canonicalAgentId===row.agentId&&x.reviewState==="PENDING_SOURCE_EVIDENCE"));
 }
});
test("Source expansion rejects wrong domain, path, downgrade, URL credentials and query",()=>{
 for(const bad of [
  "http://pubmed.ncbi.nlm.nih.gov/help/",
  "https://pubmed.ncbi.nlm.nih.gov/help/?token=fake",
  "https://username:password@pubmed.ncbi.nlm.nih.gov/help/",
  "https://pubmed.ncbi.nlm.nih.gov.evil.invalid/help/",
  "https://pubmed.ncbi.nlm.nih.gov:8443/help/",
  "https://localhost/help/",
  "https://127.0.0.1/help/",
  "file:///etc/passwd"
 ]){
  assert.throws(()=>validatePublicSourceExpansion(rewrite(0,{url:bad}),original,queue,frozen),
    /B3_EXPANSION_URL_NOT_OFFICIAL/,bad);
 }
});
test("Wrong agent/requirement, duplicate, cross-department and truncated roster fail closed",()=>{
 assert.throws(()=>validatePublicSourceExpansion(rewrite(0,{agentId:"chief-worf"}),original,queue,frozen),
  /B3_EXPANSION_DUPLICATE_OR_UNKNOWN_ID/);
 assert.throws(()=>validatePublicSourceExpansion(rewrite(0,{requirementId:"chief-data-K3"}),original,queue,frozen),
  /B3_EXPANSION_WRONG_CHIEF_OR_REQUIREMENT/);
 assert.throws(()=>validatePublicSourceExpansion(rewrite(0,{department:"Creative & Knowledge"}),original,queue,frozen),
  /B3_EXPANSION_WRONG_CHIEF_OR_REQUIREMENT/);
 const duplicate=structuredClone(expansion);duplicate.items[1]=duplicate.items[0];
 assert.throws(()=>validatePublicSourceExpansion(duplicate,original,queue,frozen),
  /B3_EXPANSION_DUPLICATE_OR_UNKNOWN_ID/);
 assert.throws(()=>validatePublicSourceExpansion(expansion,original,queue,{...frozen,records:frozen.records.slice(1)}),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
 assert.throws(()=>validatePublicSourceExpansion(expansion,original,{...queue,items:queue.items.slice(1)},frozen),
  /B3_SOURCE_PILOT_MANIFEST_INVALID/);
});
test("No manuscript text, token fields or self-asserted signoffs may slip into review records",()=>{
 for(let i=0;i<expansion.items.length;i++){
  for(const key of [
   "ownerApproved","independentlyVerifiedClaim","licensingReviewed",
   "citableByLiveAgents","sharedMemoryPromotionAllowed",
   "independentPublisherAuthentication","originalSourceTextCopied"
  ]){
   assert.throws(()=>validatePublicSourceExpansion(rewrite(i,{[key]:true}),original,queue,frozen),
    /B3_EXPANSION_FORGED_VERIFICATION_OR_OWNER_APPROVAL/);
  }
 }
 const sneaky=rewrite(0,{ownerSession:"trusted",productionSource:"real-record"});
 assert.throws(()=>validatePublicSourceExpansion(sneaky,original,queue,frozen),
  /B3_EXPANSION_DUPLICATE_OR_UNKNOWN_ID/);
 const forged=structuredClone(expansion);forged.ownerApproval="GRANTED";
 assert.throws(()=>validatePublicSourceExpansion(forged,original,queue,frozen),
  /B3_EXPANSION_PENDING_MANIFEST_REQUIRED/);
 const badSummary=structuredClone(expansion);badSummary.summary.approvedKnowledgePacks=1;
 assert.throws(()=>validatePublicSourceExpansion(badSummary,original,queue,frozen),
  /B3_EXPANSION_PENDING_MANIFEST_REQUIRED/);
});
test("No source inspection record may assert a fabricated publication date or proof of content copying",()=>{
 assert.throws(()=>validatePublicSourceExpansion(rewrite(0,{publicationDate:"2026-02-30"}),original,queue,frozen),
  /B3_EXPANSION_BAD_SOURCE_METADATA/);
 assert.throws(()=>validatePublicSourceExpansion(rewrite(0,{publicationDate:"2027-01-01"}),original,queue,frozen),
  /B3_EXPANSION_BAD_SOURCE_METADATA/);
 assert.throws(()=>validatePublicSourceExpansion(rewrite(2,{paraphrase:""}),original,queue,frozen),
  /B3_EXPANSION_BAD_SOURCE_METADATA/);
 const mangled=structuredClone(expansion);mangled.items.pop();
 assert.throws(()=>validatePublicSourceExpansion(mangled,original,queue,frozen),
  /B3_EXPANSION_PENDING_MANIFEST_REQUIRED/);
});
