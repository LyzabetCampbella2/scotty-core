import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('../src/resources/cloud.ts',import.meta.url),'utf8');
const functions=stripTypeScriptTypes(source.slice(source.indexOf('function splitNodeId'),source.indexOf('export async function bootstrapResources')));
function setup({missingTarget=false,missingSource=false}={}){
 const calls=[],activity=[];
 const query=async(strings,...values)=>{const text=strings.join('?');calls.push({text,values});if(text.startsWith('select'))return missingTarget?[]:[{id:'f',projectId:'p'}];if(text.startsWith('update'))return missingSource?[]:[{id:'source'}];return []};query.json=x=>x;
 const ctx=vm.createContext({db:()=>query,addActivity:async(...x)=>activity.push(x),forgeVirtuals:async()=>({files:[{id:'forge-blend-job',name:'Scene.blend',path:'/forge/job/blend',mimeType:'binary',sizeBytes:0,metadata:{artifact:'blend'}}]})});vm.runInContext(functions,ctx);return{ctx,calls,activity,run:s=>vm.runInContext(s,ctx)};
}
test('task assignment checks target and source before reporting success',async()=>{const h=setup();const r=await h.run('relate("task:t","agent:a")');assert.equal(r.relation,'assigned_to');assert(h.calls.some(c=>c.text.includes('scotty_tasks')&&c.text.includes('returning id')))});
test('missing source or target produces no success activity',async()=>{for(const flags of [{missingTarget:true},{missingSource:true}]){const h=setup(flags);await assert.rejects(h.run('relate("task:t","agent:a")'),/no longer exists/);assert.equal(h.activity.length,0)}});
test('regular file adopts destination folder project and retains artifact path',async()=>{const h=setup();const r=await h.run('relate("file:d","folder:f")');assert.equal(r.folderId,'f');assert.equal(r.projectId,'p');const update=h.calls.find(c=>c.text.startsWith('update scotty_files'));assert.deepEqual(update.values,['f','p','d']);assert(!update.text.includes('path='))});
test('Forge artifact folder move persists its index instead of suggesting a link',async()=>{const h=setup();const r=await h.run('relate("file:forge-blend-job","folder:f")');assert.equal(r.relation,'contained_in');const write=h.calls.find(c=>c.text.startsWith('insert into scotty_files'));assert(write);assert(write.values.includes('/forge/job/blend'));assert.equal(r.suggested,undefined)});
