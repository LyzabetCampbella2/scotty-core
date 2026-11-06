/** DATA research chief — isolated policy and research planning only. */
export const DATA_PROFILE=Object.freeze({
 id:'chief-data',name:'DATA',department:'Research & Intelligence',reportsTo:'SCOTTY',
 personality:['intelligent precise analytical','patient teacher','kind respectful supportive','honest about uncertainty','creative open-minded','witty and charming','inspired by Star Trek Data, with distinct identity'],
 researchStandards:'strict',initialFocus:'all authorized assigned projects',
 fields:['AI and computing','business and economics','science and biology','astronomy and anthropology','literature and publishing','education and psychology','law and immigration','history and culture','languages','art','any authorized specialty'],
 collaborators:['chief-spock','chief-worf','chief-riker','chief-kirk','chief-geordi','chief-keiko','chief-zora'],
 permissions:'research within approved missions; ask before new assignments or private/connected access',
 memory:'personal, project and departmental scopes; sensitive personal promotions require owner review',
 status:'development-only'
});
export function dataResearchPlan({question,projectId,authorizedProjectIds=[],sources=[]}={}){
 if(typeof question!=='string'||!question.trim())throw Error('QUESTION_REQUIRED');
 if(!projectId||!authorizedProjectIds.includes(projectId))throw Error('PROJECT_AUTHORIZATION_REQUIRED');
 if(!Array.isArray(sources))throw Error('INVALID_SOURCES');
 return {agentId:'chief-data',question,projectId,sourceCount:sources.length,
 steps:['decompose question','find independent primary sources','check dates and methods','compare competing evidence','identify gaps','draft cited findings','request review'],
 status:'research-not-performed',verified:false,confidence:'unassessed',ownerApprovalForNewWork:true,
 note:'Planning template only; source content has not been fetched or validated.'};
}
export function dataSourceAssessment({title,url,publicationDate,primary=false,independentCorroboration=false,methodReviewed=false}={}){
 if(!title||!url||!/^https?:\/\//.test(url))throw Error('SOURCE_METADATA_REQUIRED');
 return {title,url,publicationDate:publicationDate||null,primary,independentCorroboration,methodReviewed,
 verified:false,credibility:'unassessed',citable:false,
 reviewNeeded:['verify origin and author','check publication date','inspect methods and limitations','independent corroboration'],
 note:'Metadata flags are untrusted assertions, not completed verification.'};
}
export function dataFinding({claim,evidenceRefs=[],classification='hypothesis',projectId,authorizedProjectIds=[]}={}){
 if(!projectId||!authorizedProjectIds.includes(projectId))throw Error('PROJECT_AUTHORIZATION_REQUIRED');
 if(typeof claim!=='string'||!claim.trim())throw Error('CLAIM_REQUIRED');
 if(!['hypothesis','interpretation','unverified','verified'].includes(classification))throw Error('INVALID_CLASSIFICATION');
 return {claim,evidenceRefs,classification:'unverified',requestedClassification:classification,
 verified:false,confidence:'unassessed',requiresIndependentEvidenceReview:true,
 note:'A requested verified label cannot certify evidence without external review.'};
}
export function dataKnowledgeProposal({projectId,authorizedProjectIds=[],findingId,reason,sourceRefs=[]}={}){
 if(!projectId||!authorizedProjectIds.includes(projectId))throw Error('PROJECT_AUTHORIZATION_REQUIRED');
 if(!findingId||!reason||!sourceRefs.length)throw Error('EVIDENCE_REQUIRED');
 return {projectId,findingId,reason,sourceRefs,status:'pending-owner-review',saved:false,shared:false,versionCreated:false};
}
export function dataBio({ownerVerified=false,projects=[],missions=[],questions=[],collaborators=[],findings=[]}={}){
 if(!ownerVerified)return {id:'chief-data',name:'DATA',privateDataHidden:true};
 return {profile:DATA_PROFILE,projects,missions,questions,collaborators,findings,
 liveVerified:false,note:'All supplied records must be filtered using real authenticated server-side grants.'};
}
