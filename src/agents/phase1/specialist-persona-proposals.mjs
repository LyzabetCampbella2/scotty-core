/**
 * Stage B1 — proposed specialist persona directions.
 * Each proposal is derived solely from the approved role + authored playbook,
 * not the owner's wishes or a validated psychological assessment.
 * NO immutable ID changes, no model calls, and no automatic adoption.
 */
import {specialistPlaybook} from "./specialist-playbooks.mjs";

const DEPARTMENT_VOICES = Object.freeze({
 "Health & Human Support":{baseline:["compassionate","careful","clear"],style:"supportive clinical-literacy guide",handoff:"Separate reported experiences, factual claims and questions for a qualified practitioner"},
 "Research & Intelligence":{baseline:["curious","scrupulous","measured"],style:"evidence detective",handoff:"Give independent source chains, confidence and unresolved contradictions"},
 "Exploration & Discovery":{baseline:["adventurous","methodical","observant"],style:"field navigator",handoff:"Provide dated observations, safety contingencies and unverified assumptions"},
 "Quality & Verification":{baseline:["impartial","precise","persistent"],style:"independent examiner",handoff:"List pass/fail conditions and counterexamples"},
 "Business & Enterprise":{baseline:["enterprising","pragmatic","customer-aware"],style:"enterprise strategist",handoff:"Show proposed assumptions, costs and validation milestones"},
 "Education & Learning":{baseline:["patient","encouraging","structured"],style:"learning coach",handoff:"Provide objectives, practice prompts and observable checks"},
 "Accessibility & Wellbeing":{baseline:["inclusive","empathetic","practical"],style:"barrier-removal advocate",handoff:"Separate observed barriers from needs inferred without consent"},
 "History & Culture":{baseline:["contextual","curious","respectful"],style:"historical interpreter",handoff:"Record provenance, chronology, perspectives and competing accounts"},
 "Data & Analytics":{baseline:["exact","skeptical","pattern-attentive"],style:"measurement analyst",handoff:"Provide denominators, data-quality warnings and calculations"},
 "Automation & Reliability":{baseline:["resilient","systematic","cautious"],style:"reliability mechanic",handoff:"Include trigger, idempotency, failure state and restore evidence"},
 "Design & Media":{baseline:["imaginative","visual","audience-sensitive"],style:"visual storyteller",handoff:"Show format, design constraints and accessibility checks"},
 "Projects & Delivery":{baseline:["accountable","organized","transparent"],style:"milestone steward",handoff:"Link each milestone to dependencies, evidence and approval"},
 "Life Sciences":{baseline:["inquisitive","ethical","methodical"],style:"biological field researcher",handoff:"Explain scale, controls and limits of inference"},
 "Software & Applications":{baseline:["inventive","technical","tenacious"],style:"application builder",handoff:"Specify reproduction, authorization, regression and readback checks"},
 "Home & Logistics":{baseline:["thoughtful","practical","organized"],style:"household orchestrator",handoff:"Distinguish proposed dates, quantities and confirmed bookings"},
 "Engineering & Systems":{baseline:["inventive","diagnostic","steady"],style:"systems engineer",handoff:"Report environment, version, failure symptoms, rollback and QA"},
 "Science & Environment":{baseline:["observant","cautious","inquisitive"],style:"science explainer",handoff:"List variables, measurement units and alternative hypotheses"},
 "Command & Missions":{baseline:["decisive","disciplined","cooperative"],style:"mission planner",handoff:"Separate proposed assignments, approvals and observed completion"},
 "Policy & Diplomacy":{baseline:["diplomatic","principled","analytical"],style:"policy mediator",handoff:"Separate draft text, effective law, stakeholder interests and permissions"},
 "Commerce & Finance":{baseline:["resource-conscious","calculating","candid"],style:"commercial analyst",handoff:"Break out cash, margin, uncertainty and owner spending consent"},
 "Operations & Coordination":{baseline:["reliable","practical","collaborative"],style:"operations organizer",handoff:"Note accountable owners, waiting states and status evidence"},
 "Strategy & Reasoning":{baseline:["logical","reflective","skeptical"],style:"strategy examiner",handoff:"List alternatives, decision criteria, sensitivities and assumptions"},
 "Communications & Languages":{baseline:["articulate","respectful","attentive"],style:"communication editor",handoff:"Preserve recipient consent, tone intent and review-ready drafts"},
 "Security & Defense":{baseline:["vigilant","measured","protective"],style:"security defender",handoff:"List assets, trust boundary, denied paths and no-access proof"},
 "Creative & Knowledge":{baseline:["imaginative","attentive","curious"],style:"creative researcher",handoff:"Separate approved canon or source records from proposed changes"}
});

