import {departmentMethod,DEPARTMENT_PATTERNS} from './department-methods.mjs';
/** Per-agent original working playbooks. No scraped, private or independently verified facts. */
export const PLAYBOOK_VERSION='specialist-playbooks-v3';
const references={
 'Security & Defense':['NIST','https://www.nist.gov/cyberframework'],
 'Research & Intelligence':['Crossref','https://www.crossref.org/documentation/'],
 'Health & Human Support':['MedlinePlus','https://medlineplus.gov/'],
 'Software & Applications':['MDN','https://developer.mozilla.org/'],
 'Engineering & Systems':['MDN','https://developer.mozilla.org/'],
 'Data & Analytics':['NIST Statistics','https://www.itl.nist.gov/div898/handbook/'],
 'Accessibility & Wellbeing':['W3C WCAG','https://www.w3.org/WAI/WCAG22/quickref/'],
 'Education & Learning':['US Education','https://www.ed.gov/'],
 'Science & Environment':['NASA Science','https://science.nasa.gov/'],
 'Exploration & Discovery':['NASA Science','https://science.nasa.gov/'],
 'History & Culture':['Library of Congress','https://www.loc.gov/'],
 'Creative & Knowledge':['Library of Congress','https://www.loc.gov/'],
 'Business & Enterprise':['SBA','https://www.sba.gov/business-guide'],
 'Automation & Reliability':['MDN','https://developer.mozilla.org/'],
 'Quality & Verification':['NIST','https://www.nist.gov/'],
 'Design & Media':['W3C','https://www.w3.org/WAI/'],
 'Commerce & Finance':['SEC','https://www.investor.gov/'],
 'Policy & Diplomacy':['Congress.gov','https://www.congress.gov/'],
 'Life Sciences':['NLM','https://www.nlm.nih.gov/']
};
const focusMethods={
 'astronomy':['Record observation time, coordinates and measurement method','Compare observation with prediction, label uncertainty','Synthetic example: two dated sky readings differ','Never invent current sky coordinates'],
 'geography':['Establish location, map scale and projection','Compare routes with dated map evidence','Synthetic example: compare two routes with a blocked crossing','Never invent live roads, closures or travel times'],
 'source discovery':['Record publisher, original article URL and date','Trace headlines to primary source and contradictions','Synthetic example: two headlines cite the same study','A headline is a lead, not a confirmed fact'],
 'fact checking':['Extract discrete claims','Map each claim to dated primary evidence','Synthetic example: label an uncited statistic unverified','Unverified is not equivalent to false'],
 'test design':['Write independent expected outcomes','Test normal, invalid, boundary and unauthorized cases','Synthetic example: test lengths 499, 500 and 501','A passing mock is not a live acceptance result'],
 'evidence review':['Verify source provenance and scope','Create a claim-to-reference table','Synthetic example: reject a note from another project','Never cite a document the agent cannot access'],
 'curriculum':['Set measurable objectives','Align worked examples, practice and assessments','Synthetic example: teach and assess fraction addition','Do not claim accreditation'],
 'tutoring':['Diagnose one misconception at a time','Scaffold practice with feedback','Synthetic example: explain an incorrect denominator','One exercise does not prove mastery'],
 'frontend engineering':['Check semantic markup and responsive constraints','Test on target devices and keyboard','Synthetic example: traverse all controls by keyboard','Code review alone cannot prove iPad performance'],
 'backend engineering':['Check input validation, authorization and idempotency','Verify writes through independent readback','Synthetic example: retry same mission identifier','Do not claim production persistence without evidence'],
 'application testing':['Capture build, environment and expectation','Record observed results and regression coverage','Synthetic example: reject consent during playback','Synthetic success never certifies a live deployment'],
 'statistics':['Define denominator, sample and units','Compare meaningful summaries and limitations','Synthetic example: mean and median differ due to outlier','Correlation cannot alone establish causation'],
 'data cleaning':['Document reversible transformations','Measure nulls and duplicate rows','Synthetic example: consolidate duplicate synthetic IDs','Do not silently remove evidence'],
 'video editing':['Define target format, motion timing and accessibility','Review opening, cut points and export','Synthetic example: create a two-layer slide sequence','A description is not a rendered final video'],
 'visual design':['Identify hierarchy, contrast and reading order','Test large and small screen variants','Synthetic example: improve a cluttered status panel','Visual appeal alone is not accessibility']
};
export function specialistPlaybook(agent){
 if(!agent||typeof agent.id!=='string'||!agent.id||typeof agent.department!=='string')throw Error('INVALID_SPECIALIST');
 const focus=String(agent.specialty||agent.department).slice(0,120);
 const exact=focusMethods[focus.toLowerCase()];
 const method=exact||departmentMethod(agent.department,focus);
 const source=references[agent.department];
 return {id:'playbook-'+agent.id,agentId:agent.id,version:PLAYBOOK_VERSION,
  reviewed:false,ownerReviewedAt:null,knowledgeStatus:'authored-methodology-pending-review',
  focus,department:agent.department,methodCoverage:exact?'specialty-specific':'department-specific',
  departmentPatternCount:Object.keys(DEPARTMENT_PATTERNS).length,foundation:'The task, its evidence and the acceptance criteria are separate. A profile is not a credential.',
  procedure:[method[0]+' (specialist focus: '+focus+')',method[1],'Map every material factual claim to permitted dated evidence','Record uncertainty and submit a concrete deliverable to the department chief'],
  workedExample:method[2],
  boundaries:[method[3],'No cross-agent or cross-project data access','Escalate safety-critical or professional decisions to appropriate qualified review'],
  candidateReferences:source?[{publisher:source[0],url:source[1],verified:false,checkedAt:null,purpose:'External reading candidate, not evidence currently used'}]:[],
  evaluation:{verifyRequestedDeliverable:true,verifySources:true,verifyScope:true,reviewer:'department chief',automatedFactualVerification:false}};
}
export function buildSpecialistGuides(roster){
 const specialists=(roster||[]).filter(a=>a.isChief===false&&a.id!=='scotty');
 if(specialists.length!==160)throw Error('EXPECTED_160_SPECIALISTS');
 const guides=specialists.map(specialistPlaybook);
 if(new Set(guides.map(g=>g.id)).size!==160)throw Error('DUPLICATE_GUIDE_ID');
 return guides;
}
