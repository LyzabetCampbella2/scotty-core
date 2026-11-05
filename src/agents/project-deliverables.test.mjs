import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReleasedDeliverable} from './project-deliverables.mjs';
const details=()=>({
 blocker:null,
 plan:{revision:3,spec:{goal:'Write a fictional three-scene outline',steps:[
  {id:'scene-one',agentId:'agent-plot',deliverable:'Scene One',sourceIds:['evidence-1'],evidenceIds:[]},
  {id:'chief-review',agentId:'chief-creative',deliverable:'Final chief review',sourceIds:[],evidenceIds:['evidence-2']}
 ]}},
 mission:{results:[
  {stepId:'scene-one',revision:3,status:'released',text:'Synthetic outline of scene one.'},
  {stepId:'chief-review',revision:3,status:'released',text:'Review: the three constraints are satisfied.'}
 ],review:[
  {stepId:'scene-one',revision:3,decision:'approved',reviewedAt:'2026-10-30T00:00:00Z'},
  {stepId:'chief-review',revision:3,decision:'approved',reviewedAt:'2026-10-30T01:00:00Z'}
 ]}
});
test('exports only owner-released steps with clear provenance and no model calls',()=>{
 const r=buildReleasedDeliverable(details(),{projectId:'project-bloodpool',revision:3});
 assert.equal(r.ownerReleaseVerified,true);
 assert.equal(r.steps.length,2);
 assert.equal(r.modelCalls,0);
 assert.equal(r.providerWrites,0);
 assert.match(r.content,/Scene One/);
 assert.match(r.content,/Final chief review/);
 assert.match(r.content,/evidence-1/);
 assert.match(r.content,/does not independently verify every factual claim/);
 assert.equal(r.filename,'scotty-project-bloodpool-full-mission-r3.md');
});
test('single-step export supports text while omitting unrelated step output',()=>{
 const r=buildReleasedDeliverable(details(),{projectId:'project-bloodpool',revision:3,stepId:'scene-one',format:'txt'});
 assert.match(r.mime,/text\/plain/);
 assert.match(r.content,/Synthetic outline of scene one/);
 assert.ok(!r.content.includes('the three constraints are satisfied'));
 assert.equal(r.steps.length,1);
});
test('rejects unreviewed drafts, revoked access, stale revisions and missing steps',()=>{
 const d=details();d.mission.results[0].status='draft';
 assert.throws(()=>buildReleasedDeliverable(d,{projectId:'project-bloodpool',revision:3}),/NOT_RELEASED/);
 assert.throws(()=>buildReleasedDeliverable(d,{projectId:'project-bloodpool',revision:3,stepId:'scene-one'}),/NOT_RELEASED/);
 assert.doesNotThrow(()=>buildReleasedDeliverable(d,{projectId:'project-bloodpool',revision:3,stepId:'chief-review'}));
 const normal=details();
 assert.throws(()=>buildReleasedDeliverable({...normal,blocker:'Access changed'},{projectId:'project-bloodpool',revision:3}),/ACCESS_OR_SOURCE/);
 assert.throws(()=>buildReleasedDeliverable(normal,{projectId:'project-bloodpool',revision:2}),/REVISION_CHANGED/);
 assert.throws(()=>buildReleasedDeliverable(normal,{projectId:'project-bloodpool',revision:3,stepId:'not-present'}),/STEP_NOT_FOUND/);
 const noReview=details();noReview.mission.review=[];
 assert.throws(()=>buildReleasedDeliverable(noReview,{projectId:'project-bloodpool',revision:3}),/NOT_RELEASED/);
});
