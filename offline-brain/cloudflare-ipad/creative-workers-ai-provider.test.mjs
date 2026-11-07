import test from 'node:test';
import assert from 'node:assert/strict';
import {createCreativeWorkersAIAdapter,CREATIVE_WORKERS_AI_MODEL} from './creative-workers-ai-provider.mjs';
const options={SCOTTY_CREATIVE_AI_ENABLED:'true',
 SCOTTY_CREATIVE_AI_MODEL:CREATIVE_WORKERS_AI_MODEL,
 SCOTTY_CREATIVE_AI_MAX_CALLS:'1',
 SCOTTY_CREATIVE_PUBLIC_ONLY:'true'};
test('provider never becomes available without explicit environment controls',()=>{
 const fake={run:async()=>({response:'TEST'})};
 for(const key of Object.keys(options)){
  const v={...options,AI:fake};delete v[key];
  assert.throws(()=>createCreativeWorkersAIAdapter(v));
 }
 assert.throws(()=>createCreativeWorkersAIAdapter({...options,AI:null}));
});
test('approved isolated adapter runs exactly one mocked call for the authorized creative ID',async()=>{
 const calls=[];
 const ai={async run(...args){calls.push(args);return {response:'Synthetic, owner-reviewed lighting storyboard proposal.'};}};
 const adapter=createCreativeWorkersAIAdapter({...options,AI:ai});
 const request={agentId:'agent-creative-frame',
  instruction:'You are FRAME. Produce a fictional cinematic shot plan with camera movement. '.repeat(2),
  input:{projectId:'golden-hour-creative',missionId:'mission-creative-0001',
    assignment:'Plan a safe pet-friendly camera sequence',evidence:[]},
  maxTokens:700,temperature:0.2,stream:false};
 const out=await adapter.run(request);
 assert.match(out.text,/Synthetic/);
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],CREATIVE_WORKERS_AI_MODEL);
 assert.equal(calls[0][1].max_tokens,700);
 assert.equal(calls[0][1].messages[0].role,'system');
 await assert.rejects(()=>adapter.run(request),/CREATIVE_PROVIDER_MAX_CALLS_REACHED/);
 assert.equal(calls.length,1);
});
test('bad agent, large content or unsupported settings cannot reach provider',async()=>{
 const calls=[];
 const ai={async run(...args){calls.push(args);return {response:'UNUSED'};}};
 const base={agentId:'agent-creative-iris',
  instruction:'You are IRIS. Produce ethical photography, lighting and composition advice. '.repeat(2),
  input:{projectId:'golden-hour-creative',missionId:'mission-creative-0001',
    assignment:'Plan a pet portrait photo session',evidence:[]},
  maxTokens:700,temperature:0.2,stream:false};
 for(const change of [
  {agentId:'chief-unknown'},
  {maxTokens:100000},
  {stream:true},
  {input:{...base.input,assignment:'A'.repeat(1500)}}
 ]){
  const adapter=createCreativeWorkersAIAdapter({...options,AI:ai});
  await assert.rejects(()=>adapter.run({...base,...change}),/INVALID_CREATIVE_MODEL_CALL/);
 }
 assert.equal(calls.length,0);
});
test('provider errors do not cause any fallback or retry',async()=>{
 let n=0;
 const adapter=createCreativeWorkersAIAdapter({...options,AI:{
   async run(){n++;throw Error('synthetic provider outage');}
 }});
 const input={agentId:'agent-creative-pulse',
  instruction:'You are PULSE. Draft a truthful marketing campaign without social posting. '.repeat(2),
  input:{projectId:'golden-hour-creative',missionId:'mission-creative-0001',
    assignment:'Draft social content outline',evidence:[]},
  maxTokens:700,temperature:0.2,stream:false};
 await assert.rejects(()=>adapter.run(input),/CREATIVE_WORKERS_AI_UNAVAILABLE_NO_RETRY/);
 await assert.rejects(()=>adapter.run(input),/CREATIVE_PROVIDER_MAX_CALLS_REACHED/);
 assert.equal(n,1);
});
