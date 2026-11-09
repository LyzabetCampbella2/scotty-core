import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "./phase3-evidence-queue.mjs";
import {
 makeSyntheticCitationFixture,inspectSyntheticCitationFixture,buildSyntheticCitationQASuite
} from "./phase3-citation-fixtures.mjs";

const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=read("../../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../../docs/a0/roster-freeze-lock-2026-11-07.json");
const drafts=createPhase1BrainDrafts(roster,lock);
const queue=createPhase3EvidenceQueue(drafts),docket=queue.items[0];
const sample={
 agentId:docket.canonicalAgentId,requirementId:docket.requirementId,
 sourceText:"SYNTHETIC: An invented report says the island has five imaginary trees.",
 quote:"the island has five imaginary trees",
 claim:"SYNTHETIC: A fictional island is described with five trees; this is not a real fact."
};

test("555 synthetic quote checks are not external source or claim verifications",()=>{
 const qa=buildSyntheticCitationQASuite(queue);
 assert.equal(qa.summary.cases,555);
 assert.equal(qa.summary.syntheticQuoteIntegrityChecks,555);
 assert.equal(qa.summary.realPublisherChecks,0);
 assert.equal(qa.summary.realCitationVerifications,0);
 assert.equal(qa.summary.ownerApprovals,0);
 assert.equal(qa.cases.length,555);
 assert.equal(new Set(qa.cases.map(x=>x.requirementId)).size,555);
 assert.equal(new Set(qa.cases.map(x=>x.agentId)).size,185);
 for(const entry of qa.cases){
  assert.equal(entry.result.quoteIntegrityVerified,true);
  assert.equal(entry.result.realCitationValid,false);
  assert.equal(entry.result.factualClaimVerified,false);
  assert.equal(entry.fakeQuoteTestPerformed,true);
  assert.equal(entry.realCitationTestPerformed,false);
 }
});
test("Exact substring and digest matching works only for synthetic quote integrity",()=>{
 const fixture=makeSyntheticCitationFixture(docket,sample);
 assert.match(fixture.sourceDigest,/^[a-f0-9]{64}$/);
 assert.equal(fixture.realSourceVerified,false);
 assert.equal(fixture.realSourceRetrieved,false);
 assert.equal(fixture.semanticClaimSupported,false);
 assert.equal(fixture.ownerApproved,false);
 assert.equal(fixture.citationEligible,false);
 const result=inspectSyntheticCitationFixture(docket,fixture);
 assert.equal(result.quoteIntegrityVerified,true);
 assert.equal(result.realCitationValid,false);
 assert.equal(result.factualClaimVerified,false);
 assert.equal(result.reviewOutcome,"FICTIONAL_QUOTE_MATCH_ONLY");
});
test("Invented, missing, altered and foreign-agent quotes are rejected",()=>{
 const fixture=makeSyntheticCitationFixture(docket,sample);
 assert.throws(()=>makeSyntheticCitationFixture(docket,{...sample,quote:"imagined quote not inside source"}),/SYNTHETIC_QUOTE_NOT_IN_SOURCE/);
 assert.throws(()=>makeSyntheticCitationFixture(docket,{...sample,ownerApproved:true}),/SYNTHETIC_CITATION_INPUT_REQUIRED/);
 assert.throws(()=>makeSyntheticCitationFixture(docket,{...sample,agentId:"other-agent"}),/SYNTHETIC_CITATION_INPUT_REQUIRED/);
 assert.throws(()=>makeSyntheticCitationFixture(docket,{...sample,claim:"real life medical advice"}),/SYNTHETIC_CITATION_INPUT_REQUIRED/);
 const tampered={...fixture,quote:"not the real span"};
 assert.equal(inspectSyntheticCitationFixture(docket,tampered).quoteIntegrityVerified,false);
 assert.equal(inspectSyntheticCitationFixture(docket,{...fixture,sourceText:fixture.sourceText+" extra"}).realCitationValid,false);
 assert.equal(inspectSyntheticCitationFixture(docket,{...fixture,ownerApproved:true}).reviewOutcome,"REJECTED_SYNTHETIC_FIXTURE");
 assert.equal(inspectSyntheticCitationFixture(queue.items[1],fixture).quoteIntegrityVerified,false);
});
test("Incomplete or duplicated reviews refuse the synthetic citation suite",()=>{
 assert.throws(()=>buildSyntheticCitationQASuite({...queue,items:queue.items.slice(1)}),/B3_SOURCE_QUEUE_REQUIRED/);
 assert.throws(()=>buildSyntheticCitationQASuite({...queue,items:[...queue.items.slice(1),queue.items[1]]}),/DUPLICATE_SOURCE_REQUIREMENT/);
});
