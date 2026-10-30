import test from 'node:test';
import assert from 'node:assert/strict';
import {handleBrainUpgrade} from './upgrade-api.mjs';
const url='https://scotty.example/api/hud/brain-upgrades/review';
const req=(payload,opts={})=>new Request(url,{method:'POST',headers:{'content-type':'application/json',...opts.headers},body:JSON.stringify(payload)});
const report={question:'List 3 tests',answer:'1. Check A\n2. Check B\n3. Check C\nInclude expected results and clear assumptions.',results:[{role:'department chief',status:'completed'}],references:[]};
test('rejects unauthorized caller without reviewing private text',async()=>{
 const r=await handleBrainUpgrade(req(report),new URL(url),async()=>false);
 assert.equal(r.status,401);
});
test('allows authorized review, not model execution, without persisting',async()=>{
 const r=await handleBrainUpgrade(req(report),new URL(url),async()=>true);
 const d=await r.json();assert.equal(r.status,200);assert.equal(d.persisted,false);assert.equal(d.aiCalls,0);
 assert.equal(d.review.verdict,'provisional-pass');
});
test('rejects foreign origin and huge payload',async()=>{
 const foreign=await handleBrainUpgrade(req(report,{headers:{origin:'https://attacker.example'}}),new URL(url),async()=>true);
 assert.equal(foreign.status,403);
 const oversized=await handleBrainUpgrade(req({...report,answer:'x'.repeat(16001)}),new URL(url),async()=>true);
 assert.equal(oversized.status,400);
});
