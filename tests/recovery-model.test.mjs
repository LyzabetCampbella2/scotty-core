import assert from "node:assert/strict";
import { test } from "node:test";

// Isolated recovery-model regression tests. No database, server, network, or real agents.
function prepare(mission,linked=[]){
 if(mission.status!=="interrupted")return {error:"not-interrupted"};
 if(linked.length)return {error:"already-recovering"};
 const prior=Array.isArray(mission.results)?mission.results:[];
 const completed=new Set(prior.filter(x=>x.status==="completed").map(x=>String(x.id)));
 const remaining=mission.agents.map(String).filter(id=>!completed.has(id));
 if(!remaining.length)return {error:"nothing-to-resume"};
 return {remaining,completed:[...completed],approvalRequired:true};
}
function claim(mission){if(mission.status!=="interrupted")return false;mission.status="recovering";return true;}
function release(mission){if(mission.status==="recovering")mission.status="interrupted";}
function stale(mission,minutes){if(["running","reviewing","recovering"].includes(mission.status)&&minutes>60){mission.status="interrupted";mission.dependencies=mission.dependencies.map(x=>({...x,state:["working","waiting","awaiting_review"].includes(x.state)?"interrupted":x.state}));}}
test("completed results are not scheduled again",()=>{const p=prepare({status:"interrupted",agents:["a","b"],results:[{id:"a",status:"completed",result:"saved"}]});assert.deepEqual(p.remaining,["b"]);assert.deepEqual(p.completed,["a"]);assert.equal(p.approvalRequired,true)});
test("recovery requires an interrupted mission",()=>assert.equal(prepare({status:"running",agents:["a"],results:[]}).error,"not-interrupted"));
test("existing linked recovery prevents duplicate preparation",()=>assert.equal(prepare({status:"interrupted",agents:["a"],results:[]},[{id:"linked"}]).error,"already-recovering"));
test("claim is one use until released",()=>{const m={status:"interrupted"};assert.equal(claim(m),true);assert.equal(claim(m),false);release(m);assert.equal(claim(m),true)});
test("stale recovery can become interrupted without losing completed states",()=>{const m={status:"recovering",dependencies:[{state:"completed"},{state:"working"}]};stale(m,61);assert.equal(m.status,"interrupted");assert.deepEqual(m.dependencies.map(x=>x.state),["completed","interrupted"])});
test("nothing to resume when all results completed",()=>assert.equal(prepare({status:"interrupted",agents:["a"],results:[{id:"a",status:"completed"}]}).error,"nothing-to-resume"));
