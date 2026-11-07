import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFutureOwnerMissionGate as check} from './activepieces-owner-gate.mjs';
const now=new Date('2026-11-07T04:00:00.000Z');
const id='a'.repeat(64);
const proposal={
 projectId:'eirden-atelier',missionId:'demo-mission-001',revision:'r1',
 idempotencyKey:'demo-request-0001',intentDigest:id,
 agentIds:['agent-geordi-02','agent-expansion-012'],
 classification:'public-or-synthetic',containsPrivateData:false,paidProviderRequested:false
};
const serverSession={verifiedByScotty:true,authenticated:true,role:'owner',
 provenance:'scotty-server-side-session',ownerId:'owner-demo-0001',
 allowedProjects:['eirden-atelier']};
const serverProject={id:'eirden-atelier',active:true,
 allowedAgentIds:['agent-geordi-02','agent-expansion-012']};
const serverGrant={origin:'scotty-server-audit-store',revoked:false,
 ownerId:'owner-demo-0001',projectId:'eirden-atelier',missionId:'demo-mission-001',
 revision:'r1',idempotencyKey:'demo-request-0001',intentDigest:id,
 scope:'mission.preview',approvedAgentIds:['agent-geordi-02','agent-expansion-012'],
 ownerReviewConfirmed:true,expiresAt:'2026-11-07T04:30:00.000Z',committed:false};
const safe={proposal,serverSession,serverProject,serverGrant,now};
const blocked=x=>{assert.equal(x.status,'BLOCKED');assert.equal(x.backendAuthorized,false);
 assert.equal(x.canExecute,false);assert.equal(x.missionStarted,false);assert.equal(x.storeWrites,0)};
test('synthetic trusted metadata meets preview prerequisites but NEVER executes',()=>{
 const x=check(safe);
 assert.equal(x.status,'REVIEW_CONTRACT_PASSED_FOR_FUTURE_BACKEND');
 assert.equal(x.prerequisitesSatisfied,true);
 assert.equal(x.backendAuthorized,false);
 assert.equal(x.canExecute,false);
 assert.equal(x.missionStarted,false);
 assert.equal(x.nextGate,'ATOMIC_BACKEND_COMMIT_AND_AUDIT_NOT_IMPLEMENTED');
});
test('Activepieces-provided approval flags cannot impersonate SCOTTY owner session',()=>{
 blocked(check({proposal:{...proposal,ownerApproved:true,ownerAuthenticated:true},now}));
 blocked(check({...safe,serverSession:{...serverSession,provenance:'activepieces-workflow'}}));
 blocked(check({...safe,serverSession:{...serverSession,authenticated:false}}));
});
test('revision, digest, project, team, idempotency or status mismatch are denied',()=>{
 for(const patch of [{revision:'r2'},{intentDigest:'b'.repeat(64)},{projectId:'scotty-aios'},
   {agentIds:['agent-geordi-02']},{idempotencyKey:'some-other-request'},{containsPrivateData:true},
   {paidProviderRequested:true},{classification:'private'}]){
   blocked(check({...safe,proposal:{...proposal,...patch}}));
 }
 blocked(check({...safe,serverProject:{...serverProject,allowedAgentIds:['agent-geordi-02']}}));
 blocked(check({...safe,serverGrant:{...serverGrant,committed:true}}));
 blocked(check({...safe,serverGrant:{...serverGrant,revoked:true}}));
 blocked(check({...safe,serverGrant:{...serverGrant,ownerReviewConfirmed:false}}));
});
test('expired or unbounded grant cannot pass',()=>{
 blocked(check({...safe,serverGrant:{...serverGrant,expiresAt:'2026-11-07T03:59:00Z'}}));
 blocked(check({...safe,serverGrant:{...serverGrant,expiresAt:'2026-11-09T04:01:00Z'}}));
 blocked(check({...safe,serverGrant:{...serverGrant,expiresAt:'not-date'}}));
});
