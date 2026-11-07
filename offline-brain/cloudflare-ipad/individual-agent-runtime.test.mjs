import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster} from './connected-roster.mjs';
import {runTeam} from './team-runtime.mjs';
import {agentBrain,BRAIN_SPEC_VERSION} from './individual-agent-brains.mjs';

test('bounded team runner loads distinct Phase-1 prompts for specialist and chief',async()=>{
 const messages=[];
 const AI={async run(_model,request){
  messages.push(request.messages[0].content);
  return {response:'Synthetic draft with limited evidence. No execution or verification claimed.'};
 }};
 const result=await runTeam({
  roster:connectedRoster(),
  question:'Create a frontend engineering test checklist for a fictional app with keyboard accessibility',
  AI,approved:true,teamSize:1,getEvidence:async()=>[],onCheckpoint:async()=>{}
 });
 assert.equal(result.status,'completed');
 assert.equal(messages.length,3);
 assert.equal(result.attemptedCalls,3);
 assert.equal(new Set(messages).size,3);
 const specialistId=result.results[0].agentId;
 const chiefId=result.results[1].agentId;
 assert.equal(result.results[0].individualBrainVersion,BRAIN_SPEC_VERSION);
 assert.equal(result.results[1].individualBrainVersion,BRAIN_SPEC_VERSION);
 assert.equal(result.results[2].individualBrainVersion,null);
 assert.ok(messages[0].includes(specialistId));
 assert.ok(messages[1].includes(chiefId));
 assert.ok(messages[0].includes(agentBrain(specialistId).focus));
 assert.ok(messages[1].includes(agentBrain(chiefId).reasoningInstructions));
 assert.match(messages[0],/Individual role-specific brain specification/);
 assert.match(messages[1],/Individual role-specific brain specification/);
 assert.match(messages[2],/SCOTTY/);
 assert.equal(result.memorySaved,false);
 assert.equal(result.verified,false);
});
test('team runner still rejects an unapproved task before calling model',async()=>{
 let called=0;
 await assert.rejects(()=>runTeam({
  roster:connectedRoster(),question:'frontend engineering',approved:false,
  AI:{async run(){called++;return {response:'no'};}},getEvidence:async()=>[]
 }),/TEAM_APPROVAL_REQUIRED/);
 assert.equal(called,0);
});
