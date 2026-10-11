import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
function setup(){
 let clock=0;const status={textContent:''},calls=[];
 const node=(id,type,name,x=300)=>({id,type,name,raw:{id:id.split(':')[1],department:'Lab',projectId:'p'},el:{getBoundingClientRect:()=>({left:x-20,top:180,width:40,height:40}),classList:{toggle(){}}}});
 const task=node('task:t','task','Outline Task',100),agent=node('agent:a','agent','ALPHA'),folder=node('folder:f','folder','Drafts'),file=node('file:d','file','Outline.txt',100);
 const ctx=vm.createContext({nodes:[task,agent,folder,file],allNodes:[task,agent,folder,file],Date:{now:()=>clock},Math,Number,document:{querySelector:()=>status},api:async(path,options)=>{calls.push({path,...JSON.parse(options.body)});return {ok:true,relation:'assigned_to'}},loadResources:async()=>{},synthesize(){},eyesV2Reset(){},window:{SCOTTYSpatial:{release(){}}},collapsedSet:new Set(['dept:Lab','project:p']),focusNode:n=>{calls.push({focus:n.id});return n},saveViewSoon(){},selected:null,selectedSet:new Set(),Error});
 vm.runInContext(html.slice(html.indexOf(' function revealAndFocus(n)'),html.indexOf(' async function saveNodeLayout(source)')),ctx);
 vm.runInContext(html.slice(html.indexOf(' const dropHover=new Map()'),html.indexOf(' const handGrabs=new Map()')),ctx);
 return {ctx,calls,status,task,agent,file,folder,run:s=>vm.runInContext(s,ctx),advance:n=>clock+=n};
}
test('stable compatible drop persists task assignment and shows receipt',async()=>{
 const h=setup();h.run('updateDropTarget(nodes[0],300,200)');h.advance(500);await h.run('maybeRelate(nodes[0])');assert.equal(h.calls[0].sourceNode,'task:t');assert.equal(h.calls[0].targetNode,'agent:a');assert.match(h.status.textContent,/ASSIGNED/);
});
test('quick pass, cancelled release, and incompatible target do not mutate resources',async()=>{
 const h=setup();h.run('updateDropTarget(nodes[0],300,200)');h.advance(100);await h.run('maybeRelate(nodes[0])');assert.equal(h.calls.length,0);h.run('updateDropTarget(nodes[0],300,200)');h.advance(500);await h.run('maybeRelate(nodes[0],false)');assert.equal(h.calls.length,0);h.run('nodes=nodes.filter(n=>n.type!=="agent");updateDropTarget(nodes[0],300,200)');h.advance(500);await h.run('maybeRelate(nodes[0])');assert.equal(h.calls.length,0);
});
test('file can target only a folder and rejected server response is visible',async()=>{
 const h=setup();h.run('updateDropTarget(nodes[3],300,200)');h.advance(500);h.ctx.api=async()=>{throw Error('Folder missing')};await h.run('maybeRelate(nodes[3])');assert.match(h.status.textContent,/DROP FAILED.*Folder missing/);
});
test('voice navigation resolves exact names and opens collapsed parents',()=>{
 const h=setup();const response=h.run('navigateNode("alpha","agent")');assert.equal(response,'Focused on ALPHA.');assert.equal(h.ctx.collapsedSet.size,0);assert.equal(h.calls[0].focus,'agent:a');
});
test('ambiguous or unknown names never focus the wrong node',()=>{
 const h=setup();h.ctx.allNodes.push({...h.agent,id:'agent:b',name:'ALPHA TWO'});assert.match(h.run('navigateNode("alp","agent")'),/2 matches/);assert.match(h.run('navigateNode("missing","file")'),/No file/);assert.equal(h.calls.length,0);assert.equal(h.run('navigateNode("ALPHA","agent")'),'Focused on ALPHA.');
});
test('voice commands route named navigation and reset to the spatial controller',()=>{
 const calls=[],ctx=vm.createContext({normalizedSpeech:s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(),window:{SCOTTYSpatial:{navigateNode:(name,type)=>{calls.push([name,type]);return 'focused'},focusSelected:()=>true}},eyesFitAll:()=>calls.push(['reset'])});
 vm.runInContext(html.slice(html.indexOf('function eyesVoiceCommand(t)'),html.indexOf('function eyesToggleMulti()')),ctx);
 assert.equal(vm.runInContext('eyesVoiceCommand("Scotty, find project My Novel")',ctx),'focused');assert.deepEqual(calls[0],['my novel','project']);assert.equal(vm.runInContext('eyesVoiceCommand("Scotty, reset the canvas")',ctx),'Canvas view reset.');assert.equal(vm.runInContext('eyesVoiceCommand("Focus this agent")',ctx),'Focused on your selection.');
});
