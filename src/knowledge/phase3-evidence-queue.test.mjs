import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {
 createPhase3EvidenceQueue,previewSourceMetadata,
 runPhase3OfflineRetrievalChecks
} from "./phase3-evidence-queue.mjs";

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const frozen=read("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const drafts=createPhase1BrainDrafts(frozen,lock);
const queue=createPhase3EvidenceQueue(drafts);
const first=queue.items[0];
const base={
 agentId:first.canonicalAgentId,requirementId:first.requirementId,
 category:"OFFICIAL_DOCUMENTATION",title:"Fictional source metadata (not actually opened)",
 publisher:"Example documentation publisher",publishedOn:"2026-01-01",
 checkedOn:"2026-10-15",sourceUrl:"https://example.org/synthetic-document",
 claim:"An unconfirmed claim for review",evidenceRef:null
};
const at="2026-11-08";
test("Exactly 555 source-evidence reviews belong to 185 frozen IDs with no completed checks",()=>{
 assert.equal(queue.items.length,555);
 assert.equal(queue.summary.agents,185);
 assert.equal(queue.summary.requirements,555);
 assert.equal(queue.summary.reviewStatesPending,555);
 assert.equal(queue.summary.actualSourcesInspected,0);
 assert.equal(queue.summary.verifiedCitations,0);
 assert.equal(queue.summary.externalFetches,0);
 assert.equal(queue.summary.knowledgeLibrariesApproved,0);
 assert.equal(queue.summary.productionRecordsUsed,0);
 assert.equal(queue.rosterBlobSha,lock.snapshotGitBlobSha);
 assert.equal(new Set(queue.items.map(x=>x.reviewId)).size,555);
 assert.equal(new Set(queue.items.map(x=>x.canonicalAgentId)).size,185);
 const perId=new Map();
 for(const r of queue.items){
  perId.set(r.canonicalAgentId,(perId.get(r.canonicalAgentId)||0)+1);
  assert.equal(r.reviewState,"PENDING_SOURCE_EVIDENCE");
  assert.equal(r.claimCitationVerified,false);
  assert.equal(r.sourceContentsInspected,false);
  assert.equal(r.sourceRightsConfirmed,false);
  assert.equal(r.mayIndexForAgents,false);
  assert.equal(r.mayCiteExternalClaim,false);
  assert.equal(r.productionDataUsed,false);
  assert.equal(r.automatedFetchPerformed,false);
  assert.equal(r.refresh.policyApproved,false);
  assert.ok(r.refresh.suggestedReviewIntervalDays>=30);
  assert.ok(r.sourceCandidates.every(c=>c.verified===false&&c.contentRetrieved===false));
 }
 assert.ok([...perId.values()].every(x=>x===3));
});
test("Plausible public source metadata never becomes verified evidence or professional citation",()=>{
 const r=previewSourceMetadata(first,base,at);
 assert.equal(r.acceptedAsReviewCandidate,true);
 assert.equal(r.reason,"METADATA_ONLY_UNVERIFIED");
 assert.equal(r.realSourceVerified,false);
 assert.equal(r.citationAllowed,false);
 assert.equal(r.knowledgeApproved,false);
 assert.equal(r.sourceContentChecked,false);
 assert.equal(r.licenseOrRightsConfirmed,false);
 assert.equal(r.noExternalFetch,true);
 assert.equal(r.freshnessSuggestion,"RECENT_METADATA_UNCONFIRMED");
 assert.equal(r.proposedReviewIntervalDays,first.refresh.suggestedReviewIntervalDays);
});
test("Missing, dated or impossible metadata is classified without fetching any source",()=>{
 const stale=previewSourceMetadata(first,{...base,checkedOn:"2026-01-15"},at);
 assert.equal(stale.acceptedAsReviewCandidate,true);
 assert.equal(stale.freshnessSuggestion,"NEEDS_FRESHNESS_REVIEW");
 assert.equal(stale.citationAllowed,false);
 const olderThanPublication=previewSourceMetadata(first,{...base,checkedOn:"2025-12-30"},at);
 assert.equal(olderThanPublication.reason,"IMPOSSIBLE_PUBLICATION_OR_REVIEW_CHRONOLOGY");
 const fromFuture=previewSourceMetadata(first,{...base,checkedOn:"2027-01-01"},at);
 assert.equal(fromFuture.acceptedAsReviewCandidate,false);
 const invalidDate=previewSourceMetadata(first,{...base,publishedOn:"2026-02-30"},at);
 assert.equal(invalidDate.reason,"INVALID_OR_UNTRUSTED_METADATA");
 const fakeEvidence=previewSourceMetadata(first,{...base,evidenceRef:"I checked it"},at);
 assert.equal(fakeEvidence.reason,"UNVERIFIED_EVIDENCE_REF_FORBIDDEN");
});
test("Unsafe or private URL formats and untrusted permission flags are rejected in metadata intake",()=>{
 const bad=[
  "http://example.org/doc","https://user:secret@example.org/doc",
  "https://localhost/private","https://localhost./private",
  "https://127.0.0.1/private","https://192.168.1.2/",
  "https://10.10.10.10/","https://172.16.1.1/",
  "https://169.254.1.2/","https://example.local/data",
  "https://[::1]/secret","file:///etc/passwd","https://example.org:8443/doc",
  "https://8.8.8.8/doc"
 ];
 for(const url of bad){
  const result=previewSourceMetadata(first,{...base,sourceUrl:url},at);
  assert.equal(result.acceptedAsReviewCandidate,false,url);
  assert.equal(result.citationAllowed,false,url);
 }
 const x=previewSourceMetadata(first,{...base,ownerApproved:true},at);
 assert.equal(x.reason,"INVALID_OR_UNTRUSTED_METADATA");
 assert.equal(previewSourceMetadata(first,{...base,agentId:"agent-not-owning"},at).acceptedAsReviewCandidate,false);
 assert.equal(previewSourceMetadata(first,{...base,requirementId:"missing"},at).acceptedAsReviewCandidate,false);
});
test("185 draft retrieval smoke checks preserve role and chief scope without claiming real citations",()=>{
 const results=runPhase3OfflineRetrievalChecks(drafts);
 assert.equal(results.summary.agents,185);
 assert.equal(results.summary.checks,185);
 assert.equal(results.summary.actualModelTests,0);
 assert.equal(results.summary.verifiedSourceCitations,0);
 assert.equal(results.summary.operationallyCertifiedAgents,0);
 assert.equal(results.checks.length,185);
 assert.equal(new Set(results.checks.map(x=>x.agentId)).size,185);
 assert.ok(results.checks.every(x=>x.scopedToOwnRoleAndDepartmentGuide));
 assert.ok(results.checks.every(x=>x.citationsClaimed===0&&x.verifiedRealSourcesUsed===0));
 assert.ok(results.checks.every(x=>!x.actualModelRun&&!x.realRuntimePermissionChecked));
 assert.ok(results.checks.every(x=>x.retrievedDraftHits>=1));
});
test("Cannot run 185-case retrieval check or 555 source queue against truncated identities",()=>{
 assert.throws(()=>createPhase3EvidenceQueue({...drafts,profiles:drafts.profiles.slice(1)}),/B1_FROZEN_DRAFTS_REQUIRED/);
 assert.throws(()=>runPhase3OfflineRetrievalChecks({...drafts,profiles:drafts.profiles.slice(1)}),/PHASE_B1_FROZEN_DRAFTS_REQUIRED/);
});
