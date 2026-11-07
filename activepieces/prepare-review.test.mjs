import test from 'node:test';
import assert from 'node:assert/strict';
import {code} from './steps/prepare-review.mjs';
const valid={status:'PENDING_OWNER_APPROVAL',mode:'ROUTING_PREVIEW_ONLY',ownerApprovalRequired:true,
  started:false,liveRosterVerified:false,aiCalls:0,memoryWrites:0,missionsCreated:0,externalActions:0,
  task:'frontend engineering and application testing',
  proposedTeams:[{agentId:'agent-geordi-02',name:'Helm',chiefId:'chief-geordi',chiefName:'GEORDI',
    specialty:'Frontend engineering',status:'suggested-only'}]};
test('creates a non-authorizing human review packet',async()=>{
  const x=await code({proposal:valid});
  assert.equal(x.type,'SCOTTY_INERT_REVIEW_PACKET');
  assert.match(x.description,/Helm/);
  assert.equal(x.canExecute,false);
  assert.equal(x.backendAuthorization,false);
  assert.equal(x.approvalRecorded,false);
  assert.equal(x.missionsStarted,0);
  assert.equal(x.aiCalls,0);
  assert.equal(x.memoryWrites,0);
});
test('rejects any claim of actions performed, authorization or missing review',async()=>{
  for(const patch of [{started:true},{liveRosterVerified:true},{aiCalls:1},{memoryWrites:1},
    {missionsCreated:1},{externalActions:1},{ownerApprovalRequired:false},{status:'APPROVED'},
    {proposedTeams:[]},{proposedTeams:[valid.proposedTeams[0],valid.proposedTeams[0]]}]){
    await assert.rejects(()=>code({proposal:{...valid,...patch}}));
  }
});
