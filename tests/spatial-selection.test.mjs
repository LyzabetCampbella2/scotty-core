import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
function setup(){
 const el=new Map(),posts=[];
 const $=id=>{if(!el.has(id))el.set(id,{textContent:'',value:'',focus(){}});return el.get(id)};
 $('#ci');
 const nodes=[['agent:a','agent','ALPHA','a'],['agent:b','agent','ALPHA TWO','b'],['project:p','project','PROJECT','p']].map(([id,type,name,rawId],i)=>({id,type,name,raw:{id:rawId},x:100+i*200,y:100,ox:0,oy:0,el:{classList:{toggle(){}}}}));
 const context=vm.createContext({nodes,document:{querySelector:$},$,selected:null,selectedSet:new Set(),eyesSelectedNodes:new Set(),eyesMultiMode:false,selectedAgentId:null,auto:false,zoom:1,orbit:0,panX:0,panY:0,spread:1,tilt:0,sb:{clientWidth:800,clientHeight:600},clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),project:()=>({sc:1}),dropHover:new Map(),paintDropTargets(){},updateDropTarget(){},maybeRelate(){},saveViewSoon(){},saveNodeLayout(){},nearestSpatial:(x,y)=>nodes.find(n=>Math.hypot(n.x-x,n.y-y)<60),Number,Math,window:{SCOTTYSpatial:{}},agents:nodes.filter(n=>n.type==='agent').map(n=>({...n.raw,name:n.name})),eyesVoiceCommand:()=>null,api:async(path,options)=>{posts.push({path,...JSON.parse(options?.body||'{}')});return {results:[]}},loadAgents:async()=>{},speak:async()=>{},speaking:false,voiceArmed:false,setTimeout(){},e:x=>x});
 const a=html.indexOf(' function paintSelection('),b=html.indexOf('paintSelection();drawer.classList',a);
 vm.runInContext(html.slice(a,b)+'paintSelection();}',context);
 const h=html.indexOf(' const handGrabs=new Map()'),end=html.indexOf(' window.SCOTTYSpatial={',h);
 vm.runInContext(html.slice(h,end),context);
 vm.runInContext('window.SCOTTYSpatial={selectedAgentIds};',context);
 const c=html.indexOf('async function command(t)'),ce=html.indexOf("$('#send').onclick",c);
 vm.runInContext(html.slice(c,ce),context);
 return {run:s=>vm.runInContext(s,context),context,el,nodes,posts};
}
test('multi mode accumulates pinch selections and regrabbing preserves the group',()=>{
 const h=setup();h.run('setMulti(true);handGrab(0,100,100);handRelease(0);handGrab(1,300,100);handRelease(1)');assert.deepEqual([...h.context.selectedSet],['agent:a','agent:b']);h.run('handGrab(0,100,100);handRelease(0)');assert.equal(h.context.selectedSet.size,2);h.run('select(nodes[1],true)');assert.deepEqual([...h.context.selectedSet],['agent:a']);
});
test('single mode replaces selection; clear removes both visible and legacy states',()=>{
 const h=setup();h.run('handGrab(0,100,100);handRelease(0);handGrab(1,300,100);handRelease(1)');assert.deepEqual([...h.context.selectedSet],['agent:b']);h.run('clearSelection()');assert.equal(h.context.selectedSet.size,0);assert.equal(h.context.eyesSelectedNodes.size,0);
});
test('call selected fills the task input and executes exact IDs, ignoring project nodes',async()=>{
 const h=setup();h.run('setMulti(true);select(nodes[0],true,false);select(nodes[1],true,false);select(nodes[2],true,false);callSelected()');assert.equal(h.el.get('#ci').value,'Ask selected agents: ');await h.run("command('Ask selected agents: review my outline')");assert.equal(h.posts.length,1);assert.equal(h.posts[0].path,'/api/hud/agents/run');assert.deepEqual(h.posts[0].agents,['a','b']);assert.equal(h.posts[0].task,'review my outline');
});
test('empty agent selection does not create a mission',async()=>{
 const h=setup();h.run('select(nodes[2]);callSelected()');assert.equal(h.el.get('#ci').value,'');await h.run("command('Ask selected agents: do work')");assert.equal(h.posts.length,0);
});
test('team selection exceeding server limit is rejected without silent truncation',async()=>{
 const h=setup();for(let i=0;i<9;i++)h.nodes.push({id:'agent:x'+i,type:'agent',name:'X'+i,raw:{id:'x'+i},el:{classList:{toggle(){}}}});h.run('setMulti(true);nodes.filter(n=>n.id.startsWith("agent:x")).forEach(n=>select(n,true,false))');await h.run("command('Ask selected agents: do work')");assert.equal(h.posts.length,0);assert.match(h.el.get('#cs').textContent,/up to 8/);
});
test('spread clamps spacing and regroup preserves custom node offsets and view zoom',()=>{
 const h=setup();h.nodes[0].ox=42;h.run('zoom=1.7;spreadBy(100)');assert.equal(h.context.spread,2.8);h.run('handSpread(.01)');assert.equal(h.context.spread,.65);h.run('regroup()');assert.equal(h.context.spread,1);assert.equal(h.context.zoom,1.7);assert.equal(h.nodes[0].ox,42);
});