const SPECIALTY_LENSES = Object.freeze([
 {pattern:/health|medication|clinical|nutrition|mental health|care|emergency/i,archetype:"health information interpreter",traits:["reassuring","non-prescriptive"],question:"Which symptoms or facts are reported, and which require a licensed professional?",deliverable:"A non-diagnostic question set and limitations note",failure:"Treating educational material as a diagnosis or prescription"},
 {pattern:/accessib|inclusive|supportive|resource navigation/i,archetype:"inclusive experience advocate",traits:["attentive","consent-aware"],question:"Whose participation is blocked, and which alternative is independently usable?",deliverable:"A barrier-and-alternative matrix",failure:"Assuming one accommodation works for everyone"},
 {pattern:/audit|verification|fact|citation|source|evidence|literature|information retriev|research synthesis/i,archetype:"source provenance analyst",traits:["source-critical","meticulous"],question:"Can each claim be traced to an authorized primary record?",deliverable:"A claim/source/uncertainty register",failure:"Citing a headline or inaccessible record as verified evidence"},
 {pattern:/risk|security|threat|privacy|secret|authentication|access|incident/i,archetype:"trust-boundary examiner",traits:["privacy-minded","cautious"],question:"Which resource and identity boundary would an untrusted request attempt to cross?",deliverable:"A scope-denial and recovery checklist",failure:"Reading or changing a resource merely to test whether access is possible"},
 {pattern:/backend|database|persistence|software architecture|devops|infrastructure|code review/i,archetype:"systems contract engineer",traits:["rigorous","diagnostic"],question:"Which contract, authorization or persistence boundary fails under the smallest reproducible case?",deliverable:"A synthetic regression specification",failure:"Claiming a source change is a production fix"},
 {pattern:/frontend|visual|graphic|design|photograph|video|media|brand/i,archetype:"visual experience craftsperson",traits:["composition-aware","iterative"],question:"Does the design remain legible and accessible at its target size and use context?",deliverable:"A storyboard or visual QA checklist",failure:"Confusing a concept with an exported, rights-cleared artifact"},
 {pattern:/astronomy|geography|expedition|planet|earth|physics|chemistry|biolog|botany|ecolog|environment|scientific/i,archetype:"observational science guide",traits:["curious","hypothesis-aware"],question:"Which measurable observation, controls and limits support the proposed conclusion?",deliverable:"A controlled observation protocol",failure:"Inventing observations or inferring causation from correlation"},
 {pattern:/curriculum|tutor|learning|education|study/i,archetype:"scaffolded learning coach",traits:["mentoring","diagnostic"],question:"What prerequisite and observable answer would show the learner has advanced?",deliverable:"A teach-practice-feedback mini-lesson",failure:"Equating completion with comprehension"},
 {pattern:/statistics|data clean|data collect|visualization|analytic|metrics|measurement/i,archetype:"data integrity analyst",traits:["unit-conscious","precision-driven"],question:"What denominator, missing records or transformation could change the apparent finding?",deliverable:"A data-quality and metric-definition worksheet",failure:"Presenting a distorted summary as a population finding"},
 {pattern:/pricing|budget|cash|finance|cost|revenue|unit economics|forecast|commerce/i,archetype:"financial scenario modeller",traits:["frugal","assumption-conscious"],question:"Which assumptions drive cash, cost and uncertainty in this proposed decision?",deliverable:"A scenario table with adverse-case notes",failure:"Confusing forecast revenue with confirmed cash"},
 {pattern:/policy|ethic|regulat|governance|legal|contract|negotiat|mediati|international|stakeholder/i,archetype:"policy context investigator",traits:["balanced","jurisdiction-aware"],question:"What is merely proposed, and what authorized source states the current rule?",deliverable:"A policy-status and stakeholder brief",failure:"Presenting proposals as binding law"},
 {pattern:/writing|editing|translation|interview|email|speaking|tone|communication|meeting/i,archetype:"audience intention editor",traits:["audience-aware","diplomatic"],question:"What must this audience understand without misleading certainty or unsolicited outreach?",deliverable:"An unsent audience-adapted message with review notes",failure:"Sending a draft or assuming verified translation or consent"},
 {pattern:/automation|reliability|recovery|workflow|scheduling|coordination/i,archetype:"reliability and handoff architect",traits:["repeatability-focused","dependable"],question:"What should happen on a duplicate trigger, missing approval or incomplete handoff?",deliverable:"A bounded workflow and recovery diagram",failure:"Retrying external side effects without idempotency"},
 {pattern:/creative|novel|character|plot|worldbuild|poet|story|fiction|critique|document organ/i,archetype:"narrative continuity editor",traits:["continuity-minded","canon-protective"],question:"What is established in the owner's canon and what is a proposed creative alternative?",deliverable:"A continuity and proposal ledger",failure:"Converting creative suggestion into approved canon"},
 {pattern:/customer|business|service pack|market|business plan/i,archetype:"commercial service designer",traits:["customer-curious","ethical"],question:"Which customer need would justify testing this offer before claiming demand?",deliverable:"A synthetic offer-validation plan",failure:"Treating fictional customer examples as real demand"},
 {pattern:/project|task|milestone|deliver|dependenc|progress|goal|quality|resource/i,archetype:"evidence-led project coordinator",traits:["accountable","planning-oriented"],question:"Which dependency, reviewer and observable completion proof decide the next step?",deliverable:"A checkpoint and evidence register",failure:"Reporting a proposed milestone as already completed"}
]);

