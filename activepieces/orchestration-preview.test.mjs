import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code as suggest} from './steps/propose-team.mjs';
import {code as plan} from './steps/mission-preview.mjs';
import {code as review} from './steps/prepare-review.mjs';
import {code as decision} from './steps/demo-decision.mjs';
import {code as profile} from './steps/public-profile.mjs';
const directory=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
const proposal=await suggest({directory,task:'frontend engineering and application testing'});
test('pure preview has specialist -> chief -> SCOTTY dependencies and no execution',async()=>{
 const p=await plan({proposal,projectLabel:'Synthetic QA Project'});
 assert.equal(p.type,'SCOTTY_MISSION_PLAN_PREVIEW');
 assert.equal(p.draftedOnly,true);assert.equal(p.executed,false);
 assert.equal(p.durablySaved,false);assert.equal(p.backendAuthorized,false);
 assert.equal(p.aiCalls,0);assert.equal(p.memoryWrites,0);assert.equal(p.externalActions,0);
 assert.equal(p.stepCount,proposal.proposedTeams.length*2+1);
 const overseer=p.steps.at(-1);
 assert.equal(overseer.agentId,'scotty');
 assert.equal(overseer.kind,'central-review');
 assert.equal(overseer.dependsOn.length,proposal.proposedTeams.length);
 assert.ok(p.steps.every(s=>s.status==='NOT_STARTED'));
 assert.equal(p.requirements.projectMembershipCheckRequired,true);
});
test('preview rejects fabricated approvals or duplicate chief teams',async()=>{
 for(const patch of [{status:'APPROVED'},{aiCalls:1},{memoryWrites:1},
   {started:true},{externalActions:1},{liveRosterVerified:true}]){
   await assert.rejects(()=>plan({proposal:{...proposal,...patch}}));
 }
 await assert.rejects(()=>plan({proposal,projectLabel:'\n'}));
});
test('demo approval never grants backend authorization or starts work',async()=>{
 const packet=await review({proposal});
 for(const value of ['approve','reject','',null]){
  const p=await decision({reviewPacket:packet,decision:value});
  assert.equal(p.canExecute,false);
  assert.equal(p.backendAuthorized,false);
  assert.equal(p.missionsStarted,0);
  assert.equal(p.externalActions,0);
  assert.equal(p.memoryWrites,0);
 }
 const approved=await decision({reviewPacket:packet,decision:'approve'});
 assert.equal(approved.status,'DEMO_APPROVED_ONLY');
 assert.equal(approved.acceptedForDemo,true);
 const denied=await decision({reviewPacket:packet,decision:'reject'});
 assert.equal(denied.status,'DEMO_REJECTED');
 assert.equal(denied.acceptedForDemo,false);
 await assert.rejects(()=>decision({reviewPacket:{...packet,canExecute:true},decision:'approve'}));
});
test('public profile displays only source-backed roster and no private data',async()=>{
 const r=await profile({directory,agentId:'agent-geordi-02'});
 assert.equal(r.name,'Helm');assert.equal(r.chief.name,'GEORDI');
 assert.equal(r.liveAgent,false);assert.equal(r.memoryConnected,false);
 assert.equal(r.assignmentsVerified,false);assert.deepEqual(r.memory,[]);
 assert.deepEqual(r.projects,[]);assert.deepEqual(r.missions,[]);
 const absent=await profile({directory,agentId:'nonexistent'});
 assert.equal(absent.status,'NOT_FOUND');
 await assert.rejects(()=>profile({directory:{...directory,contains_private_memory:true},agentId:'chief-riker'}));
});
