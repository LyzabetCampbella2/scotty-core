import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster} from './connected-roster.mjs';
import {
 CREATIVE_MEDIA_CHIEF,CREATIVE_MEDIA_SPECIALISTS,CREATIVE_MEDIA_PROFILES,
 CREATIVE_MEDIA_COUNTS,creativeMediaBrain,previewCreativeMediaRoster,
 proposeCreativeMediaTeam
} from './creative-media-department.mjs';
test('draft creative department is 1 original chief + 3 distinct specialists',()=>{
 assert.equal(CREATIVE_MEDIA_PROFILES.length,4);
 assert.equal(CREATIVE_MEDIA_COUNTS.proposedChiefs,26);
 assert.equal(CREATIVE_MEDIA_COUNTS.proposedSpecialists,163);
 assert.equal(CREATIVE_MEDIA_COUNTS.proposedTotal,189);
 assert.equal(CREATIVE_MEDIA_CHIEF.id,'chief-lumen');
 assert.deepEqual(CREATIVE_MEDIA_SPECIALISTS.map(a=>a.name),['PULSE','FRAME','IRIS']);
 assert.equal(new Set(CREATIVE_MEDIA_PROFILES.map(a=>a.id)).size,4);
 assert.equal(new Set(CREATIVE_MEDIA_PROFILES.map(a=>a.name)).size,4);
 for(const a of CREATIVE_MEDIA_SPECIALISTS)assert.equal(a.chiefId,'chief-lumen');
});
test('each agent brain is role-specific and has isolated unconnected memory and zero tool permissions',()=>{
 const out=CREATIVE_MEDIA_PROFILES.map(a=>creativeMediaBrain(a.id));
 assert.equal(new Set(out.map(b=>b.specialty)).size,4);
 assert.equal(new Set(out.map(b=>b.instructions)).size,4);
 assert.equal(new Set(out.map(b=>b.memory.privateNamespace)).size,4);
 assert.ok(out.every(x=>x.memory.persisted===false));
 assert.ok(out.every(x=>x.permissions.tools.length===0));
 assert.ok(out.every(x=>x.permissions.postSocialContent===false));
 assert.ok(out.every(x=>x.permissions.sendOutreach===false));
 assert.ok(out.every(x=>x.permissions.purchaseAds===false));
 assert.ok(out.every(x=>x.permissions.crossProjectAccess===false));
 assert.equal(out[0].role,'chief');
 assert.ok(out.slice(1).every(x=>x.reporting.reportsTo==='chief-lumen'));
 assert.match(out[1].instructions,/platform specifications/);
 assert.match(out[2].instructions,/animal/i);
 assert.match(out[3].instructions,/licensing/i);
});
test('opt-in preview preserves canonical 25 + 160 roster and gives exactly 189 draft profiles',()=>{
 const base=connectedRoster();
 assert.equal(base.length,185);
 const addon=previewCreativeMediaRoster(base);
 assert.equal(base.length,185);
 assert.equal(addon.roster.length,189);
 assert.equal(addon.roster.filter(x=>x.isChief).length,26);
 assert.equal(addon.roster.filter(x=>!x.isChief).length,163);
 assert.equal(addon.mergedIntoProduction,false);
 assert.equal(addon.privateMemoryConnected,false);
 assert.equal(addon.toolConnectionsActive,false);
 assert.equal(new Set(addon.roster.map(x=>x.id)).size,189);
 assert.equal(addon.roster.find(a=>a.id==='agent-creative-iris').brain.agentId,'agent-creative-iris');
 awaitRejectInvalid();
 function awaitRejectInvalid(){
  assert.throws(()=>previewCreativeMediaRoster(base.slice(0,-1)),/EXPECTED_185/);
  assert.throws(()=>previewCreativeMediaRoster([...base.slice(0,-1),{...base[0]}]),/CREATIVE_AGENT_ID_COLLISION/);
 }
});
test('cinematography plan routes FRAME and retains LUMEN → SCOTTY review',()=>{
 const r=proposeCreativeMediaTeam({task:'Plan a cinematic gimbal shot list and camera transitions for a vertical video'});
 assert.equal(r.status,'PENDING_OWNER_APPROVAL');
 assert.equal(r.chiefId,'chief-lumen');
 assert.ok(r.proposedAgents.some(a=>a.name==='FRAME'));
 assert.ok(r.reviewPath.at(-1).includes('SCOTTY → Owner'));
 assert.equal(r.started,false);assert.equal(r.assignmentsCreated,0);
 assert.equal(r.messagesSent,0);assert.equal(r.memoryWrites,0);
 assert.equal(r.aiCalls,0);assert.equal(r.externalActions,0);
});
test('photography and social tasks select different specialists',()=>{
 const photo=proposeCreativeMediaTeam({task:'Create a pet portrait photography lighting and backdrop shot list'});
 const social=proposeCreativeMediaTeam({task:'Draft Instagram captions and a social media content calendar'});
 assert.ok(photo.proposedAgents.some(a=>a.agentId==='agent-creative-iris'));
 assert.ok(social.proposedAgents.some(a=>a.agentId==='agent-creative-pulse'));
 assert.equal(social.projectMembershipVerified,false);
 assert.equal(photo.approvedScopeVerified,false);
});
test('requested specialists can be targeted exactly, but never assigned without owner authorization',()=>{
 const r=proposeCreativeMediaTeam({task:'Create a new brand production concept',requestedSpecialists:['agent-creative-pulse','agent-creative-iris']});
 assert.deepEqual(r.proposedAgents.map(a=>a.agentId),['agent-creative-pulse','agent-creative-iris']);
 assert.ok(r.proposedAgents.every(a=>a.state==='PROPOSED_NOT_ASSIGNED'));
 assert.equal(r.messagesSent,0);
});
test('unsafe or duplicate requests rejected and unmatched scope is inert',()=>{
 assert.throws(()=>proposeCreativeMediaTeam({task:'video',requestedSpecialists:['agent-creative-pulse','agent-creative-pulse']}),/INVALID_CREATIVE_MEDIA_REQUEST/);
 assert.throws(()=>proposeCreativeMediaTeam({task:'',requestedSpecialists:[]}));
 assert.throws(()=>proposeCreativeMediaTeam({task:'portrait',projectId:'../secret'}));
 assert.throws(()=>creativeMediaBrain('unknown-agent'));
 const other=proposeCreativeMediaTeam({task:'Need an unrelated database schema change'});
 assert.equal(other.status,'NEEDS_SCOPE_CLARIFICATION');
 assert.equal(other.started,false);
 assert.equal(other.aiCalls,0);
});
