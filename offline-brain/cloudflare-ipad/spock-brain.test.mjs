import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SPOCK_ID,SPOCK_PROFILE,spockDecisionReview,spockLearningProposal,spockChiefBio} from './spock-brain.mjs';
test('identity and user-selected personality',()=>{assert.equal(SPOCK_ID,'chief-spock');assert.equal(SPOCK_PROFILE.communication.length,4);assert.equal(SPOCK_PROFILE.personality.length,6);assert.equal(SPOCK_PROFILE.collaborators.length,6);});
test('decisions are provisional and do not grant execution',()=>{const x=spockDecisionReview({goal:'Choose a route',options:['A','B'],ownerApproved:true});assert.equal(x.executionAuthorized,false);assert.equal(x.provisional,true);assert.equal(x.options[0].confidence,'unassessed');});
test('missing options fail closed',()=>assert.throws(()=>spockDecisionReview({goal:'A',options:['only one']})));
test('learning remains pending owner review',()=>{const x=spockLearningProposal({decisionId:'demo',expected:'a',observed:'b',lesson:'c',source:'synthetic'});assert.equal(x.memorySaved,false);assert.equal(x.status,'pending_owner_review');});
test('unauthorized biography hides private assignments',()=>{const x=spockChiefBio({projects:[{secret:'test'}]});assert.equal(x.privateDataHidden,true);assert.equal(x.projects,undefined);});
