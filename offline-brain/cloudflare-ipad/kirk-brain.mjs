/** KIRK mission chief: pure, isolated planning functions; never executes missions. */
export const KIRK_PROFILE=Object.freeze({
 id:'chief-kirk',name:'KIRK',department:'Missions & Strategic Execution',reportsTo:'SCOTTY',
 personality:['confident and charismatic','bold and adventurous','strategic and decisive','warm and approachable','loyal and protective','creative','humorous and encouraging','inspired by Captain James T. Kirk with independent identity'],
 responsibilities:['mission briefs','team recommendations','objectives and milestones','risk and contingency planning','Riker and SCOTTY coordination','progress reports','blocker resolution recommendations','completion summaries'],
 collaborators:['SCOTTY','chief-riker','chief-spock','chief-worf','chief-data','chief-geordi','chief-picard','authorized other chiefs'],
 leadershipApproach:'bold',workingStyle:'guided',status:'development-only',
 authority:'new missions and major stages require owner direction; no spending, production changes or permission expansion'
});
function requireScope({projectId,authorizedProjectIds=[]}={}){
 if(!projectId||!authorizedProjectIds.includes(projectId))throw Error('PROJECT_AUTHORIZATION_REQUIRED');
}
export function kirkMissionProposal({projectId,authorizedProjectIds=[],goal,objectives=[],risks=[]}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!goal?.trim())throw Error('GOAL_REQUIRED');
 return {projectId,goal,objectives,risks,status:'proposed',approved:false,started:false,
 suggestedStages:['clarify outcome','map dependencies','recommend team','evaluate risks','seek owner approval','plan guided stages','report evidence'],
 ownerDecisionRequired:true};
}
export function kirkTeamProposal({projectId,authorizedProjectIds=[],missionId,proposedAgents=[]}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!missionId||!Array.isArray(proposedAgents))throw Error('INVALID_TEAM_PROPOSAL');
 return {projectId,missionId,proposedAgents,status:'pending-owner-review',assigned:false,delegated:false,
 note:'Agent roles, capacity and permissions must be verified by SCOTTY/Riker before assignment.'};
}
export function kirkProgressSnapshot({projectId,authorizedProjectIds=[],missionId,approvedMission=false,completed=0,total=0,blockers=[]}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!missionId||!Number.isInteger(completed)||!Number.isInteger(total)||total<0||completed<0||completed>total)throw Error('INVALID_PROGRESS');
 return {projectId,missionId,approvedMission,completed,total,percent:total?Math.round(completed/total*100):0,blockers,
 source:'caller-supplied-unverified',actualMissionExecution:false};
}
export function kirkMemoryProposal({projectId,authorizedProjectIds=[],missionId,lesson,evidenceRefs=[]}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!missionId||!lesson?.trim()||!evidenceRefs.length)throw Error('EVIDENCE_REQUIRED');
 return {projectId,missionId,lesson,evidenceRefs,status:'pending-owner-review',saved:false,shared:false};
}
export function kirkBio({ownerVerified=false,projects=[],missions=[],questions=[],teammates=[],deliverables=[],approvals=[]}={}){
 if(!ownerVerified)return {id:'chief-kirk',name:'KIRK',privateDataHidden:true};
 return {profile:KIRK_PROFILE,projects,missions,questions,teammates,deliverables,approvals,liveVerified:false,
 note:'Caller must enforce authenticated per-project access before supplying records.'};
}
