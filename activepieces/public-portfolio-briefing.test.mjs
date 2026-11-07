import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code} from './steps/public-portfolio-briefing.mjs';
const directory=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
const row=(cells)=>({id:'r',cells:Object.fromEntries(Object.entries(cells).map(([k,v],i)=>[String(i),{fieldName:k,value:v}]))});
const project=row({'Project ID':'eirden-atelier','Project':'Eirden Atelier','Category':'Application',
  'Candidate Departments':'Engineering & Systems; Security & Defense','Owner Review':'Not reviewed'});
const task=row({'Task ID':'demo-one','Task Description':'Synthetic software testing','Data Class':'Public or synthetic','Review Status':'New'});
const mission=row({'Demo ID':'demo-mission','Execution Allowed':'No','Project Label':'Synthetic', 'Workflow Stage':'Proposal only'});
test('read-only portfolio report with project and task recommendation',async()=>{
 const r=await code({directory,projectRows:[project],taskRows:[task],missionRows:[mission]});
 assert.equal(r.status,'PUBLIC_STAGING_BRIEFING_READY');
 assert.equal(r.projectCount,1);assert.equal(r.publicTasksAwaitingPreview,1);
 assert.equal(r.projects[0].proposedTeam.length,2);
 assert.equal(r.projects[0].proposedTeam[0].status,'PROPOSED_NOT_ASSIGNED');
 assert.equal(r.backendAuthorization,false);assert.equal(r.aiCalls,0);assert.equal(r.externalWrites,0);
 assert.equal(r.agentMemoryReads,0);assert.equal(r.agentMemoryWrites,0);
});
test('owner block suppresses all suggestions and private tasks are excluded',async()=>{
 const r=await code({directory,projectRows:[row({'Project ID':'eirden-atelier','Project':'Eirden','Candidate Departments':'Engineering & Systems','Owner Review':'Do not use'})],
 taskRows:[row({'Task ID':'private-one','Task Description':'secret','Data Class':'Private — blocked','Review Status':'New'})],
 missionRows:[]});
 assert.equal(r.projects[0].proposedTeam.length,0);
 assert.equal(r.publicTasksAwaitingPreview,0);
});
test('source mismatch, duplicate project, or wrong classification fails closed',async()=>{
 await assert.rejects(()=>code({directory:{...directory,live_roster_verified:true},projectRows:[],taskRows:[],missionRows:[]}));
 await assert.rejects(()=>code({directory,projectRows:[project,project],taskRows:[],missionRows:[]}));
});
