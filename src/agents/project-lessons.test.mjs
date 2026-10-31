import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonCandidatesFromCorrections} from './project-lessons.mjs';
test('owner correction creates a draft lesson with no automatic memory write',()=>{
 const candidates=lessonCandidatesFromCorrections('project-bloodpool',[
  {id:'agent-plot',name:'Plot Analyst',work:[{missionId:'mission-1',stepId:'first',deliverable:'Opening scene',
   corrections:[{decision:'revision_requested',note:'Keep the hidden identity secret until chapter five.'}]}]}
 ]);
 assert.equal(candidates.length,1);
 assert.match(candidates[0].proposedLesson,/hidden identity secret/);
 assert.equal(candidates[0].agentId,'agent-plot');
 assert.equal(candidates[0].approved,false);
 assert.equal(candidates[0].memoryUpdated,false);
 assert.equal(candidates[0].automaticallyApplied,false);
});
test('only meaningful rejected or revision-requested owner notes become draft candidates',()=>{
 const x=lessonCandidatesFromCorrections('fictional-project',[
  {id:'agent-1',work:[{deliverable:'Scene',corrections:[
   {decision:'approved',note:'Great.'},{decision:'rejected',note:'Too short'},
   {decision:'rejected',note:'Revise this scene using the approved notes.'},
   {decision:'rejected',note:'Revise this scene using the approved notes.'}]}]}
 ]);
 assert.equal(x.length,1);
 assert.equal(x[0].sourceDecision,'rejected');
 assert.equal(x[0].ownerReviewRequired,true);
});
