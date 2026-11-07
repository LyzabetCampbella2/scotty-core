import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {connectedRoster} from '../offline-brain/cloudflare-ipad/connected-roster.mjs';

test('public Activepieces directory matches the development source, but is not live',()=>{
  const file=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
  const expected=connectedRoster();
  assert.equal(file.mode,'STATIC_READ_ONLY');
  assert.equal(file.live_roster_verified,false);
  assert.equal(file.owner_approval_required_for_execution,true);
  assert.equal(file.contains_private_memory,false);
  assert.deepEqual(file.counts,{chiefs:25,specialists:160,total:185});
  assert.equal(file.agents.length,expected.length);
  for(let i=0;i<expected.length;i++){
    const a=expected[i],b=file.agents[i];
    assert.deepEqual(b,{id:a.id,name:a.name,department:a.department,isChief:a.isChief,
      chiefId:a.chiefId,specialty:a.specialty,skills:a.skills,provenance:a.provenance});
  }
  assert.equal(new Set(file.agents.map(a=>a.id)).size,185);
  const allowed=new Set(['id','name','department','isChief','chiefId','specialty','skills','provenance']);
  for(const agent of file.agents){
    assert.ok(Object.keys(agent).every(k=>allowed.has(k)));
    assert.ok(!agent.isChief?file.agents.some(b=>b.id===agent.chiefId&&b.isChief):agent.chiefId===null);
  }
  assert.doesNotMatch(JSON.stringify(file),/owner_bearer_token|database_url|api_key|private_notes|personal_memory|client_content/i);
});
