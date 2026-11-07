import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code} from './steps/public-agent-bio-projects.mjs';
const directory=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
const row=cells=>({cells:Object.fromEntries(Object.entries(cells).map(([k,v],i)=>[String(i),{fieldName:k,value:v}]))});
const projects=[
 row({'Project ID':'eirden-atelier','Project':'Eirden Atelier','Owner Review':'Not reviewed'}),
 row({'Project ID':'bloodpool-trilogy','Project':'Bloodpool Trilogy','Owner Review':'Do not use'})
];
const links=[
 row({'Project ID':'eirden-atelier','Candidate Agent ID':'agent-geordi-04','Reporting Chief ID':'chief-geordi','Assignment Status':'Suggestion only — not assigned'}),
 row({'Project ID':'eirden-atelier','Candidate Agent ID':'agent-worf-01','Reporting Chief ID':'chief-worf','Assignment Status':'Suggestion only — not assigned'}),
 row({'Project ID':'bloodpool-trilogy','Candidate Agent ID':'agent-geordi-04','Reporting Chief ID':'chief-geordi','Assignment Status':'Suggestion only — not assigned'})
];
test('specialist bio lists proposed projects and coworkers but no real assignments',async()=>{
 const r=await code({directory,projectRows:projects,collaboratorRows:links,agentId:'agent-geordi-04'});
 assert.equal(r.status,'PUBLIC_BIO_PROPOSAL_ONLY');
 assert.equal(r.agent.name,'Delta');assert.equal(r.agent.reportingChief.name,'GEORDI');
 assert.equal(r.projectProposals.length,1);
 assert.equal(r.projectProposals[0].projectId,'eirden-atelier');
 assert.equal(r.candidateCollaborators.length,1);
 assert.equal(r.candidateCollaborators[0].agentName,'Circuit');
 assert.equal(r.candidateCollaborators[0].relationship,'SUGGESTED_COPARTICIPANT_ONLY');
 assert.deepEqual(r.projectAssignments,[]);
 assert.deepEqual(r.privateMemory,[]);
 for(const key of ['authorizedProjectAccess','ownerReviewGranted','assignmentVerified','collaborationVerified','liveAgent'])assert.equal(r[key],false);
 assert.equal(r.aiCalls,0);assert.equal(r.memoryReads,0);assert.equal(r.memoryWrites,0);
});
test('chief bio sees supervised proposals, but not a granted project role',async()=>{
 const r=await code({directory,projectRows:projects,collaboratorRows:links,agentId:'chief-geordi'});
 assert.equal(r.agent.role,'chief');assert.equal(r.projectProposals.length,1);
 assert.equal(r.projectProposals[0].proposedRole,'candidate-supervising-chief');
 assert.deepEqual(r.projectAssignments,[]);
});
test('invalid and blocked project/collaborator records are rejected or excluded',async()=>{
 const fake=structuredClone(links);
 Object.values(fake[0].cells).find(x=>x.fieldName==='Reporting Chief ID').value='chief-worf';
 await assert.rejects(()=>code({directory,projectRows:projects,collaboratorRows:fake,agentId:'agent-geordi-04'}),/INVALID_OR_FORGED_COLLABORATOR_PROPOSAL/);
 const wrong=structuredClone(links);
 wrong.push(wrong[0]);
 await assert.rejects(()=>code({directory,projectRows:projects,collaboratorRows:wrong,agentId:'agent-geordi-04'}));
 const r=await code({directory,projectRows:projects,collaboratorRows:links,agentId:'agent-geordi-04'});
 assert.ok(r.projectProposals.every(x=>x.projectId!=='bloodpool-trilogy'));
});
