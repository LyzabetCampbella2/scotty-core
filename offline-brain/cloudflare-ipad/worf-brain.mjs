/** WORF: isolated privacy/security chief design. No production connections. */
export const WORF_PROFILE=Object.freeze({
 id:'chief-worf',name:'WORF',department:'Security & Defense',reportsTo:'SCOTTY',
 personality:['disciplined and professional','loyal and protective','calm under pressure','direct and confident','patient and supportive','strategic and analytical','warm with occasional dry humor','Star Trek Worf inspired'],
 ownerAuthority:'Owner has final say; protect privacy without controlling owner decisions',
 protectionStyle:'strict',privacyDefault:'private',status:'development-only',
 responsibilities:['authentication','personal memory and databases','project isolation','encryption and recovery','threat assessment','release security','connected apps','privacy policy'],
 collaborators:['chief-spock','chief-riker','chief-kirk','chief-data','chief-geordi','chief-picard','SCOTTY'],
 noSecretsInReports:true,maySelfGrantAccess:false,productionChangesRequireOwnerApproval:true,
 memoryPromotionRequiresOwnerApproval:true
});
const SENSITIVE=new Set(['credentials','identity','financial','private-conversation','business-client','personal']);
export function worfAccessDecision({ownerVerified=false,requesterVerified=false,requesterId,projectId,authorizedProjects=[],purpose,category,ownerApproved=false,existingGrant=false}={}){
 const reasons=[];
 if(!ownerVerified)reasons.push('OWNER_AUTH_NOT_VERIFIED');
 if(!requesterVerified||!requesterId)reasons.push('REQUESTER_NOT_VERIFIED');
 if(!projectId||!authorizedProjects.includes(projectId))reasons.push('PROJECT_NOT_AUTHORIZED');
 if(typeof purpose!=='string'||!purpose.trim())reasons.push('PURPOSE_REQUIRED');
 if(!category)reasons.push('CATEGORY_REQUIRED');
 if(!existingGrant)reasons.push('EXISTING_GRANT_REQUIRED');
 if(SENSITIVE.has(category)&&!ownerApproved)reasons.push('SENSITIVE_APPROVAL_REQUIRED');
 return {allowed:reasons.length===0,reasons,scope:reasons.length===0?{projectId,category,purpose}:null,requiresAudit:true,
 note:'Pure policy preview; caller must enforce server-side grants and redact audit contents.'};
}
export function worfIncidentReview({severity,summary,affectedSystems=[],evidenceRefs=[]}={}){
 if(!['low','medium','high','critical'].includes(severity))throw Error('INVALID_SEVERITY');
 if(typeof summary!=='string'||!summary.trim())throw Error('SUMMARY_REQUIRED');
 return {agentId:'chief-worf',severity,summary,affectedSystems,evidenceRefs,
 stages:['verify and classify','identify scope','recommend containment','coordinate authorized response','plan recovery','owner approval','review lessons'],
 escalationRecommended:severity==='high'||severity==='critical',automaticContainment:false,
 ownerApprovalRequired:true,productionChanged:false,alertSent:false};
}
export function worfSecurityReview({projectId,checks=[]}={}){
 if(!projectId)throw Error('PROJECT_REQUIRED');
 return {projectId,checks,domains:['authentication','permissions','storage','dependencies','integrations','backups','release readiness'],
 status:'pending-evidence',releaseApproved:false,productionChanged:false,requiresOwnerDecision:true};
}
export function worfMemoryProposal({category,lesson,source,projectId=null}={}){
 if(!category||!lesson||!source)throw Error('INCOMPLETE_PROPOSAL');
 return {category,lesson,source,projectId,status:'pending-owner-review',saved:false,shared:false};
}
export function worfBio({ownerVerified=false,projects=[],missions=[],questions=[],collaborators=[],findings=[],permissions=[]}={}){
 if(!ownerVerified)return {id:'chief-worf',name:'WORF',privateDataHidden:true};
 return {profile:WORF_PROFILE,projects,missions,questions,collaborators,findings,permissions,
 source:'caller-supplied verified records only',liveVerified:false,
 warning:'Caller must filter each collection by real server-side owner/project permissions.'};
}
