/**
 * Stage B1 offline evaluation evidence envelopes.
 *
 * This does NOT run models or grade their behavior. Only attaches a LOCAL
 * synthetic fixture to a planned test and hashes its exact text. Neither a
 * matching hash nor any user-provided "PASS" text is external provider proof.
 */
import {createHash} from "node:crypto";

const digest=text=>createHash("sha256").update(text,"utf8").digest("hex");
const good=x=>typeof x==="string"&&x.trim().length>0;
const TYPES=new Set(["shared","specialty","adversarial"]);
const fixtureIdentity=record=>({
  schemaVersion:record.schemaVersion,
  evaluationId:record.evaluationId,
  agentId:record.agentId,
  testType:record.testType,
  plannedPromptHash:record.plannedPromptHash,
  outputSha256:record.outputSha256,
  outputText:record.outputText,
  evidenceKind:record.evidenceKind,
  modelExecutionStatus:record.modelExecutionStatus
});
const envelopeHash=record=>digest(JSON.stringify(fixtureIdentity(record)));

/** Never accept a passed or unplanned test as a starting point. */
export function prepareOfflineFixture(caseDefinition,outputText){
  if(!caseDefinition||!good(caseDefinition.evaluationId)||
     !good(caseDefinition.canonicalAgentId)||
     !TYPES.has(caseDefinition.type)||
     !good(caseDefinition.prompt)||
     caseDefinition.verdict!=="NOT_RUN"||
     caseDefinition.externalToolUseAllowed!==false||
     caseDefinition.dataSourceAccessAllowed!==false||
     caseDefinition.inputClass!=="SYNTHETIC_PUBLIC"||
     caseDefinition.outputEvidenceRef!==null)throw Error("LOCKED_UNRUN_EVALUATION_REQUIRED");
  if(!good(outputText)||outputText.length>10000)throw Error("NONEMPTY_BOUNDED_SYNTHETIC_TEXT_REQUIRED");
  const record={
    schemaVersion:1,
    evaluationId:caseDefinition.evaluationId,
    agentId:caseDefinition.canonicalAgentId,
    testType:caseDefinition.type,
    plannedPromptHash:digest(caseDefinition.prompt),
    outputSha256:digest(outputText),
    outputText,
    evidenceKind:"LOCAL_SYNTHETIC_FIXTURE",
    modelExecutionStatus:"NOT_RUN",
    evaluationVerdict:"NOT_GRADED",
    independentReviewerEvidence:null,
    authenticatedOwnerApproval:null,
    canUseForRealModelCertification:false,
    externalActionsPerformed:false,
    envelopeSha256:null
  };
  record.envelopeSha256=envelopeHash(record);
  return record;
}

export function verifyOfflineFixture(record,caseDefinition){
  if(!record||!caseDefinition)return false;
  if(record.schemaVersion!==1||record.evidenceKind!=="LOCAL_SYNTHETIC_FIXTURE"||
     record.modelExecutionStatus!=="NOT_RUN"||
     record.evaluationVerdict!=="NOT_GRADED"||
     record.independentReviewerEvidence!==null||
     record.authenticatedOwnerApproval!==null||
     record.canUseForRealModelCertification!==false||
     record.externalActionsPerformed!==false||
     record.evaluationId!==caseDefinition.evaluationId||
     record.agentId!==caseDefinition.canonicalAgentId||
     record.testType!==caseDefinition.type||
     !good(record.outputText)||record.outputText.length>10000||
     record.plannedPromptHash!==digest(caseDefinition.prompt)||
     record.outputSha256!==digest(record.outputText)||
     record.envelopeSha256!==envelopeHash(record))return false;
  return true;
}

export function offlineFixtureReviewStatus(record,caseDefinition){
  if(!verifyOfflineFixture(record,caseDefinition))return {
    syntacticEvidenceIntact:false,realModelEvaluationPassed:false,
    ownerApproved:false,certified:false,reason:"fixture-invalid"
  };
  return {
    syntacticEvidenceIntact:true,realModelEvaluationPassed:false,
    ownerApproved:false,certified:false,
    reason:"synthetic-fixture-only-needs-independent-model-evaluation"
  };
}
