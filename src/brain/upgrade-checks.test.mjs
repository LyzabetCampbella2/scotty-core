import test from 'node:test';
import assert from 'node:assert/strict';
import {rankNotes,reviewDeliverable,sourceCandidate,permissionsForProject,operatingSummary} from './upgrade-checks.mjs';

test('older relevant individual note beats newest irrelevant shared note and explains selection',()=>{
 const now=new Date('2026-10-29T19:00:00Z');
 const notes=[
  {id:'new',scope:'shared',agentId:'shared',title:'Travel',content:'luggage',reviewedAt:'2026-10-28T19:00:00Z'},
  {id:'old',scope:'agent',agentId:'specialist-1',title:'Solar panel failure analysis',content:'thermal cycling can cause solder fatigue',reviewedAt:'2026-06-01T19:00:00Z'},
  {id:'private',scope:'agent',agentId:'specialist-2',title:'Solar panel',content:'should never leak',reviewedAt:'2026-10-29T18:00:00Z'},
  {id:'otherdept',scope:'department',agentId:'chief-2',title:'Solar panel',content:'not my team',reviewedAt:'2026-10-29T18:00:00Z'},
  {id:'expired',scope:'shared',agentId:'shared',title:'Solar panel',content:'expired',expiresAt:'2026-10-01T00:00:00Z',reviewedAt:'2026-09-01T00:00:00Z'}
 ];
 const ranked=rankNotes('Solar panel thermal failure',notes,{agentId:'specialist-1',chiefId:'chief-1',now});
 assert.equal(ranked[0].id,'old');
 assert.deepEqual(ranked.map(x=>x.id).sort(),['new','old']);
 assert.match(ranked[0].retrieval.reason,/Keyword overlap/);
});
test('chief review flags incomplete and invented execution without treating answer as verified',()=>{
 const r=reviewDeliverable({question:'List 3 test cases',answer:'I deployed the fix.',results:[{role:'specialist',status:'completed'}]});
 assert.equal(r.verdict,'needs-human-review');
 assert.ok(r.flags.some(x=>/tool evidence/.test(x)));
 assert.ok(r.flags.some(x=>/chief/.test(x)));
 const p=reviewDeliverable({question:'Explain the process',answer:'First inspect the project artifacts, then validate input and record test results in a draft. This is a proposed procedure.',results:[{role:'department chief',status:'completed'}]});
 assert.equal(p.verdict,'provisional-pass');
 assert.equal(p.dimensions.accuracy,'Requires source checking');
});
test('source discovery never becomes automatic promotion and rejects unsafe urls',()=>{
 const candidate=sourceCandidate({publisher:'Public research feed'},{title:'A new study',url:'https://example.org/study',pubDate:'2026-10-28T00:00:00Z'},new Date('2026-10-29T00:00:00Z'));
 assert.equal(candidate.publishedAt,'2026-10-28T00:00:00.000Z');
 assert.equal(candidate.verified,false);assert.equal(candidate.promoted,false);
 assert.equal(sourceCandidate({}, {title:'bad',url:'http://example.org'}),null);
});
test('project documents require active assignment and individual approval',()=>{
 const docs=[{id:'a',approved:true},{id:'b',approved:false},{id:'c',approved:true,allowedAgentIds:['other']},{id:'d',approved:true,status:'revoked'}];
 assert.deepEqual(permissionsForProject({agentId:'yes',assignedAgentIds:['yes'],documents:docs}).documents.map(d=>d.id),['a']);
 assert.equal(permissionsForProject({agentId:'no',assignedAgentIds:['yes'],documents:docs}).allowed,false);
});
test('operations never fabricates quota numbers and never replays uncertain missions',()=>{
 const x=operatingSummary({missions:[{status:'completed'},{status:'incomplete'}],status:{release:'test-release'}});
 assert.equal(x.quota,null);assert.equal(x.quotaReported,false);assert.equal(x.missions.unfinished,1);
 assert.match(x.recovery,/Never automatically replay/);
});
