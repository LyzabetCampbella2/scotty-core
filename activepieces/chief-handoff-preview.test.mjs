import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code} from './steps/chief-handoff-preview.mjs';
const directory=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
const row=cells=>({cells:Object.fromEntries(Object.entries(cells).map(([k,v],i)=>[String(i),{fieldName:k,value:v}]))});
const projects=[row({'Project ID':'eirden-atelier','Project':'Eirden Atelier','Owner Review':'Not reviewed',
'Candidate Departments':'Engineering & Systems; Security & Defense; Quality & Verification'})];
const relationships=[
 row({'Project ID':'eirden-atelier','Candidate Agent ID':'agent-geordi-04','Reporting Chief ID':'chief-geordi','Department':'Engineering & Systems','Assignment Status':'Suggestion only — not assigned'}),
 row({'Project ID':'eirden-atelier','Candidate Agent ID':'agent-worf-01','Reporting Chief ID':'chief-worf','Department':'Security & Defense','Assignment Status':'Suggestion only — not assigned'}),
 row({'Project ID':'eirden-atelier','Candidate Agent ID':'agent-expansion-015','Reporting Chief ID':'chief-expansion-tuvok','Department':'Quality & Verification','Assignment Status':'Suggestion only — not assigned'})
];
const args={directory,projectRows:projects,collaboratorRows:relationships,projectId:'eirden-atelier',leadDepartment:'Engineering & Systems'};
test('creates dependency-checked specialist, cross-chief and SCOTTY preview with no sends',async()=>{
 const p=await code(args);
 assert.equal(p.status,'PENDING_OWNER_REVIEW');
 assert.equal(p.leadChiefName,'GEORDI');
 assert.equal(p.proposedSpecialists,3);
 assert.equal(p.handoffCount,6);
 assert.equal(p.handoffs.filter(x=>x.kind==='SPECIALIST_TO_CHIEF_REVIEW').length,3);
 assert.equal(p.handoffs.filter(x=>x.kind==='CROSS_CHIEF_REVIEW_HANDOFF').length,2);
 const final=p.handoffs.at(-1);assert.equal(final.kind,'CENTRAL_SYNTHESIS_PROPOSAL');
 assert.equal(final.toId,'scotty');assert.equal(final.dependsOn.length,3);
 assert.ok(p.handoffs.every(x=>x.status==='PROPOSED_NOT_SENT'));
 assert.equal(p.readyToSend,false);assert.equal(p.backendAuthorized,false);
 assert.equal(p.projectMembershipVerified,false);assert.equal(p.messagesSent,0);
 assert.equal(p.assignmentsCreated,0);assert.equal(p.missionsStarted,0);
 assert.equal(p.aiCalls,0);assert.equal(p.memoryWrites,0);
});
test('owner-blocked project is excluded entirely',async()=>{
 const blocked=structuredClone(projects);
 Object.values(blocked[0].cells).find(x=>x.fieldName==='Owner Review').value='Do not use';
 const out=await code({...args,projectRows:blocked});
 assert.equal(out.status,'BLOCKED_BY_OWNER_PROJECT_FLAG');
 assert.equal(out.handoffs.length,0);assert.equal(out.messagesSent,0);
});
test('wrong chief, invalid candidate state and duplicated department are rejected',async()=>{
 const forged=structuredClone(relationships);
 Object.values(forged[0].cells).find(x=>x.fieldName==='Reporting Chief ID').value='chief-worf';
 await assert.rejects(()=>code({...args,collaboratorRows:forged}),/UNVERIFIED_OR_DUPLICATE/);
 const changed=structuredClone(relationships);
 Object.values(changed[1].cells).find(x=>x.fieldName==='Assignment Status').value='Assigned';
 await assert.rejects(()=>code({...args,collaboratorRows:changed}));
 await assert.rejects(()=>code({...args,collaboratorRows:[...relationships,relationships[0]]}));
 await assert.rejects(()=>code({...args,leadDepartment:'No such department'}));
});
test('claimed live roster and missing public sources fail closed',async()=>{
 await assert.rejects(()=>code({...args,directory:{...directory,live_roster_verified:true}}));
 const noProject=await code({...args,projectRows:[]});
 assert.equal(noProject.status,'PROJECT_NOT_IN_PUBLIC_PORTFOLIO');
 assert.deepEqual(noProject.handoffs,[]);
 assert.equal(noProject.messagesSent,0);
 assert.equal(noProject.assignmentsCreated,0);
});
