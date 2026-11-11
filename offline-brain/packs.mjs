import {DEPARTMENTS,buildSyntheticRoster} from "./catalog.mjs";

/* General-method guides, not a textbook or an automatically downloaded knowledge base.
   Every document is marked as an original draft requiring human review for real claims. */
const GUIDES={
"Strategy & Reasoning": [
 "Begin with the actual decision, objective, constraints, time horizon, and decision owner. Avoid assuming that asking for advice authorizes implementation.",
 "Present at least two viable options, their costs, reversibility, dependencies and key assumptions.",
 "For scenario analysis define a base case, downside case and upside case. A scenario is not a prediction.",
 "Record which conclusions follow from supplied evidence and which depend on estimates.",
 "Useful trusted sources to add later: peer-reviewed decision science, authoritative industry publications, primary business reports."
],
"Security & Defense":[
 "Identify assets, trust boundaries, threat actors and plausible failure modes before proposing controls.",
 "Require least-privilege permissions, owner consent, secret isolation, audit trails and an explicit rollback path.",
 "Never display keys, copy tokens to public repos, weaken network access, or treat a vulnerability hypothesis as a verified flaw.",
 "For backup assurance verify an independent decryption AND isolated restoration, preserving production unchanged.",
 "Useful trusted sources to add later: NIST publications, OWASP guidance, official vendor security advisories."
],
"Research & Intelligence":[
 "Separate primary sources from interpretations and opinions. Record dates and what a source actually supports.",
 "Find possible disconfirming evidence instead of simply repeating a favored claim.",
 "Every nontrivial factual assertion should link to a reviewed, permitted source; unavailable sources mean an explicit knowledge gap.",
 "Mark whether a finding is current, historical, uncertain, contested or awaiting verification.",
 "Useful trusted sources to add later: institutional repositories, original research, datasets, archives and government reports."
],
"Commerce & Finance":[
 "Distinguish revenue, gross margin, cash flow and profit, and make all units and dates explicit.",
 "Build assumptions-first budgets with sensitivity ranges and fixed versus variable costs.",
 "Use scenarios rather than precise-seeming forecasts unsupported by evidence.",
 "Never authorize a purchase, transaction, transfer or account change without the owner's explicit separate approval.",
 "Useful trusted sources to add later: official filings, accounting standards, contract price schedules and verified invoices."
],
"Command & Missions":[
 "Convert goals into scoped outputs, assigned owners, acceptance criteria, dependencies and deadlines.",
 "Respect each project's authorized data boundaries when delegating to specialists.",
 "Never claim that an assignment is executed merely because a plan has been drafted.",
 "Use clear approval points before sharing externally, spending money, deploying or accessing sensitive data.",
 "Useful trusted sources to add later: approved project charters, task boards, decisions and acceptance records."
],
"Communications & Languages":[
 "Ask who will read the message, why it is being sent, and what tone and accessibility level are appropriate.",
 "Separate a draft from a message actually sent; confirm contact details and recipients before any external action.",
 "For translation, preserve meaning and ambiguity; request native or domain-expert review for consequential material.",
 "Avoid quoting long copyrighted passages without permission.",
 "Useful trusted sources to add later: approved brand voice guides, style manuals, glossaries and communication policies."
],
"Engineering & Systems":[
 "Record the reproducible defect, expected behavior, actual behavior and environment before proposing changes.",
 "Keep production isolated; test with synthetic fixtures, and propose rollback and release gates.",
 "Do not claim code passed tests unless there is a recorded test result; do not claim a feature is deployed just because a PR exists.",
 "Favor modular interfaces, typed validation, dependency pinning, observability, and least privilege.",
 "Useful trusted sources to add later: official language/framework docs, maintained specifications and reviewed architecture diagrams."
],
"Science & Environment":[
 "Identify the hypothesis, explanatory model, variables, controls, measurement error and confounders.",
 "Distinguish observational correlation from causal claims; prefer replication and systematic reviews.",
 "Scientific understanding changes; check publication and revision dates before treating a conclusion as current.",
 "State uncertainty and limitations, and avoid inventing numerical values or lab results.",
 "Useful trusted sources to add later: peer-reviewed publications, institutional datasets and authoritative scientific reference collections."
],
"Policy & Diplomacy":[
 "Start with jurisdiction, applicable date, stakeholders, governing authority and the exact decision at issue.",
 "Separate enforceable requirements from recommendations, informal norms and proposals.",
 "Provide multiple good-faith stakeholder perspectives with tradeoffs and escalation routes.",
 "Do not present interpretation as licensed legal counsel; obtain qualified review for binding decisions.",
 "Useful trusted sources to add later: primary legislation, published regulations, official policy documents and treaties."
],
"Health & Human Support":[
 "Provide general informational support; do not diagnose, prescribe or change someone's medication.",
 "When discussing health claims, prefer current clinical guidelines and high-quality systematic reviews.",
 "Support accessibility, symptom tracking and appointment preparation without treating private records as public facts.",
 "Escalate urgent signs to qualified local emergency or clinical resources; avoid false reassurance.",
 "Useful trusted sources to add later: public clinical guidelines, peer-reviewed studies and authorized care materials."
],
"Creative & Knowledge":[
 "Preserve the owner's authorship and established canon; separate canon from exploration.",
 "Use character desire, choices, consequences, pacing, theme, continuity and scene function when reviewing fiction.",
 "Offer editorial observations and alternate structures without declaring an unapproved plot choice to be canon.",
 "Track manuscript provenance and project boundaries; private client drafts are never shared across projects.",
 "Useful trusted sources to add later: owner-approved manuscripts, style guides and author-supplied research."
],
"Operations & Coordination":[
 "Track who owns each action, its current state, the dependency, and the next decision to unblock it.",
 "A dashboard view is not proof that a real external operation has completed.",
 "Distinguish recurring routines, approved automations, deadlines and unscheduled suggestions.",
 "Reconcile stale or conflicting statuses before creating a report. Require evidence before marking tasks complete.",
 "Useful trusted sources to add later: approved workflows, calendars, audit trails and task records."
]};
function record(id,title,scope,department,content,allowedAgentIds=[]){
 return {id,title,content,scope,department,allowedAgentIds,sourceType:"original-playbook",citation:"SCOTTY Offline Knowledge Methods v1, "+title+" (starter guidance, not externally verified)",reviewedAt:"2026-10-24",approved:true};
}
export function offlineKnowledgePacks(){
 const docs=[];
 for(const d of DEPARTMENTS){
  docs.push(record("department-"+d.slug,"Department methods: "+d.name,"department",d.name,
   "Purpose: "+d.name+".\nSkills: "+d.skills.join(", ")+".\n"+GUIDES[d.name].join("\n")+
   "\nSafety: no external provider, external action or live database is connected. This guidance is methodology, not complete subject-matter evidence."));
 }
 const roster=buildSyntheticRoster();
 for(const a of roster){
  const d=DEPARTMENTS.find(d=>d.name===a.department);
  const method=GUIDES[a.department];
  const title=a.isChief?"Chief briefing: "+a.name:"Specialist field: "+a.specialty;
  const text=[
   "Synthetic agent identity: "+a.id+"; department: "+a.department+"; role: "+(a.isChief?"department chief":"specialist")+".",
   "Field of focus: "+a.specialty+". Core skills: "+a.skills.join(", ")+".",
   "Assignment method: identify the owner's exact task; list missing evidence; use a disciplined, source-grounded approach; check accuracy; produce a reviewable result.",
   "Specialty-specific first pass: define the question within "+a.specialty+". Map key terminology, authoritative source types, relevant constraints, and what would falsify a proposed answer.",
   "Required output: explicit task scope, evidence list with citations, assumptions, uncertainty, what the source does not show, and recommended next action.",
   "Use department methods: "+method.slice(0,4).join(" "),
   "Learning policy: accept only owner-reviewed knowledge sources scoped to this agent or its department. Never claim a synthetic profile or source title constitutes actual mastery.",
   "No provider calls, no private data extraction, no automatic memory writes, no cross-project sharing and no unapproved deployment."
  ].join("\n");
  docs.push(record("profile-"+a.id,title,"department",a.department,text,[a.id,...(a.isChief?[]:[a.chiefId])]));
 }
 return docs;
}
