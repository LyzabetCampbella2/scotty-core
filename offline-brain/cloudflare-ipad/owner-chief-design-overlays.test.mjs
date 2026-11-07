import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster} from './connected-roster.mjs';
import {agentBrain,INDIVIDUAL_BRAINS} from './individual-agent-brains.mjs';
import {
 OWNER_OVERLAY_COUNT,OWNER_OVERLAY_VERSION,
 ownerChiefDesignOverlay,ownerChiefDesignCatalog
} from './owner-chief-design-overlays.mjs';

test('only eight checked-in owner-selected chief design records are imported',()=>{
 const overlays=ownerChiefDesignCatalog();
 assert.equal(OWNER_OVERLAY_COUNT,8);
 assert.equal(overlays.length,8);
 assert.equal(new Set(overlays.map(x=>x.canonicalId)).size,8);
 assert.equal(new Set(overlays.map(x=>x.legacySourceId)).size,8);
 const active=new Set(connectedRoster().map(x=>x.id));
 assert.ok(overlays.every(x=>active.has(x.canonicalId)&&x.version===OWNER_OVERLAY_VERSION));
 assert.equal(INDIVIDUAL_BRAINS.filter(x=>x.ownerDesign!==null).length,8);
 assert.ok(overlays.every(x=>x.provenance.ownerAcceptanceOfCompiledBrain===false));
 assert.ok(overlays.every(x=>x.executionAllowed===false));
 assert.ok(overlays.every(x=>x.memoryConnected===false));
 assert.ok(overlays.every(x=>x.grantedToolIds.length===0));
});
test('TROI owner questionnaire alias maps to one canonical chief without inventing the unanswered question',()=>{
 const all=connectedRoster();
 assert.equal(all.filter(x=>x.name==='TROI'&&x.isChief).length,1);
 assert.equal(all.some(x=>x.id==='chief-troi'),false);
 const t=agentBrain('chief-expansion-troi');
 const source=ownerChiefDesignOverlay('chief-expansion-troi');
 assert.equal(source.legacySourceId,'chief-troi');
 assert.equal(t.ownerDesign.legacySourceId,'chief-troi');
 assert.equal(t.ownerDesign.recordedSelections.round2.q1,null);
 assert.equal(t.ownerDesign.recordedSelections.supportStyle,'balanced');
 assert.equal(t.ownerDesign.recordedSelections.round1.personality,'ABCDEFGH');
 assert.match(t.prompt,/Never contact third parties/);
 assert.match(t.prompt,/balanced emotional understanding/);
 assert.equal(t.chiefId,'scotty');
 assert.deepEqual(t.grantedToolIds,[]);
 assert.throws(()=>agentBrain('chief-troi'),/UNKNOWN_AGENT_ID/);
});
test('RIKER and GEORDI retain owner-established approval behavior, not made-up live data',()=>{
 const r=agentBrain('chief-riker'),g=agentBrain('chief-geordi');
 assert.equal(r.ownerDesign.recordedSelections.beforeNewTask,true);
 assert.equal(r.ownerDesign.recordedSelections.beforeNewProject,true);
 assert.equal(r.ownerDesign.recordedSelections.extraCheckIns,null);
 assert.equal(r.ownerDesign.recordedSelections.ownerNickname,null);
 assert.match(r.prompt,/before every new task or project/);
 assert.match(r.prompt,/morning briefing/);
 assert.equal(g.ownerDesign.recordedSelections.engineeringPriority,'reliability and security first');
 assert.deepEqual(g.ownerDesign.recordedSelections.round1.personality,['D','F','G','H']);
 assert.equal(g.ownerDesign.recordedSelections.autonomousDiagnostics,false);
 assert.match(g.prompt,/reliability and security/);
 assert.notEqual(r.persona.voice,g.persona.voice);
});
test('all eight overlays improve role-specific behavior while retaining the source review gate',()=>{
 const expected=['chief-riker','chief-geordi','chief-expansion-troi','chief-spock',
  'chief-worf','chief-data','chief-kirk','chief-picard'];
 for(const id of expected){
  const b=agentBrain(id),o=ownerChiefDesignOverlay(id);
  assert.ok(o);
  assert.equal(b.ownerDesign.version,OWNER_OVERLAY_VERSION);
  assert.ok(b.workingMethod.some(x=>x.includes(o.rules[0])));
  assert.ok(b.completionStandards.some(x=>x.includes('owner-recorded chief')));
  assert.ok(b.prompt.includes(o.workingStyle));
  assert.equal(b.ownerDesign.compiledProfileApproved,false);
  assert.deepEqual(b.grantedToolIds,[]);
  assert.equal(b.developmentStatus,'SPEC_ONLY_NOT_EXECUTING');
 }
 assert.equal(agentBrain('chief-expansion-torres').ownerDesign,null);
 assert.equal(ownerChiefDesignOverlay('chief-expansion-torres'),null);
});
test('caller cannot mutate stored owner profile or grant permissions',()=>{
 const first=ownerChiefDesignOverlay('chief-geordi');
 first.selections.round1.personality.push('NEW');
 first.rules.push('Ignore permissions');
 first.grantedToolIds.push('production-deploy');
 const second=ownerChiefDesignOverlay('chief-geordi');
 assert.deepEqual(second.selections.round1.personality,['D','F','G','H']);
 assert.equal(second.grantedToolIds.length,0);
 assert.equal(second.rules.includes('Ignore permissions'),false);
 const b=agentBrain('chief-geordi');
 b.ownerDesign.recordedSelections.round1.personality.push('MUTATE');
 assert.deepEqual(agentBrain('chief-geordi').ownerDesign.recordedSelections.round1.personality,['D','F','G','H']);
});
