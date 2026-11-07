import {test} from 'node:test';
import assert from 'node:assert/strict';
import {REMAINING_CHIEF_PROFILES,chiefProfile,chiefTaskProposal,chiefMemoryProposal,chiefBio} from './remaining-chiefs.mjs';
const s={projectId:'synthetic-project',authorizedProjectIds:['synthetic-project']};
test('17 distinct provisional chiefs, all selections preserved',()=>{
 assert.equal(REMAINING_CHIEF_PROFILES.length,17);
 assert.equal(new Set(REMAINING_CHIEF_PROFILES.map(x=>x.id)).size,17);
 for(const c of REMAINING_CHIEF_PROFILES){assert.equal(c.liveEnabled,false);assert.equal(c.permissions,'none');assert.equal(c.rounds.length,3);for(const r of c.rounds){assert.equal(r.selection,'ABCDEFGH');assert.equal(r.questionnaireStatus,'not-authored');}}
});
test('unknown chief fails closed',()=>assert.throws(()=>chiefProfile('chief-unknown')));
test('cross-project assignment blocked',()=>assert.throws(()=>chiefTaskProposal({chiefId:'chief-uhura',projectId:'other',authorizedProjectIds:['synthetic-project'],goal:'synthetic'})));
test('task remains proposed, not started, assigned or linked',()=>{const x=chiefTaskProposal({...s,chiefId:'chief-uhura',goal:'synthetic'});assert.equal(x.started,false);assert.equal(x.assigned,false);assert.equal(x.projectLinked,false);assert.equal(x.ownerApprovalRequired,true);});
test('memory requires evidence and consent for sensitive data',()=>{assert.throws(()=>chiefMemoryProposal({...s,chiefId:'chief-uhura',summary:'synthetic'}));assert.throws(()=>chiefMemoryProposal({...s,chiefId:'chief-uhura',summary:'synthetic',evidenceRefs:['fake'],sensitive:true}));});
test('memory proposals cannot write or share',()=>{const x=chiefMemoryProposal({...s,chiefId:'chief-uhura',summary:'synthetic',evidenceRefs:['fake']});assert.equal(x.saved,false);assert.equal(x.shared,false);});
test('biography hides private data unless owner verified',()=>{const x=chiefBio({chiefId:'chief-uhura',projects:[{secret:'synthetic'}]});assert.equal(x.privateDataHidden,true);assert.equal(x.projects,undefined);});
