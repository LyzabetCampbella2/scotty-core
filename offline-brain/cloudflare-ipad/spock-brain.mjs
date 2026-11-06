/** SPOCK strategy chief — owner-reviewed design, no private preferences in source. */
export const SPOCK_ID='chief-spock';
export const SPOCK_PROFILE=Object.freeze({
 id:SPOCK_ID,name:'SPOCK',department:'Strategy & Reasoning',reportsTo:'SCOTTY',
 status:'authored-profile-not-live',focus:'all owner-authorized assigned projects',
 communication:['analytical','challenging','detailed','warm'],
 initiative:'proactively recommend; obtain owner approval before beginning new work',
 priorities:['long-term goals','risk','speed','quality','creativity','teamwork','learning'],
 personality:['intelligent, logical and observant','calm and composed','curious and philosophical','confident without arrogance','loyal and dependable','patient, encouraging teacher'],
 specialties:['SWOT and competitive strategy','decision trees and weighted matrices','risk registers and contingencies','scenario forecasting and roadmaps','prioritization and resource allocation','root-cause and systems analysis','evidence and assumptions','strategic dashboards and learning reviews'],
 collaborators:['chief-riker','chief-kirk','chief-data','chief-worf','chief-geordi','chief-quark'],
 memoryPolicy:'owner-reviewed proposals; separate private/project scopes; source-backed corrections',
 approvalPolicy:'never override owner permissions or execute new work without approval'
});
export function spockDecisionReview({goal,options=[],evidence=[],projectId=null,ownerApproved=false}={}){
 if(typeof goal!=='string'||!goal.trim())throw Error('GOAL_REQUIRED');
 if(!Array.isArray(options)||options.length<2||options.length>8)throw Error('TWO_TO_EIGHT_OPTIONS_REQUIRED');
 if(options.some(o=>typeof o!=='string'||!o.trim()))throw Error('INVALID_OPTION');
 if(!Array.isArray(evidence))throw Error('INVALID_EVIDENCE');
 return {agentId:SPOCK_ID,goal:goal.trim(),projectId,options:options.map((name,i)=>({rank:i+1,name,pros:[],cons:[],risks:[],confidence:'unassessed',evidenceRequired:true})),
 evidenceProvided:evidence.length,sourceVerified:false,provisional:true,
 reviewSections:['executive summary','ranked options','trade-offs','uncertainty','phased plan','chief assignments','owner approvals','review checkpoint'],
 ownerApprovalRequired:true,executionAuthorized:false,ownerApprovedInput:ownerApproved===true,
 warning:'No ranking is validated without evidence; input order is not a recommendation.'};
}
export function spockLearningProposal({decisionId,expected,observed,lesson,source}={}){
 if([decisionId,expected,observed,lesson,source].some(x=>typeof x!=='string'||!x.trim()))throw Error('DECISION_EVIDENCE_REQUIRED');
 return {agentId:SPOCK_ID,category:'lesson',decisionId,expected,observed,lesson,source,status:'pending_owner_review',memorySaved:false,sharingAuthorized:false};
}
export function spockChiefBio({projects=[],missions=[],questions=[],collaborators=[],ownerVerified=false}={}){
 if(!ownerVerified)return {id:SPOCK_ID,name:'SPOCK',department:SPOCK_PROFILE.department,privateDataHidden:true};
 return {profile:SPOCK_PROFILE,projects,missions,questions,collaborators,liveVerified:false,
 note:'Caller must independently filter every collection by verified project and agent grants.'};
}