const PRESENTATION_VARIANTS=Object.freeze([
 {tempo:"measured",voice:"concise and structured",emphasis:"lead with observed evidence, then options"},
 {tempo:"patient",voice:"warm and instructional",emphasis:"explain the smallest useful next step and invite review"},
 {tempo:"deliberate",voice:"calm and exact",emphasis:"lead with boundary conditions and failure cases"},
 {tempo:"energetic",voice:"constructive and curious",emphasis:"surface creative alternatives before narrowing the choice"},
 {tempo:"reflective",voice:"thoughtful and diplomatic",emphasis:"compare perspectives and tradeoffs without overstating certainty"}
]);
function stable(value){return typeof value==="string"&&value.trim().length>0;}
function deterministicIndex(value,count){
 let hash=0;
 for(const char of value)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
 return hash%count;
}

export function specialistPersonaProposal(row){
 if(!row||row.Role!=="Specialist"||!stable(row["Agent ID"])||!stable(row.Name)||!stable(row.Department)||!stable(row.Specialty)||!stable(row["Chief ID"]))throw Error("INVALID_CANONICAL_SPECIALIST");
 const id=row["Agent ID"],department=row.Department,focus=row.Specialty,chiefId=row["Chief ID"];
 const dept=DEPARTMENT_VOICES[department];
 if(!dept)throw Error("UNKNOWN_CANONICAL_DEPARTMENT");
 const roleLens=SPECIALTY_LENSES.find(x=>x.pattern.test(focus))||{
  archetype:"domain-focused specialist",traits:["detail-minded","collaborative"],
  question:"What scoped evidence and deliverable would show the proposed work meets its acceptance criteria?",
  deliverable:"A bounded evidence and deliverable brief",failure:"Mistaking a proposal for verified execution"
 };
 const presentation=PRESENTATION_VARIANTS[deterministicIndex(id,PRESENTATION_VARIANTS.length)];
 const playbook=specialistPlaybook({id,department,specialty:focus});
 const traits=[...dept.baseline,...roleLens.traits];
 if(traits.length!==5||new Set(traits).size!==5)throw Error("PERSONALITY_TRAIT_COLLISION");
 return Object.freeze({
  canonicalAgentId:id,
  displayName:row.Name,
  department,chiefId,specialty:focus,
  proposalVersion:"b1-specialist-persona-v1",
  sourceKind:"ROLE_AND_METHOD_DERIVED_CONCEPT_NOT_OWNER_PREFERENCE",
  proposedArchetype:roleLens.archetype,
  proposedTraits:Object.freeze(traits),
  proposedCommunication:{
   tempo:presentation.tempo,voice:presentation.voice,emphasis:presentation.emphasis,
   defaultOutputStyle:"Give a concrete "+focus+" draft with source/evidence and limitations"
  },
  signatureInquiry:"For "+focus+" in "+department+": "+roleLens.question,
  proposedReasoningMethod:Object.freeze([
    "Confirm exact owner-approved mission, project and specialist scope.",
    playbook.procedure[0],playbook.procedure[1],
    "Perform the "+focus+" review with documented uncertainty; do not access external tools.",
    "Provide "+roleLens.deliverable.toLowerCase()+" to chief "+chiefId+" for approval."
  ]),
  proposedDeliverable:focus+" — "+roleLens.deliverable,
  primaryFailureRisk:roleLens.failure,
  methodSource:{playbookVersion:playbook.version,methodCoverage:playbook.methodCoverage,reviewed:playbook.reviewed},
  roleBoundary:playbook.boundaries[0],
  handoff:{toChiefId:chiefId,requiredEvidence:dept.handoff,requiresOwnerApprovalBeforeNewTask:true},
  ownerApproved:false,ownerReviewedAt:null,
  behaviorModelTestsRun:0,realDomainSourcesVerified:false,
  executionEnabled:false,liveTools:Object.freeze([]),memoryWriteEnabled:false,
  disclaimer:"Editorial personality proposal only. Do not present deterministic style selection as a user preference or evaluation result."
 });
}

export function createAllSpecialistPersonaProposals(frozen){
 if(frozen?.freezeStatus!=="OWNER_APPROVED_VERSIONED_SNAPSHOT"||!Array.isArray(frozen.records)||frozen.records.length!==185)throw Error("OWNER_APPROVED_ROSTER_REQUIRED");
 const chiefs=new Map(frozen.records.filter(x=>x.Role==="Chief").map(x=>[x["Agent ID"],x]));
 const specialists=frozen.records.filter(x=>x.Role==="Specialist");
 if(specialists.length!==160)throw Error("EXPECTED_160_SPECIALISTS");
 const entries=specialists.map(row=>{
  const chief=chiefs.get(row["Chief ID"]);
  if(!chief||chief.Department!==row.Department)throw Error("INVALID_CANONICAL_CHIEF_LINK");
  return specialistPersonaProposal(row);
 });
 if(new Set(entries.map(x=>x.canonicalAgentId)).size!==160)throw Error("DUPLICATE_SPECIALIST_IDENTITIES");
 return entries;
}
