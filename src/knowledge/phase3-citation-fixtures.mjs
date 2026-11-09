/**
 * B3 citation-integrity rehearsal with FICTIONAL inputs only.
 * Text agreement / hashes do not establish scientific truth, publisher
 * authority, user consent, valid licensing or permission to cite real sources.
 */
import {createHash} from "node:crypto";

const digest=text=>createHash("sha256").update(text,"utf8").digest("hex");
const synthetic=text=>typeof text==="string"&&
 text.startsWith("SYNTHETIC:")&&text.length>=25&&text.length<=3000;
const allowedFields=new Set(["agentId","requirementId","sourceText","quote","claim"]);
const exact=id=>typeof id==="string"&&id.length>0&&id.length<=256;

export function makeSyntheticCitationFixture(docket,input){
 if(!docket||docket.reviewState!=="PENDING_SOURCE_EVIDENCE"||
    docket.claimCitationVerified!==false||
    !input||typeof input!=="object"||Array.isArray(input)||
    Object.keys(input).some(k=>!allowedFields.has(k))||
    input.agentId!==docket.canonicalAgentId||
    input.requirementId!==docket.requirementId||
    !synthetic(input.sourceText)||
    !synthetic(input.claim)||
    typeof input.quote!=="string"||input.quote.trim().length<10||
    input.quote.length>500)
  throw Error("SYNTHETIC_CITATION_INPUT_REQUIRED");
 const pos=input.sourceText.indexOf(input.quote);
 if(pos<0)throw Error("SYNTHETIC_QUOTE_NOT_IN_SOURCE");
 return {
  kind:"B3_SYNTHETIC_QUOTE_INTEGRITY_ONLY",
  agentId:input.agentId,requirementId:input.requirementId,
  sourceText:input.sourceText,
  sourceDigest:digest(input.sourceText),
  quote:input.quote,
  quoteStart:pos,quoteEnd:pos+input.quote.length,
  proposedClaim:input.claim,
  evidenceClassification:"FICTIONAL_LOCAL_FIXTURE",
  realSourceRetrieved:false,realSourceVerified:false,
  semanticClaimSupported:false,
  publisherChecked:false,licenseChecked:false,
  citationEligible:false,ownerApproved:false,
  independentReviewEvidence:null,
  realModelEvaluation:"NOT_RUN"
 };
}

export function inspectSyntheticCitationFixture(docket,fixture){
 const fail=reason=>({
  quoteIntegrityVerified:false,realCitationValid:false,
  factualClaimVerified:false,reviewOutcome:"REJECTED_SYNTHETIC_FIXTURE",
  reason
 });
 if(!docket||docket.reviewState!=="PENDING_SOURCE_EVIDENCE"||
    !fixture||typeof fixture!=="object"||Array.isArray(fixture)||
    Object.keys(fixture).some(k=>!new Set([
      "kind","agentId","requirementId","sourceText","sourceDigest",
      "quote","quoteStart","quoteEnd","proposedClaim","evidenceClassification",
      "realSourceRetrieved","realSourceVerified","semanticClaimSupported",
      "publisherChecked","licenseChecked","citationEligible","ownerApproved",
      "independentReviewEvidence","realModelEvaluation"
    ]).has(k))||
    fixture.kind!=="B3_SYNTHETIC_QUOTE_INTEGRITY_ONLY"||
    fixture.agentId!==docket.canonicalAgentId||
    fixture.requirementId!==docket.requirementId||
    fixture.evidenceClassification!=="FICTIONAL_LOCAL_FIXTURE"||
    fixture.realSourceRetrieved!==false||
    fixture.realSourceVerified!==false||
    fixture.semanticClaimSupported!==false||
    fixture.publisherChecked!==false||
    fixture.licenseChecked!==false||
    fixture.citationEligible!==false||
    fixture.ownerApproved!==false||
    fixture.independentReviewEvidence!==null||
    fixture.realModelEvaluation!=="NOT_RUN"||
    !synthetic(fixture.sourceText)||!synthetic(fixture.proposedClaim))
  return fail("UNTRUSTED_OR_MISMATCHED_FIXTURE");
 if(fixture.sourceDigest!==digest(fixture.sourceText)||
    !Number.isInteger(fixture.quoteStart)||
    !Number.isInteger(fixture.quoteEnd)||
    fixture.quoteStart<0||fixture.quoteEnd>fixture.sourceText.length||
    fixture.quoteEnd<=fixture.quoteStart||
    fixture.sourceText.slice(fixture.quoteStart,fixture.quoteEnd)!==fixture.quote)
  return fail("SOURCE_TEXT_OR_EXCERPT_TAMPERED");
 return {
  quoteIntegrityVerified:true,
  realCitationValid:false,
  factualClaimVerified:false,
  reviewOutcome:"FICTIONAL_QUOTE_MATCH_ONLY",
  reason:"Verbatim quotation exists in its synthetic source; meaning and real origin remain unchecked."
 };
}

export function buildSyntheticCitationQASuite(queue){
 if(queue?.kind!=="OFFLINE_SOURCE_REVIEW_QUEUE"||queue.items?.length!==555)
  throw Error("B3_SOURCE_QUEUE_REQUIRED");
 const byId=new Set(),tests=[];
 for(const item of queue.items){
  if(byId.has(item.reviewId))throw Error("DUPLICATE_SOURCE_REQUIREMENT");
  byId.add(item.reviewId);
  if(!exact(item.canonicalAgentId)||!exact(item.requirementId))
   throw Error("INVALID_SOURCE_REQUIREMENT");
  const quote="fictional quotation for "+item.requirementId;
  const sourceText="SYNTHETIC: A completely invented source contains a "+quote+".";
  const claim="SYNTHETIC: The fictional quotation is for software integrity QA, not a real world fact.";
  const fixture=makeSyntheticCitationFixture(item,{
   agentId:item.canonicalAgentId,requirementId:item.requirementId,
   sourceText,quote,claim
  });
  tests.push({
   agentId:item.canonicalAgentId,requirementId:item.requirementId,
   result:inspectSyntheticCitationFixture(item,fixture),
   fakeQuoteTestPerformed:true,realCitationTestPerformed:false
  });
 }
 if(tests.length!==555||tests.some(x=>!x.result.quoteIntegrityVerified))
  throw Error("SYNTHETIC_QUOTE_QA_FAILED");
 return {
  schemaVersion:1,stage:"B",phase:3,
  mode:"SYNTHETIC_CITATION_QA_NOT_EXTERNAL_FACT_CHECK",
  cases:tests,
  summary:{cases:555,syntheticQuoteIntegrityChecks:555,
   realPublisherChecks:0,realCitationVerifications:0,
   ownerApprovals:0}
 };
}
