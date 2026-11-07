import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code} from './steps/propose-team.mjs';

const directory=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
test('safe Activepieces preview routes to engineering specialists without execution',async()=>{
 const r=await code({directory,task:'frontend engineering and application testing'});
 assert.equal(r.mode,'ROUTING_PREVIEW_ONLY');
 assert.equal(r.status,'PENDING_OWNER_APPROVAL');
 assert.equal(r.overseer,'SCOTTY');
 assert.ok(r.proposedTeams.length>=1&&r.proposedTeams.length<=2);
 assert.equal(new Set(r.proposedTeams.map(x=>x.chiefId)).size,r.proposedTeams.length);
 assert.ok(r.proposedTeams.every(x=>directory.agents.some(a=>a.id===x.agentId&&a.chiefId===x.chiefId)));
 for(const k of ['started','liveRosterVerified'])assert.equal(r[k],false);
 for(const k of ['aiCalls','memoryWrites','missionsCreated','externalActions'])assert.equal(r[k],0);
 assert.equal(r.ownerApprovalRequired,true);
});
test('works with HTTP response body or serialized JSON inputs',async()=>{
 const values=[directory,{status:200,body:directory},JSON.stringify(directory)];
 for(const value of values){
  const r=await code({directory:value,task:'biology ecology research'});
  assert.ok(r.proposedTeams.length>=1);
  assert.equal(r.status,'PENDING_OWNER_APPROVAL');
 }
});
test('unrelated task yields no fabricated assignment',async()=>{
 const r=await code({directory,task:'zyxwvut proxxer imnox'});
 assert.equal(r.status,'NEEDS_CLARIFICATION');
 assert.equal(r.proposedTeams.length,0);
 assert.equal(r.started,false);
});
test('wrong roster or unverified flags stop safely',async()=>{
 const bad=[{...directory,mode:'AUTONOMOUS'}, {...directory,counts:{...directory.counts,total:184}}, {...directory,live_roster_verified:true}, {...directory,agents:[]}];
 for(const d of bad)await assert.rejects(()=>code({directory:d,task:'software engineering'}),/INVALID_PUBLIC_DEVELOPMENT_DIRECTORY/);
 await assert.rejects(()=>code({directory,task:''}),/TASK_MUST_BE/);
 await assert.rejects(()=>code({directory,task:'x'.repeat(501)}),/TASK_MUST_BE/);
});
