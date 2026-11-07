/** Remaining SCOTTY chiefs: development-only profile and planning scaffolds.
 * All options A-H are selected by owner globally; questionnaires not authored are not invented.
 */
const definitions=[
 ['UHURA','Communications & Information Coordination',['voice and conversational UX','authorized messaging','translation and accessibility']],
 ['CRUSHER','Health Information & Wellness Coordination',['health information literacy','appointment preparation','wellness planning']],
 ['MCCOY','Health Research & Safety Review',['medical evidence review','health information quality','risk escalation']],
 ['SULU','Navigation & Scheduling',['time planning','travel planning','route and schedule coordination']],
 ['CHEKOV','Logistics & Resource Coordination',['resource inventories','logistics planning','dependencies']],
 ['SCOTTY-ENGINEERING','Infrastructure Reliability',['system diagnostics','infrastructure planning','recovery design']],
 ['SEVEN','Optimization & Systems Analysis',['workflow optimization','system comparisons','efficiency analysis']],
 ['JANEWAY','Exploration & Innovation',['research roadmaps','innovation strategy','contingency planning']],
 ['TUVOK','Compliance & Risk Analysis',['policy checks','risk registers','structured reviews']],
 ['PARIS','Creative Production & Media',['creative production','content planning','media workflows']],
 ['KIM','Documentation & Records',['documentation','records organization','knowledge indexing']],
 ['BASHIR','Science & Evidence Literacy',['scientific literacy','research evaluation','study support']],
 ['DAX','Learning & Knowledge Integration',['learning plans','interdisciplinary synthesis','curriculum support']],
 ['O-BRIEN','Technical Support & Troubleshooting',['troubleshooting plans','service support','maintenance review']],
 ['KIRA','Advocacy & Stakeholder Coordination',['stakeholder communication','negotiation preparation','issue escalation']],
 ['ODO','Quality Assurance & Investigation',['test planning','anomaly triage','evidence tracking']],
 ['QUARK','Commerce & Business Operations',['business modeling','pricing analysis','commercial planning']]
];
export const REMAINING_CHIEF_PROFILES=Object.freeze(definitions.map(([name,department,specialties])=>Object.freeze({
 id:'chief-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
 name,department,specialties:Object.freeze(specialties),
 selectionPolicy:'all-options-A-through-H',
 rounds:Object.freeze([Object.freeze({selection:'ABCDEFGH',questionnaireStatus:'not-authored'}),Object.freeze({selection:'ABCDEFGH',questionnaireStatus:'not-authored'}),Object.freeze({selection:'ABCDEFGH',questionnaireStatus:'not-authored'})]),
 status:'development-scaffold',ownerApprovalRequired:true,
 permissions:'none',liveEnabled:false,
 constraints:Object.freeze(['No new missions without owner approval','No unapproved contact or sharing','No sensitive memory writes','No spending or production changes','No real project access without authentication'])
})));
const byId=new Map(REMAINING_CHIEF_PROFILES.map(p=>[p.id,p]));
export function chiefProfile(id){const p=byId.get(id);if(!p)throw Error('UNKNOWN_CHIEF');return p;}
function authorize({projectId,authorizedProjectIds=[]}={}){if(!projectId||!authorizedProjectIds.includes(projectId))throw Error('PROJECT_AUTHORIZATION_REQUIRED');}
export function chiefTaskProposal({chiefId,projectId,authorizedProjectIds=[],goal,question='',candidateCollaborators=[]}={}){
 const chief=chiefProfile(chiefId);authorize({projectId,authorizedProjectIds});
 if(!goal?.trim())throw Error('GOAL_REQUIRED');
 return {chiefId:chief.id,projectId,goal,question,candidateCollaborators,
 status:'pending-owner-approval',started:false,assigned:false,projectLinked:false,
 collaboratorsVerified:false,ownerApprovalRequired:true};
}
export function chiefMemoryProposal({chiefId,projectId,authorizedProjectIds=[],scope='project',summary,evidenceRefs=[],sensitive=false,consent=false}={}){
 chiefProfile(chiefId);authorize({projectId,authorizedProjectIds});
 if(!['personal','project','department'].includes(scope))throw Error('INVALID_SCOPE');
 if(!summary?.trim()||!evidenceRefs.length)throw Error('EVIDENCE_REQUIRED');
 if(sensitive&&!consent)throw Error('SENSITIVE_CONSENT_REQUIRED');
 return {chiefId,projectId,scope,summary,evidenceRefs,status:'pending-owner-review',saved:false,shared:false};
}
export function chiefBio({chiefId,ownerVerified=false,projects=[],missions=[],questions=[],collaborators=[],approvals=[]}={}){
 const chief=chiefProfile(chiefId);
 if(!ownerVerified)return {id:chief.id,name:chief.name,department:chief.department,privateDataHidden:true};
 return {chief,projects,missions,questions,collaborators,approvals,liveVerified:false,
 warning:'Caller must authenticate and filter records by authorized project; no persistence or integration here.'};
}
