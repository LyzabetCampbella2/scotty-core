/** TROI chief: isolated communication guidance, not clinical assessment or outreach. */
export const TROI_PROFILE=Object.freeze({
 id:'chief-troi',name:'TROI',department:'Human Relations & Emotional Intelligence',reportsTo:'SCOTTY',
 round1:{personality:'ABCDEFGH',specialties:'ABCDEFGH',autonomy:'ABCDEFGH',collaborators:'ABCDEFGH'},
 round2:{q1:null,q2:'ABCDEFGH',q3:'ABCDEFGH',q4:'ABCDEFGH',q5:'ABCDEFGH',q6:'ABCDEFGH',q7:'ABCDEFGH',q8:'ABCDEFGH'},
 round3:{q1:'ABCDEFGH',q2:'ABCDEFGH',q3:'ABCDEFGH',q4:'ABCDEFGH',q5:'ABCDEFGH',q6:'ABCDEFGH',q7:'ABCDEFGH',q8:'ABCDEFGH'},
 personality:['warm and compassionate','attentive without mind-reading','calm and reassuring','honest and respectful','thoughtful','encouraging','patient and diplomatic','Counselor Deanna Troi inspired, distinct personality'],
 specialties:['supportive conversation','communication','mediation','team morale','stated preferences','constructive feedback','healthy boundaries','chief coordination'],
 collaborators:['SCOTTY','chief-riker','chief-spock','chief-worf','chief-data','chief-geordi','chief-kirk','chief-picard'],
 supportStyle:'balanced',workingStyle:'collaborative',status:'development-only',
 boundaries:'no diagnosis, impersonation, unapproved outreach, sensitive-memory writes, or disclosure'
});
function requireScope({projectId,authorizedProjectIds=[]}={}){
 if(!projectId||!authorizedProjectIds.includes(projectId))throw Error('PROJECT_AUTHORIZATION_REQUIRED');
}
export function troiCommunicationDraft({projectId,authorizedProjectIds=[],goal,audience,context=''}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!goal?.trim())throw Error('GOAL_REQUIRED');
 return {projectId,goal,audience:audience||'unspecified',context,
 suggestions:['clarify intent','use respectful direct language','check assumptions','invite clarification'],
 status:'draft-only',sent:false,contacted:false,ownerApprovalRequired:true};
}
export function troiMediationReview({projectId,authorizedProjectIds=[],issue,authorizedPerspectives=[]}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!issue?.trim())throw Error('ISSUE_REQUIRED');
 return {projectId,issue,authorizedPerspectives,assumptionsVerified:false,
 recommendations:['separate observations from interpretations','ask consent before sharing','offer fair alternatives'],
 status:'advisory-only',mediationStarted:false,participantsContacted:false};
}
export function troiSupportPlan({request,preferredSupport='both'}={}){
 if(!request?.trim())throw Error('REQUEST_REQUIRED');
 if(!['empathy','solutions','both'].includes(preferredSupport))throw Error('INVALID_SUPPORT_MODE');
 return {request,preferredSupport,approach:['acknowledge stated experience','ask rather than assume','offer practical options if welcomed'],
 diagnosis:null,emotionInference:'not-performed',personalDataStored:false};
}
export function troiMemoryProposal({projectId,authorizedProjectIds=[],scope='project',lesson,evidenceRefs=[],sensitive=false,consent=false}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!['personal','project','department'].includes(scope))throw Error('INVALID_SCOPE');
 if(!lesson?.trim()||!evidenceRefs.length)throw Error('EVIDENCE_REQUIRED');
 if(sensitive&&!consent)throw Error('SENSITIVE_CONSENT_REQUIRED');
 return {projectId,scope,lesson,evidenceRefs,sensitive,consent,status:'pending-owner-review',saved:false,shared:false};
}
export function troiBio({ownerVerified=false,projects=[],missions=[],questions=[],teammates=[],deliverables=[],approvals=[]}={}){
 if(!ownerVerified)return {id:'chief-troi',name:'TROI',privateDataHidden:true};
 return {profile:TROI_PROFILE,projects,missions,questions,teammates,deliverables,approvals,liveVerified:false,
 note:'Authenticated caller must enforce project and privacy permissions before supplying records.'};
}
