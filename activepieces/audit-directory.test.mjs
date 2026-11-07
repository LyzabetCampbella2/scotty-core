import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {code} from './steps/audit-directory.mjs';
const doc=JSON.parse(fs.readFileSync(new URL('./public-agent-directory.json',import.meta.url),'utf8'));
test('public directory integrity succeeds without live-agent claims',async()=>{
  const report=await code({directory:doc});
  assert.equal(report.status,'PASS_PUBLIC_ROSTER_INTEGRITY');
  assert.deepEqual(report.counts,{chiefs:25,specialists:160,total:185});
  assert.equal(report.uniqueIdCount,185);
  assert.equal(report.violations.length,0);
  assert.equal(report.liveAgentsVerified,0);
  assert.equal(report.privateMemoryConnected,false);
  assert.equal(report.aiCalls,0);
});
test('missing chief and duplicate IDs are flagged, not silently accepted',async()=>{
  const altered=structuredClone(doc);
  altered.agents[12].chiefId='fake-chief';
  altered.agents[13].id=altered.agents[12].id;
  const r=await code({directory:altered});
  assert.equal(r.status,'REVIEW_REQUIRED');
  assert.ok(r.violations.includes('MISSING_PARENT_CHIEF'));
  assert.ok(r.violations.includes('DUPLICATE_OR_MISSING_ID'));
});
