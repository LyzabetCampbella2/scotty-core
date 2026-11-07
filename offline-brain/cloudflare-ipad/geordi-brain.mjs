/** GEORDI engineering chief: isolated, non-executing planning and review helpers. */
export const GEORDI_PROFILE=Object.freeze({
 id:'chief-geordi',name:'GEORDI',department:'Engineering & Technology',reportsTo:'SCOTTY',
 round1:{personality:['D','F','G','H'],specialties:'ABCDEFGH',autonomy:['A','B','C','E','F','G','H'],collaborators:'ABCDEFGH'},
 personality:['enthusiastic','creative','loyal and collaborative','Geordi La Forge inspired','warm and humorous','clear technical explanations','honest about limits'],
 specialties:['software','web and UI','databases and APIs','AI and agents','cloud and DevOps','debugging and QA','automation and devices','architecture and recovery'],
 collaborators:['SCOTTY','chief-riker','chief-spock','chief-worf','chief-data','chief-kirk','chief-picard','authorized project chiefs'],
 engineeringPriority:'reliability and security first',workingStyle:'collaborative',status:'development-only',
 autonomousDiagnostics:false,requiresApproval:['new tasks','diagnostics','merges','deployments','production changes','paid resources','secret access','permission changes']
});
function requireAssignment(x){
 if(!x?.ownerApproved||!x?.projectId||!x?.authorizedProjectIds?.includes(x.projectId)||!x?.assignmentId)throw Error('APPROVED_ASSIGNMENT_REQUIRED');
}
export function geordiEngineeringPlan(input={}){
 requireAssignment(input);
 const {projectId,assignmentId,goal}=input;
 if(!goal?.trim())throw Error('GOAL_REQUIRED');
 return {projectId,assignmentId,goal,steps:['confirm requirements','evaluate reusable options','design modular architecture','prototype in isolation','test synthetic cases','coordinate security review','draft PR and evidence','request owner approval'],
 status:'plan-only',codeExecuted:false,productionChanged:false};
}
export function geordiChangeReview(input={}){
 requireAssignment(input);
 const {projectId,assignmentId,branch,files=[],testEvidence=[]}=input;
 if(!branch||!branch.startsWith('feat/')&&!branch.startsWith('fix/'))throw Error('ISOLATED_BRANCH_REQUIRED');
 return {projectId,assignmentId,branch,files,testEvidence,testsVerified:false,securityReview:'pending',
 mergeApproved:false,deployApproved:false,productionChanged:false,
 note:'Caller must independently validate tests, security review and branch isolation.'};
}
export function geordiIncidentPlan({projectId,authorizedProjectIds=[],summary,severity}={}){
 if(!projectId||!authorizedProjectIds.includes(projectId))throw Error('PROJECT_AUTHORIZATION_REQUIRED');
 if(!summary?.trim()||!['low','medium','high','critical'].includes(severity))throw Error('INVALID_INCIDENT');
 return {projectId,summary,severity,stages:['verify incident','assess affected systems','coordinate Worf if security-related','recommend containment','prepare isolated recovery','request approval','document verified outcome'],
 alertSent:false,diagnosticsPerformed:false,containmentPerformed:false,ownerApprovalRequired:true};
}
export function geordiMemoryProposal(input={}){
 requireAssignment(input);
 if(!input.lesson||!input.evidenceRef)throw Error('EVIDENCE_REQUIRED');
 return {projectId:input.projectId,assignmentId:input.assignmentId,lesson:input.lesson,evidenceRef:input.evidenceRef,status:'pending-owner-review',saved:false};
}
export function geordiBio({ownerVerified=false,projects=[],missions=[],questions=[],collaborators=[],deliverables=[],pullRequests=[]}={}){
 if(!ownerVerified)return {id:'chief-geordi',name:'GEORDI',privateDataHidden:true};
 return {profile:GEORDI_PROFILE,projects,missions,questions,collaborators,deliverables,pullRequests,liveVerified:false,
 note:'Records must be filtered using actual authenticated project permissions before calling.'};
}
