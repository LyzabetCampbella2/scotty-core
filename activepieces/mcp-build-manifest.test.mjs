import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const file=JSON.parse(fs.readFileSync(new URL('./SCOTTY_MCP_BUILD_MANIFEST.json',import.meta.url),'utf8'));
test('staging MCP plan cannot silently activate expensive or private flows',()=>{
 assert.equal(file.state,'STAGING_DRAFTS_INSTALLED');
 assert.equal(file.mode,'STAGING');
 assert.equal(file.deployApproved,false);
 assert.equal(file.allowedPaidActions,false);
 assert.equal(file.liveExternalSystems,false);
 assert.equal(file.agentDirectory.chiefs,25);
 assert.equal(file.agentDirectory.specialists,160);
 assert.equal(file.agentDirectory.liveVerified,false);
 assert.equal(new Set(file.flows.map(x=>x.key)).size,file.flows.length);
 assert.ok(file.flows.length>=10);
 assert.ok(file.flows.every(x=>x.enabled===false));
 assert.ok(file.flows.filter(x=>x.status.startsWith('BLOCKED_')).length>=3);
 for(const [key,value] of Object.entries(file.defaultRules)){
  assert.equal(value,false,'Unexpected enabled default: '+key);
 }
});
test('verified staging drafts are recorded as disabled and reviewed',()=>{
 assert.equal(file.verifiedInAccount.draftFlowsInFolder,14);
 assert.equal(file.verifiedInAccount.enabledFlows,0);
 assert.equal(file.verifiedInAccount.publishedFlows,0);
 assert.equal(file.verifiedInAccount.tablesCreated,9);
 assert.equal(file.tables.reduce((sum,t)=>sum+t.rows,0),245);
 assert.ok(file.flows.filter(x=>x.status==='STAGING_DRAFT_TESTED').length>=8);
 assert.ok(file.flows.every(x=>x.status!=='STAGING_DRAFT_TESTED'||x.flowId));
});

test('all ready flows are manual and read-only or preview-only',()=>{
 for(const flow of file.flows.filter(x=>x.status==='READY_TO_BUILD')){
  assert.equal(flow.type,'manual');
  assert.ok(/read-only|no execution|demo approval/.test(flow.risk));
 }
});
