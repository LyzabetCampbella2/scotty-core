import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code} from './steps/project-team-preview.mjs';
const doc=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
const row=(fields)=>({id:'row',cells:Object.fromEntries(Object.entries(fields).map(([k,v],i)=>[String(i),{fieldName:k,value:v}]))});
const project=row({'Project ID':'eirden-atelier','Project':'Eirden Atelier','Category':'Business application',
 'Public Focus':'manuscript software, client services, commerce, design and QA',
 'Candidate Departments':'Engineering & Systems; Security & Defense; Quality & Verification',
 'Owner Review':'Not reviewed','Assignment State':'Suggestions only'});
test('public-only project planner proposes teams without assignments',async()=>{
 const r=await code({directory:doc,projectRows:[project],projectId:'eirden-atelier'});
 assert.equal(r.status,'PENDING_OWNER_REVIEW');
 assert.equal(r.projectId,'eirden-atelier');
 assert.equal(r.suggestedTeam.length,3);
 assert.ok(r.suggestedTeam.every(x=>x.status==='suggested-not-assigned'));
 assert.equal(r.projectMembershipVerified,false);
 assert.equal(r.assignmentsCreated,0);assert.equal(r.aiCalls,0);assert.equal(r.memoryWrites,0);
});
test('owner Do not use suppresses suggestions',async()=>{
 const blocked=structuredClone(project);
 const cell=Object.values(blocked.cells).find(x=>x.fieldName==='Owner Review');cell.value='Do not use';
 const r=await code({directory:doc,projectRows:[blocked],projectId:'eirden-atelier'});
 assert.equal(r.status,'OWNER_BLOCKED');assert.equal(r.teams.length,0);
});
test('rejects fake live roster',async()=>{
 await assert.rejects(()=>code({directory:{...doc,live_roster_verified:true},projectRows:[project],projectId:'eirden-atelier'}));
});
