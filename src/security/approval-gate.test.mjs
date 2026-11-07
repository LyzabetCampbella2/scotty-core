import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateApprovalGate as gate } from './approval-gate.mjs';

const fixtures = () => {
  const request = {agentId:'agent-spock-01',taskId:'task-1',projectId:'project-1',action:'read-public',resourceId:'public-doc-1',accountId:'',channelId:'',revision:'rev-1',dataClass:'SYNTHETIC_PUBLIC',toolId:'web-read',estimatedCostUsd:0};
  const grant = {...request,grantId:'grant-1',ownerId:'owner-1',ownerApproved:true,status:'approved',issuedAt:'2026-11-07T10:00:00Z',expiresAt:'2026-11-08T09:00:00Z',revokedAt:null,maxUses:1,usedCount:0,maxSpendUsd:0};
  const controls = {stopAll:false,enabled:true,grantLedgerAvailable:true,auditAvailable:true,environment:'staging',productionReleaseApproved:false,now:'2026-11-07T12:00:00Z',retryCount:0,maxRetries:0,activeRuns:0,maxConcurrent:1,budgetApproved:true,taskCapUsd:0,dailyCapUsd:0,taskSpentUsd:0,dailySpentUsd:0,paidActionsEnabled:false};
  return {request,grant,controls};
};
const check = (mutate) => {const x=fixtures();mutate(x);return gate(x.request,x.grant,x.controls);};
test('exact bounded owner-approved read yields only a provisional result',()=>{
  assert.deepEqual(check(()=>{}),{permitted:true,reason:'provisional-match-only',requiresAtomicClaim:true});
});
for (const [name,mutate] of [
  ['no grant',x=>x.grant=null],
  ['stop-all active',x=>x.controls.stopAll=true],
  ['unset stop-all',x=>delete x.controls.stopAll],
  ['runtime disabled',x=>x.controls.enabled=false],
  ['unavailable audit',x=>x.controls.auditAvailable=false],
  ['unavailable grant ledger',x=>x.controls.grantLedgerAvailable=false],
  ['unapproved owner',x=>x.grant.ownerApproved=false],
  ['draft only',x=>x.grant.status='draft'],
  ['forged agent',x=>x.request.agentId='agent-worf-01'],
  ['other project',x=>x.request.projectId='project-2'],
  ['new task',x=>x.request.taskId='task-2'],
  ['unapproved revision',x=>x.request.revision='rev-2'],
  ['unapproved tool',x=>x.request.toolId='db-write'],
  ['unapproved data class',x=>x.request.dataClass='OWNER_PRIVATE'],
  ['unapproved action',x=>x.request.action='write-file'],
  ['wildcard grant',x=>{x.request.agentId='*';x.grant.agentId='*'}],
  ['revoked',x=>x.grant.revokedAt='2026-11-07T11:00:00Z'],
  ['expired',x=>x.controls.now='2026-11-08T09:00:00Z'],
  ['future issued',x=>x.grant.issuedAt='2026-11-07T13:00:00Z'],
  ['lifetime above 24h',x=>x.grant.expiresAt='2026-11-08T10:00:01Z'],
  ['used count exhausted',x=>x.grant.usedCount=1],
  ['missing budget approval',x=>x.controls.budgetApproved=false],
  ['attempted billable read',x=>x.request.estimatedCostUsd=0.01],
  ['retry excess',x=>x.controls.retryCount=1],
  ['concurrency excess',x=>x.controls.activeRuns=1],
  ['production without release',x=>x.controls.environment='production'],
  ['time not RFC3339 UTC',x=>x.controls.now='today'],
  ['NaN cost',x=>x.request.estimatedCostUsd=NaN],
  ['missing idempotency for file write',x=>{x.request.action='write-file';x.grant.action='write-file';}],
  ['message needs account/channel',x=>{x.request.action='send-message';x.grant.action='send-message';x.request.idempotencyKey='key-1';x.grant.idempotencyKey='key-1';}],
  ['unapproved payment flag',x=>{x.request.action='spend-money';x.grant.action='spend-money';x.request.accountId=x.grant.accountId='account-1';x.request.channelId=x.grant.channelId='billing';x.request.idempotencyKey=x.grant.idempotencyKey='key-1';}],
]) test('deny by default: '+name,()=> assert.equal(check(mutate).permitted,false));

test('exact versioned file write is still provisional and requires atomic claim',()=>{
  const result=check(x=>{x.request.action=x.grant.action='write-file';x.request.idempotencyKey=x.grant.idempotencyKey='unique-idem-1';});
  assert.equal(result.permitted,true);assert.equal(result.requiresAtomicClaim,true);
});

test('separate financial approval and all caps are required',()=>{
 const x=fixtures();
 x.request.action=x.grant.action='spend-money';x.request.accountId=x.grant.accountId='merchant-1';x.request.channelId=x.grant.channelId='payment';x.request.idempotencyKey=x.grant.idempotencyKey='idempotent-1';
 x.request.estimatedCostUsd=1;x.grant.maxSpendUsd=1;
 x.controls.paidActionsEnabled=true;x.controls.taskCapUsd=1;x.controls.dailyCapUsd=1;
 assert.equal(gate(x.request,x.grant,x.controls).permitted,true);
 x.controls.dailySpentUsd=0.01;
 assert.equal(gate(x.request,x.grant,x.controls).permitted,false);
});
