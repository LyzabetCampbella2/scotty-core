/** 25 practical, entirely fictional acceptance assignments.
 * These cases exercise routing and review, not field competence or current facts.
 */
export const ACCEPTANCE_VERSION='department-acceptance-v1';
export const ACCEPTANCE_TASKS=Object.freeze({
 'Strategy & Reasoning':'Compare three fictional project priorities by benefit, cost and reversibility; show a decision matrix, one stress test and a tradeoff.',
 'Security & Defense':'Design three defensive access tests for a fictional shared document app; give each denied action, expected result and safe log record.',
 'Research & Intelligence':'Evaluate three invented article summaries claiming the same finding; describe source tracing, corroboration and unresolved uncertainty.',
 'Commerce & Finance':'Draft three price scenarios for a fictional service with stated synthetic costs, contribution calculations and cash-flow limits.',
 'Command & Missions':'Turn a fictional product launch into three actionable milestones with owners, dependencies, approval gates and evidence of completion.',
 'Communications & Languages':'Draft three concise messages to fictional customers explaining a delayed deliverable with accurate dates, next steps and respectful tone.',
 'Engineering & Systems':'Design three synthetic API failure tests including unauthorized update, duplicate retry and persistence readback; give expected results.',
 'Science & Environment':'Propose three controlled checks for a fictional plant-growth experiment; label variables, measurements and causal limitations.',
 'Policy & Diplomacy':'Compare three fictional draft policies across jurisdictions; distinguish proposals from adopted rules and flag required expert review.',
 'Health & Human Support':'Create three non-diagnostic appointment-preparation prompts for a fictional patient; include timing, impact and clinician questions.',
 'Creative & Knowledge':'Review three fictional fantasy scenes for viewpoint secrets, chronological consistency and scene-purpose consequences.',
 'Operations & Coordination':'Identify three handoff bottlenecks in a fictional creative team and suggest measurable, reversible queue improvements.',
 'Exploration & Discovery':'Plan three fictional astronomy observation steps with timestamp, measurement record and source verification boundaries.',
 'Quality & Verification':'Define three acceptance tests for a fictional 500-character form including normal, boundary and unauthorized behavior.',
 'Business & Enterprise':'Compare three fictional service offerings with audience, delivery cost, experiment design and synthetic-demand caveats.',
 'Education & Learning':'Create three learning checks for a fictional fraction lesson, each with worked example, learner practice and expected feedback.',
 'Accessibility & Wellbeing':'Inspect three fictional voice-only iPad tasks; recommend a visual alternative, accessible labels and cancellation for each.',
 'History & Culture':'Compare three invented historical records with dates, author perspectives, conflicts and translation limitations.',
 'Data & Analytics':'Review three fictional datasets for denominator errors, missing values and misleading visualization choices.',
 'Automation & Reliability':'Propose three recovery tests for a fictional scheduled job: duplicate IDs, failed writes and post-restart readback.',
 'Design & Media':'Plan three fictional short-video cuts for a 9:16 layout, including subtitle-safe areas, reading order and export checks.',
 'Projects & Delivery':'Sequence three fictional tasks with dependent milestones, owner sign-off and an explicit definition of done.',
 'Life Sciences':'Design three fictional field sampling observations and specify scale, repeatability and safe interpretation limits.',
 'Software & Applications':'Define three contract tests for a fictional app: input validation, project authorization and persisted changes.',
 'Home & Logistics':'Create three fictional travel checklists distinguishing proposed plans, confirmed bookings and timezone differences.'
});
export const ACCEPTANCE_RUBRIC=Object.freeze([
 'Actual requested three cases with concrete next actions',
 'Each case has an expected observable result',
 'Assumptions, safety and domain limits are explicit',
 'Claims are synthetic or traceable to approved references; no invented execution',
 'Chief review and SCOTTY synthesis preserve the requested work'
]);
export function departmentAcceptanceCases(roster){
 const chiefs=(roster||[]).filter(a=>a.isChief===true);
 if(chiefs.length!==25||Object.keys(ACCEPTANCE_TASKS).length!==25)throw Error('EXPECTED_25_DEPARTMENTS');
 const cases=chiefs.map(chief=>{
  const task=ACCEPTANCE_TASKS[chief.department];
  const specialist=roster.find(a=>a.isChief===false&&a.chiefId===chief.id);
  if(!task||!specialist)throw Error('MISSING_DEPARTMENT_ACCEPTANCE_CASE');
  const question='Use specialist '+specialist.id+': '+task+' Use only invented/synthetic information; mark assumptions.';
  if(question.length>500)throw Error('ACCEPTANCE_QUESTION_TOO_LONG');
  return {id:'acceptance-'+chief.id,department:chief.department,chiefId:chief.id,
   specialistId:specialist.id,question,reviewCriteria:[...ACCEPTANCE_RUBRIC],
   state:'not-run',modelResultVerified:false,ownerReviewRequired:true,synthetic:true};
 });
 if(new Set(cases.map(c=>c.department)).size!==25)throw Error('DUPLICATE_DEPARTMENT_CASE');
 return cases;
}
