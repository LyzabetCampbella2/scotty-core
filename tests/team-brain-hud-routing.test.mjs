import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
function harness({readback=true,teamFails=false}={}){
 const els=new Map(),screens=[],speech=[],requests=[],missions=new Map(),notes=new Map();
 let next=0;
 const storage=new Map();
 storage.set('scottyConversationPreferencesV2',JSON.stringify({review:false,voiceModeVersion:1}));
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const element=tag=>({
  tagName:tag,children:[],value:'',checked:false,style:{},dataset:{},textContent:'',hidden:false,removed:false,
  classList:{toggle(){},remove(){},add(){}},setAttribute(){},appendChild(child){this.children.push(child);return child},
  append(...children){this.children.push(...children)},remove(){this.removed=true},replaceChildren(){this.children=[]},
  scrollTop:0,scrollHeight:0
 });
 const select=q=>{if(!els.has(q))els.set(q,element('div'));return els.get(q);};
 const body=element('body');
 const document={querySelector:select,createElement:element,body,head:element('head')};
 const fetcher=async(url,options={})=>{
  const req={url,options};requests.push(req);
  if(url==='/api/independent-brain/team-preview')return Response.json({readers:[{name:'Sisko',role:'specialist'},{name:'GEORDI',role:'department chief'},{name:'SCOTTY',role:'overseer'}]});
  if(url==='/api/independent-brain/team'){
   if(teamFails)return Response.json({ok:false,error:'AI_SWITCH_OFF'},{status:409});
   const data=JSON.parse(options.body);
   const answer='SYNTHETIC REVIEWED ANSWER: verify the fictional checklist and expected outcomes.';
   const result={status:'completed',answer,missionId:data.missionId,missionPersisted:true};
   missions.set(data.missionId,{id:data.missionId,status:'completed',result:{status:'completed',answer}});
   return Response.json(result);
  }
  if(url==='/api/independent-brain/missions')return Response.json({missions:readback?[...missions.values()]:[]});
  if(url==='/api/independent-brain/memory'){
   const data=JSON.parse(options.body);
   if(!data.approved||!data.noPrivateDataConfirmed)return Response.json({error:'OWNER_APPROVAL_REQUIRED'},{status:403});
   const note={id:'reviewed-note-1',...data};notes.set(note.id,note);return Response.json({saved:true,note});
  }
  if(url==='/api/independent-brain/memory?agentId=scotty')return Response.json({notes:[...notes.values()]});
  if(url==='/api/hud/command')return Response.json({ok:true,reply:'Original command reply.',provider:'groq'});
  throw Error('Unexpected route: '+url);
 };
 const ctx=vm.createContext({
  document,localStorage,crypto:{randomUUID:()=> 'synthetic-mission-'+(++next)},
  AbortController,AbortSignal,Response,Request,URL,
  setTimeout,clearTimeout,Date,Math,Float32Array,console,
  fetch:fetcher,voiceArmed:true,SCOTTYMemory:{},
  speak:async text=>speech.push(text),command:async()=>{},heard:async()=>{},
  clearVoiceBuffers(){},eyesVoiceCommand:()=>null,loadResources:async()=>{},
  localVoiceBuffers:[],localVoiceSamples:0,localVoiceSending:false,sendVoiceChunk(){}
 });
 ctx.window=ctx;
 vm.runInContext('let speaking=false;',ctx);
 vm.runInContext(read('public/conversation-core.js'),ctx);
 vm.runInContext(read('public/team-brain-hud.js'),ctx);
 vm.runInContext(read('public/conversation.js'),ctx);
 const walk=(n)=>[n,...(n.children||[]).flatMap(walk)];
 return {ctx,els,body,speech,requests,missions,notes,walk,
  run:s=>vm.runInContext(s,ctx),
  wait:()=>new Promise(resolve=>setImmediate(resolve))
 };
}
const prompt='Ask your agents to review a fictional software checklist with expected results.';
const approval='Scotty, approve this team brain request no private data';
test('real typed HUD command routes specialist/chief/SCOTTY request and verifies saved mission in D1 mock',async()=>{
 const h=harness();const pending=h.run('command('+JSON.stringify(prompt)+')');
 await h.wait();
 assert.equal(h.ctx.SCOTTYTeamBrain.awaitingApproval,true);
 assert.equal(h.requests.length,0,'no content can leave before per-request owner approval');
 await h.run('heard('+JSON.stringify(approval)+')');await pending;
 assert.equal(h.requests.filter(x=>x.url==='/api/independent-brain/team').length,1);
 assert.equal(h.requests.filter(x=>x.url==='/api/hud/command').length,0,'never silently fallback to Groq');
 const payload=JSON.parse(h.requests.find(r=>r.url==='/api/independent-brain/team').options.body);
 assert.equal(payload.question,prompt);assert.equal(payload.ownerApproved,true);assert.equal(payload.shareWithCloudflare,true);assert.equal(payload.noPrivateDataConfirmed,true);
 assert.equal(h.ctx.SCOTTYTeamBrain.last.missionVerified,true);
 assert.equal(h.ctx.SCOTTYTeamBrain.last.reviewedMemoryVerified,false,'mission is not automatically promoted into knowledge');
 assert.ok(h.speech.some(x=>x.startsWith('SYNTHETIC REVIEWED ANSWER')));
 assert.ok(h.ctx.SCOTTYConversation.db.history().some(x=>x.role==='assistant'&&x.text.startsWith('SYNTHETIC REVIEWED ANSWER')));
});
test('recognized speech uses same routing with owner voice approval',async()=>{
 const h=harness();const first=h.run('heard('+JSON.stringify('Scotty, '+prompt)+')');
 await h.wait();assert.equal(h.requests.length,0);
 await h.run('heard('+JSON.stringify(approval)+')');await first;
 assert.equal(h.requests[0].url,'/api/independent-brain/team-preview');
 assert.equal(h.ctx.SCOTTYTeamBrain.last.missionVerified,true);
});
test('late or speaker-captured approvals are rejected and stop cancels without sending',async()=>{
 const h=harness(),task=h.run('command('+JSON.stringify(prompt)+')');
 await h.wait();
 await h.run('heard('+JSON.stringify(approval)+',{capturedDuringSpeech:true})');
 assert.equal(h.ctx.SCOTTYTeamBrain.awaitingApproval,true);
 h.run('speaking=true');await h.run('heard('+JSON.stringify(approval)+')');
 assert.equal(h.ctx.SCOTTYTeamBrain.awaitingApproval,true);
 h.run('speaking=false');await h.run('command("stop")');await task;
 assert.equal(h.requests.length,0);
});
test('normal non-team chat retains original route and does not require cloud consent',async()=>{
 const h=harness();await h.run('command("What is this page?")');
 assert.equal(h.requests[0].url,'/api/hud/command');
 assert.equal(h.ctx.SCOTTYTeamBrain.awaitingApproval,false);
});
test('team request canceled by voice never touches Worker or Groq',async()=>{
 const h=harness();const task=h.run('command('+JSON.stringify(prompt)+')');await h.wait();
 await h.run('heard("Scotty, cancel this Team Brain request")');await task;
 assert.equal(h.requests.length,0);
 assert.ok(!h.ctx.SCOTTYTeamBrain.awaitingApproval);
});
test('mission claim remains unverified when independent D1 read-back is absent',async()=>{
 const h=harness({readback:false});const task=h.run('command('+JSON.stringify(prompt)+')');await h.wait();
 await h.run('heard('+JSON.stringify(approval)+')');await task;
 assert.equal(h.ctx.SCOTTYTeamBrain.last.missionVerified,false);
});
test('reviewed long-term knowledge requires an additional explicit approval and read-back',async()=>{
 const h=harness();const task=h.run('command('+JSON.stringify(prompt)+')');await h.wait();
 await h.run('heard('+JSON.stringify(approval)+')');await task;
 assert.equal(h.notes.size,0);
 const review=h.body.children.find(n=>!n.removed&&h.walk(n).some(x=>x.textContent==='Optional · save a reviewed SCOTTY memory'));
 assert.ok(review,'the post-answer review interface is present');
 const all=h.walk(review),checks=all.filter(x=>x.tagName==='input'&&x.type==='checkbox');
 assert.equal(checks.length,2);checks.forEach(c=>c.checked=true);
 const save=all.find(x=>x.tagName==='button'&&x.textContent==='Save reviewed memory');
 assert.ok(save);await save.onclick();
 assert.equal(h.notes.size,1);
 assert.equal(h.ctx.SCOTTYTeamBrain.last.reviewedMemoryVerified,true);
 assert.equal([...h.notes.values()][0].agentId,'scotty');
});
test('Team Brain errors do not trigger an unapproved provider fallback',async()=>{
 const h=harness({teamFails:true});const task=h.run('command('+JSON.stringify(prompt)+')');await h.wait();
 await h.run('heard('+JSON.stringify(approval)+')');await task;
 assert.equal(h.requests.filter(x=>x.url==='/api/hud/command').length,0);
 assert.match(h.els.get('#conversationCaption')?.textContent||h.els.get('#cs')?.textContent||'',/AI_SWITCH_OFF|request failed|ERROR/i);
});
test('production HUD loader includes routing helper ahead of conversation and serves exact asset',()=>{
 const server=read('src/server-cloud-v2.ts');
 assert.ok(server.indexOf('/team-brain-hud.js?v=1')<server.indexOf('/conversation.js?v=18'));
 assert.match(server,/u.pathname==="\/team-brain-hud.js"/);
 const conversation=read('public/conversation.js');
 assert.match(conversation,/SCOTTYTeamBrain\.run\(text/);
 assert.match(conversation,/SCOTTYTeamBrain\?\.handleSpokenConsent\(raw,\{\.\.\.meta,capturedDuringSpeech:/);
});


test('hands-free request, simple approval, dictated correction, save approval and verified spoken receipt',async()=>{
 const h=harness(),task=h.run('heard('+JSON.stringify('Scotty, '+prompt)+')');await h.wait();
 await h.run('heard("yes")');await task;
 assert.equal(h.ctx.SCOTTYTeamBrain.last.missionVerified,true);
 await h.run('heard("Scotty, change the note to Test create edit and delete with expected outcomes")');
 await h.run('heard("Scotty, read the note")');
 assert.ok(h.speech.includes('Test create edit and delete with expected outcomes'));
 await h.run('heard("Scotty, save that")');assert.equal(h.notes.size,0);
 await h.run('heard("yes",{capturedDuringSpeech:true})');assert.equal(h.notes.size,0);
 await h.run('heard("yes")');
 assert.equal(h.notes.size,1);assert.equal([...h.notes.values()][0].content,'Test create edit and delete with expected outcomes');
 assert.equal(h.ctx.SCOTTYTeamBrain.last.reviewedMemoryVerified,true);
 assert.ok(h.speech.some(x=>x.startsWith('Saved and independently verified')));
 await h.run('heard("save that")');await h.run('heard("yes")');assert.equal(h.notes.size,1);
});
test('spoken cancellation and stale memory after a new command cannot write',async()=>{
 const h=harness(),task=h.run('command('+JSON.stringify(prompt)+')');await h.wait();
 await h.run('heard("yes")');await task;
 await h.run('heard("save that")');await h.run('heard("cancel")');assert.equal(h.notes.size,0);
 await h.run('heard("skip")');await h.run('heard("yes")');assert.equal(h.notes.size,0);
});

test('voice team-size correction precedes consent and is forwarded to preview and mission',async()=>{
 const h=harness();const work=h.run('SCOTTYTeamBrain.run('+JSON.stringify(prompt)+',{speak})');
 await h.wait();
 await h.ctx.SCOTTYTeamBrain.handleSpokenConsent('use two departments',{capturedDuringSpeech:true});
 await h.ctx.SCOTTYTeamBrain.handleSpokenConsent('use two departments');
 assert.equal(h.requests.length,0);
 await h.ctx.SCOTTYTeamBrain.handleSpokenConsent('yes');await work;
 for(const path of ['team-preview','team'])assert.equal(JSON.parse(h.requests.find(r=>r.url.endsWith('/'+path)).options.body).teamSize,2);
 assert.ok(h.speech.some(s=>s.includes('GEORDI')));
 h.ctx.SCOTTYTeamBrain.handleSpokenConsent('skip');
});

test('spoken named specialist is included in both approved preview and mission',async()=>{
 const h=harness();const work=h.run('SCOTTYTeamBrain.run('+JSON.stringify(prompt)+',{speak})');await h.wait();
 await h.ctx.SCOTTYTeamBrain.handleSpokenConsent('use specialist Sisko');assert.equal(h.requests.length,0);
 await h.ctx.SCOTTYTeamBrain.handleSpokenConsent('yes');await work;
 for(const path of ['team-preview','team'])assert.match(JSON.parse(h.requests.find(r=>r.url.endsWith('/'+path)).options.body).question,/^Use specialist Sisko:/);
 await h.ctx.SCOTTYTeamBrain.handleSpokenConsent('skip');
});
