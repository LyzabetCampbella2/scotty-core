/**
 * Stage B1 — 185 offline knowledge-readiness dossiers.
 * The dossier specifies evidence to verify before the agent may claim
 * expertise. It does not supply knowledge, grant external source access,
 * authorize private records, run providers, or certify agent performance.
 */
const KNOWLEDGE_STANDARDS=Object.freeze({
 "Health & Human Support":["Patient-facing educational reference from a qualified public source","Current professional scope and emergency escalation guidance","Individual report vs independent evidence"],
 "Research & Intelligence":["Primary-source identity and publication date","Contradictory or retracted sources","Claim-specific citation provenance"],
 "Exploration & Discovery":["Dated observations and measurement conditions","Map or field-source provenance","Field access and safety restrictions"],
 "Quality & Verification":["Independent acceptance criteria","Positive, negative and unauthorized tests","Evidence of actual runtime observations"],
 "Business & Enterprise":["Customer evidence with consent and provenance","Unit cost and delivery assumptions","Offer accuracy and consumer protections"],
 "Education & Learning":["Verified learning goals and prerequisites","Observed learner misunderstanding","Assessment and accessibility evidence"],
 "Accessibility & Wellbeing":["Standards applicable to the user's access context","Consent and user-stated needs","Independent usability and support tests"],
 "History & Culture":["Dated primary cultural or historical sources","Context, translation and source bias","Distinction between historical record and interpretation"],
 "Data & Analytics":["Schema, units and denominator definitions","Missingness, sampling and bias","Reproducible analysis method"],
 "Automation & Reliability":["Trigger, retry and idempotency rules","Actual storage and queue boundaries","Recovery and rollback evidence"],
 "Design & Media":["Canvas/export target dimensions and constraints","Contrast, usability and accessibility review","Content license and production-readiness evidence"],
 "Projects & Delivery":["Owner-approved scope and acceptance gate","Verified dependencies and dates","Recorded completion receipts"],
 "Life Sciences":["Research method and sample limitations","Ethical sampling and biological controls","Reproducible source evidence"],
 "Software & Applications":["Architecture and runtime version evidence","Authorization and data boundary","Test, deployment and readback results"],
 "Home & Logistics":["Owner-provided availability and task constraints","Supplier or destination confirmation","Documented dependencies and cost limits"],
 "Engineering & Systems":["Trusted environment and service inventory","Reproducible error trace and build SHA","Rollback, permission and observability evidence"],
 "Science & Environment":["Measured variables and instrument context","Alternative hypotheses and controls","Current safety, consent and access conditions"],
 "Command & Missions":["Approved mission and delegated scope","Personnel/agent permission boundaries","Actual state and completion evidence"],
 "Policy & Diplomacy":["Applicable jurisdiction, effective date and provenance","Rights, consent and stakeholder interests","Policy proposal vs current requirement"],
 "Commerce & Finance":["Costs, cash versus profit and time basis","Verified pricing and applicable financial constraints","Owner spending approval and uncertainty"],
 "Operations & Coordination":["Confirmed assignees and owner deadlines","Task state and authorized handoff","Dependency and blocked-status evidence"],
 "Strategy & Reasoning":["Assumptions and decision criteria","Competing proposals and base rates","Sensitivity and failure-mode analysis"],
 "Communications & Languages":["Audience, consent and delivery channel","Language nuance and accessibility","Draft approval and receipt boundaries"],
 "Security & Defense":["Identity, resource and authorization boundary","Threat model and current defensive standards","Revocation/incident and recovery evidence"],
 "Creative & Knowledge":["Approved canon, source and version history","Narrative continuity and change classification","Owner acceptance and rights provenance"]
});
const KEY_MISUSE=Object.freeze({
 "Health & Human Support":"Do not diagnose, prescribe or imply clinical certification.",
 "Commerce & Finance":"Do not execute spending, transactions or financial decisions.",
 "Security & Defense":"Do not access restricted systems to demonstrate that a vulnerability exists.",
 "Policy & Diplomacy":"Do not present an unverified interpretation as binding legal advice.",
 "Creative & Knowledge":"Do not silently promote proposed lore or prose into approved canon.",
 "Communications & Languages":"Do not send a draft or impersonate a recipient.",
 "Automation & Reliability":"Do not retry irreversible actions or deploy workflows without authorization."
});
const valid=x=>typeof x==="string"&&x.trim().length>0;
export function knowledgeDossier(profile){
 if(!profile||!valid(profile.canonicalAgentId)||!valid(profile.specialty)||!valid(profile.department)||!valid(profile.displayName))throw Error("INVALID_PROFILE_FOR_KNOWLEDGE");
 const standards=KNOWLEDGE_STANDARDS[profile.department];
 if(!standards||standards.length!==3)throw Error("UNKNOWN_DEPARTMENT_KNOWLEDGE");
 const candidate=profile.distinctiveReasoning?.domainSources||[];
 if(!Array.isArray(candidate)||candidate.some(s=>s.verified!==false||s.checkedAt!==null))throw Error("UNVERIFIED_SOURCE_STATUS_REQUIRED");
 const role=profile.role==="Chief"?"department chief":"specialist";
 return {
  dossierId:"b1-knowledge-"+profile.canonicalAgentId,
  canonicalAgentId:profile.canonicalAgentId,
  displayName:profile.displayName,
  role:profile.role,
  specialty:profile.specialty,
  department:profile.department,
  rosterBlobSha:profile.rosterBlobSha,
  status:"KNOWLEDGE_REQUIREMENTS_DRAFT_NOT_VERIFIED",
  sourceAccess:"NONE",
  factualKnowledgeCertified:false,
  externalSourceChecksRun:0,
  proposedKnowledgeRequirements:standards.map((need,i)=>({
    requirementId:profile.canonicalAgentId+"-K"+(i+1),
    requirement:need+" — scoped to "+profile.specialty,
    evidenceRef:null,
    status:"NEEDS_INDEPENDENT_VERIFICATION",
    checkedAt:null
  })),
  researchQuestions:[
    "What is the best-authorized source for "+profile.specialty+" in "+profile.department+" and when was it updated?",
    "Which methods or constraints for "+profile.specialty+" differ between this "+role+" and other roles in "+profile.department+"?",
    "What claim about "+profile.specialty+" cannot be supported without new evidence or qualified review?",
    "What provenance, permission and acceptance proof would a chief need to trust a proposed "+profile.specialty+" deliverable?"
  ],
  candidateReading: candidate.map(x=>({...x,verified:false,checkedAt:null,usedAsEvidence:false})),
  riskOfMisuse:KEY_MISUSE[profile.department]||"Do not cross project access boundaries, invent verified facts or act on a draft.",
  updatePolicy:{
    frequency:"BEFORE_AUTHOR_APPROVED_RELEASE_AND_WHEN_REFERENCES_CHANGE",
    offlineNow:true,
    mayPromoteToSharedMemory:false,
    mayRequestPrivateSources:false,
    mustRecordExactOwnerPermissionForData:true
  },
  reviewerDecision:"PENDING",
  reviewerEvidence:null,
  realWorldValidation:"NOT_RUN",
  readyForCertification:false
 };
}
export function createAllKnowledgeDossiers(drafts){
 if(drafts?.stage!=="B"||drafts?.phase!==1||drafts?.profiles?.length!==185)throw Error("B1_DRAFTS_REQUIRED");
 const seen=new Set(),output=[];
 for(const p of drafts.profiles){
  if(seen.has(p.canonicalAgentId))throw Error("DUPLICATE_AGENT_DOSSIER");
  seen.add(p.canonicalAgentId);
  output.push(knowledgeDossier(p));
 }
 if(new Set(output.map(x=>x.department)).size!==25)throw Error("INCOMPLETE_DEPARTMENT_KNOWLEDGE_COVERAGE");
 return {
  stage:"B",phase:1,
  source:"Owner-approved A0 canonical roster and role-draft source references",
  state:"ALL_REQUIREMENTS_PENDING_EVIDENCE",
  dossiers:output,
  summary:{dossiers:185,knowledgeChecks:185*3,researchQuestions:185*4,verifiedSourceChecks:0,certifiedKnowledgeDossiers:0}
 };
}
