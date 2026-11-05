import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const env={AI_ENABLED:'false'};

test('mobile bio studio renders a project/agent workspace without exposing owner credentials',async()=>{
 const res=await worker.fetch(new Request('https://synthetic.invalid/'),env);
 const html=await res.text();
 assert.equal(res.status,200);
 assert.match(html,/Agent Bio Studio/);
 for(const id of ['agent-bios','bio-open','bio-details','portfolio-project','portfolio-create','portfolio-assign','portfolio-assign-team'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(!html.includes('OWNER_BEARER_TOKEN'));
});
test('served browser script contains in-closure portfolio controls and is valid JavaScript',async()=>{
 const res=await worker.fetch(new Request('https://synthetic.invalid/ui.js'),env);
 const script=await res.text();
 assert.equal(res.status,200);
 assert.match(script,/Agent Bio Studio extensions/);
 assert.match(script,/portfolio-assign/);
 assert.match(script,/verifiedCollaborators/);
 assert.match(script,/ownerToken/);
 assert.doesNotThrow(()=>new Function(script));
});
