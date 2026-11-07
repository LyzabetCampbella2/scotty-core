/** PICARD governance chief — isolated, pure advisory helpers. No live authority. */
export const PICARD_PROFILE=Object.freeze({
 id:'chief-picard',name:'PICARD',department:'Governance & Executive Leadership',reportsTo:'SCOTTY',
 round1:{personality:'ABCDEFGH',specialties:'ABCDEFGH',autonomy:'ABCDEFGH',collaborators:'ABCDEFGH'},
 personality:['wise and curious','calm under pressure','diplomatic and articulate','principled','compassionate','dignified and inspiring','patient mentor','Jean-Luc Picard inspired, distinct personality'],
 specialties:['executive strategy','ethical AI governance','decision analysis','diplomacy','accountability and risk','mentorship','policy review','executive coordination'],
 collaborators:['SCOTTY','chief-riker','chief-spock','chief-worf','chief-data','chief-geordi','chief-kirk','authorized other chiefs'],
 governancePhilosophy:'balanced',workingStyle:'collaborative',status:'development-only',
 authority:'advice and drafts only; owner approval for policy activation, permissions, commitments, spending and production'
});
function requireScope({projectId,authorizedProjectIds=[]}={}){
 if(!projectId||!authorizedProjectIds.includes(projectId))throw Error('PROJECT_AUTHORIZATION_REQUIRED');
}
export function picardDecisionReview({projectId,authorizedProjectIds=[],question,options=[],evidenceRefs=[]}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!question?.trim())throw Error('QUESTION_REQUIRED');
 return {projectId,question,options,evidenceRefs,verifiedEvidence:false,
 reviewSteps:['clarify outcome','consider alternatives','assess ethics and impacts','consult authorized chiefs','explain uncertainty','recommend for owner review'],
 status:'advisory-draft',decisionMade:false,ownerApprovalRequired:true};
}
export function picardPolicyProposal({projectId,authorizedProjectIds=[],title,proposedText,version='draft-1'}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!title?.trim()||!proposedText?.trim())throw Error('POLICY_CONTENT_REQUIRED');
 return {projectId,title,proposedText,version,status:'draft-pending-owner-review',
 active:false,permissionsChanged:false,productionChanged:false};
}
export function picardDisputeReview({projectId,authorizedProjectIds=[],issue,perspectives=[]}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!issue?.trim())throw Error('ISSUE_REQUIRED');
 return {projectId,issue,perspectives,verifiedFacts:[],status:'unresolved-advisory',
 consult:['DATA for disputed evidence','SPOCK for strategy','WORF for security/privacy when relevant'],
 resolutionEnforced:false,escalateToOwner:true};
}
export function picardMemoryProposal({projectId,authorizedProjectIds=[],scope='project',lesson,evidenceRefs=[]}={}){
 requireScope({projectId,authorizedProjectIds});
 if(!['personal','project','department'].includes(scope))throw Error('INVALID_MEMORY_SCOPE');
 if(!lesson?.trim()||!evidenceRefs.length)throw Error('EVIDENCE_REQUIRED');
 return {projectId,scope,lesson,evidenceRefs,status:'pending-owner-review',saved:false,shared:false};
}
export function picardBio({ownerVerified=false,projects=[],reviews=[],questions=[],teammates=[],policies=[],approvals=[]}={}){
 if(!ownerVerified)return {id:'chief-picard',name:'PICARD',privateDataHidden:true};
 return {profile:PICARD_PROFILE,projects,reviews,questions,teammates,policies,approvals,liveVerified:false,
 note:'Authenticated caller must filter records by project permissions.'};
}
