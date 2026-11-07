import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CREATIVE_MEDIA_PROFILES,CREATIVE_MEDIA_COUNTS} from '../offline-brain/cloudflare-ipad/creative-media-department.mjs';
import {code} from './steps/creative-campaign-preview.mjs';
const directory=JSON.parse(fs.readFileSync(new URL('./public-creative-media-directory.json',import.meta.url),'utf8'));
const brief='Plan a pet-friendly 9:16 social media UGC cat campaign with Instagram captions, cinematic gimbal video shot list and editorial photography session';
test('public add-on matches authored creative-media department and planned roster counts',()=>{
 assert.equal(directory.mode,'STATIC_READ_ONLY');
 assert.equal(directory.status,'PROPOSED_EXTENSION_NOT_MERGED');
 assert.equal(directory.counts.proposedTotal,CREATIVE_MEDIA_COUNTS.proposedTotal);
 assert.equal(directory.agents.length,4);
 for(const a of CREATIVE_MEDIA_PROFILES){
   const displayed=directory.agents.find(x=>x.id===a.id);
   assert.ok(displayed);
   assert.equal(displayed.name,a.name);
   assert.equal(displayed.chiefId,a.chiefId);
   assert.equal(displayed.specialty,a.specialty);
   assert.equal(displayed.title,a.title);
   assert.equal(displayed.memoryPersisted,false);
   assert.equal(displayed.toolsConnected,false);
 }
});
test('synthetic Golden Hour campaign proposes all three unique specialists under LUMEN',async()=>{
 const r=await code({directory,brief,projectId:'golden-hour-creative'});
 assert.equal(r.type,'SCOTTY_LUMEN_CAMPAIGN_PREVIEW');
 assert.equal(r.status,'PENDING_OWNER_APPROVAL');
 assert.equal(r.proposedSpecialists.length,3);
 assert.deepEqual(r.proposedSpecialists.map(x=>x.name),['PULSE','FRAME','IRIS']);
 assert.ok(r.proposedSpecialists.every(x=>x.chiefId==='chief-lumen'&&x.status==='PROPOSED_NOT_ASSIGNED'));
 assert.equal(r.chief.name,'LUMEN');
 assert.equal(r.actualOwnerApprovalVerified,false);
 assert.equal(r.projectMembershipVerified,false);
 assert.equal(r.socialAccountsConnected,false);
 for(const k of ['publishAllowed','outreachAllowed','adSpendAllowed','started'])assert.equal(r[k],false);
 for(const k of ['assignmentsCreated','missionsCreated','messagesSent','aiCalls','memoryReads','memoryWrites','externalActions'])assert.equal(r[k],0);
});
test('social-only and photo-only briefs route targeted development agents',async()=>{
 const social=await code({directory,brief:'Draft Instagram social captions and hooks for an original marketing calendar'});
 assert.deepEqual(social.proposedSpecialists.map(x=>x.name),['PULSE']);
 const photo=await code({directory,brief:'Plan pet portrait photographs and lens choices'});
 assert.deepEqual(photo.proposedSpecialists.map(x=>x.name),['IRIS']);
 const motion=await code({directory,brief:'Write a cinematic gimbal motion sequence for a short film'});
 assert.deepEqual(motion.proposedSpecialists.map(x=>x.name),['FRAME']);
});
test('changed fixture or live tool/memory claims fail closed',async()=>{
 for(const patch of [
 {live_roster_verified:true},
 {contains_private_memory:true},
 {contains_connected_social_accounts:true},
 {mode:'LIVE'},
 {counts:{...directory.counts,proposedTotal:185}}
 ]){
  await assert.rejects(()=>code({directory:{...directory,...patch},brief}));
 }
 const compromised=structuredClone(directory);
 compromised.agents[1].toolsConnected=true;
 await assert.rejects(()=>code({directory:compromised,brief}));
 const badHierarchy=structuredClone(directory);
 badHierarchy.agents[2].chiefId='chief-expansion-hologram';
 await assert.rejects(()=>code({directory:badHierarchy,brief}));
});
test('private or unmatched projects and empty scopes cannot become preview assignments',async()=>{
 await assert.rejects(()=>code({directory,brief,projectId:'unknown-customer'}));
 await assert.rejects(()=>code({directory,brief:''}));
 await assert.rejects(()=>code({directory,brief,projectId:'../private'}));
 const r=await code({directory,brief:'Fix a SQL index',projectId:'scotty-aios'});
 assert.equal(r.status,'NEEDS_SCOPE_CLARIFICATION');
 assert.equal(r.aiCalls,0);
 assert.equal(r.messagesSent,0);
});
