import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "./draft-builder.mjs";
import {createAllKnowledgeDossiers} from "./knowledge-dossiers.mjs";
import {prepareSourceReview,sourceReviewReadiness} from "./source-review.mjs";

const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),"utf8"));
const roster=load("../../../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../../../docs/a0/roster-freeze-lock-2026-11-07.json");
const knowledge=createAllKnowledgeDossiers(createPhase1BrainDrafts(roster,lock));

test("555 knowledge requirements accept offline metadata-only review planning",()=>{
 assert.equal(knowledge.dossiers.length,185);
 let count=0;
 for(const dossier of knowledge.dossiers){
  for(const req of dossier.proposedKnowledgeRequirements){
   const entry={agentId:dossier.canonicalAgentId,requirementId:req.requirementId,
     sourceCategory:"OFFICIAL_DOCUMENTATION",title:"Synthetic documentation title",
     publisher:"Example educational publisher",publishedOn:"2026-01-01",
     sourceUrl:"https://example.org/fictional-method",claimToVerify:"Specific claim requiring independent verification"};
   const receipt=prepareSourceReview(dossier,entry);
   assert.equal(receipt.externalFetchPerformed,false);
   assert.equal(receipt.productionDataAccessed,false);
   assert.equal(receipt.sourceContentRead,false);
   assert.equal(receipt.factCheckComplete,false);
   assert.equal(receipt.approvedForKnowledgeBase,false);
   assert.equal(sourceReviewReadiness(receipt).ready,false);
   count++;
  }
 }
 assert.equal(count,555);
});
test("No local credentials, restricted hosts, embedded user info or fake source verification accepted",()=>{
 const dossier=knowledge.dossiers[0],id=dossier.proposedKnowledgeRequirements[0].requirementId;
 const base={agentId:dossier.canonicalAgentId,requirementId:id,sourceCategory:"ACADEMIC_STUDY",title:"Synthetic study",
  publisher:"Example laboratory",publishedOn:"2026-02-01",sourceUrl:"https://example.edu/article",
  claimToVerify:"An as-yet unverified result"};
 for(const badUrl of ["http://example.org/","https://user:pass@example.org/",
  "https://localhost/","https://127.0.0.1/private","https://192.168.1.4",
  "https://10.1.1.1","https://test.local/","file:///etc/passwd","https://[::1]/"]){
  assert.throws(()=>prepareSourceReview(dossier,{...base,sourceUrl:badUrl}),/PUBLIC_SOURCE_METADATA_MUST_USE_SAFE_HTTPS/);
 }
 assert.throws(()=>prepareSourceReview(dossier,{...base,agentId:"another-agent"}),/INVALID_SOURCE_REVIEW_METADATA/);
 assert.throws(()=>prepareSourceReview(dossier,{...base,verified:true}),/INVALID_SOURCE_REVIEW_METADATA/);
 assert.throws(()=>prepareSourceReview(dossier,{...base,sourceCategory:"AUTHORIZED_OWNER_RECORD"}),/OWNER_RECORD_CONSENT_REQUIRED_NO_URL_ACCESS/);
 const restricted=prepareSourceReview(dossier,{...base,sourceUrl:undefined,sourceCategory:"AUTHORIZED_OWNER_RECORD",ownerConsentRef:"CONVERSATION_APPROVAL_NOT_GRANTED"});
 assert.equal(restricted.productionDataAccessed,false);
 assert.equal(restricted.approvedForKnowledgeBase,false);
 const forged=prepareSourceReview(dossier,base); forged.factCheckComplete=true;
 assert.equal(sourceReviewReadiness(forged).ready,false);
});
