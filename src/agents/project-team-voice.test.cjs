const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('public/hud/project-operations.js','utf8');
const pause=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const replies=[],requests=[],listeners={},frameWindow={},status={textContent:''};
 let now=Date.now(),revision=1,delay=null;
 const agents=[{id:'chief',name:'Chief Alpha',isChief:true,eligible:true,reason:'Permitted chief',specialty:'Review',assignments:[],work:[],records:[]},{id:'writer',name:'Writer Beta',isChief:false,eligible:true,reason:'Writing expertise',specialty:'Writing',assignments:[],work:[],records:[]}];
 agents.push({...agents[0],id:'chief-two',name:'Chief Gamma'});
 const projects=[{id:'writing',name:'Writing project'},{id:'other',name:'Other project'}];
 const mission={id:'00000000-0000-4000-8000-000000000001',goal:'Outline review',status:'awaiting_approval',steps:[]};
 const context={console,URL,URLSearchParams,Response,setTimeout,clearTimeout,Date:class extends Date{static now(){return now;}},location:{origin:'https://scotty.test'},document:{readyState:'loading',addEventListener(){},getElementById:id=>id==='cs'?status:null,querySelector:s=>s.includes('iframe')?{contentWindow:frameWindow}:null},addEventListener:(name,fn)=>{listeners[name]=fn;},SCOTTYConversation:{db:{state:{active:'existing-thread'}},getRun:()=>17,legacyResponse:async(text,token,thread)=>replies.push({text,token,thread})}};
 context.window=context;
 context.fetch=async(path,options={})=>{
  const u=new URL(path,context.location.origin),b=options.body?JSON.parse(options.body):null;
  requests.push({path:u.pathname,query:u.search,body:b,options});
  if(delay&&u.pathname.endsWith('/team')&&b){const d=delay;delay=null;await d;}
  let d={ok:true};const kind=u.pathname.split('/').at(-1);
  if(u.pathname==='/api/agent-brains/project-operations')d={ok:true,projects,realDraftsEnabled:false};
  else if(u.pathname==='/api/agent-brains')d={ok:true,agents};
  else if(kind==='team')d={ok:true,candidates:agents,recommended:['writer','chief'],note:'Owner editable recommendation'};
  else if(kind==='team-status')d={ok:true,members:agents,decisions:[],pendingHandoffs:0,blocked:[]};
  else if(kind==='brief')d={ok:true,brief:{overdue:[],upcoming:[],decisions:[],pendingHandoffs:0,blocked:[],connectedAppItems:[],gaps:[]}};
  else if(kind==='weekly')d={ok:true,review:{changedWork:[],unfinished:[],overdue:[],suggestedNextSteps:[]}};
  else if(kind==='progress')d={ok:true,missions:[{...mission,revision}]};
  else if(kind==='documents'&&b.action==='list')d={ok:true,items:[{id:'sample_document',title:'Story notes'}],note:'Read only'};
  else if(kind==='documents'&&b.action==='preview')d={ok:true,previewToken:'token',title:'Story notes',reference:'Google Docs',body:'Approved sample text only',note:'Read-only snapshot'};
  else if(kind==='evidence'&&!b)d={ok:true,evidence:[{id:'evidence-1',title:'Reviewed outline',body:'Sample',recipients:['writer','chief']}]};
  else if(kind==='development'&&!b)d={ok:true,agents};
  else if(kind==='collaboration-requests')d={ok:true,requests:[{id:'request-1',title:'Review outline',project_id:'writing',status:'pending',source_agent_id:'writer',recipient_agent_id:'chief',summary:'Share permitted draft'},{id:'wrong-project',title:'Private other handoff',project_id:'other',status:'pending'}]};
  return Response.json(d);
 };
 vm.runInNewContext(source,context,{filename:'project-operations.js'});
 const say=async text=>{const before=replies.length,handled=context.SCOTTYProjectTeamVoice.execute(text);if(!handled)return false;for(let i=0;i<100&&replies.length===before;i++)await pause();assert.ok(replies.length>before,'No voice response for '+text);return replies.at(-1).text;};
 const confirm=()=>replies.at(-1).text.match(/Say (confirm project \w+ \d+) to confirm/)[1];
 return {context,replies,requests,say,confirm,agents,mission,projects,mutations:()=>requests.filter(x=>x.body&&!['team','documents'].includes(x.path.split('/').at(-1))||x.body?.action==='attach'),expire:()=>now+=180001,revision:n=>revision=n,delay:promise=>delay=promise,projectMessage:id=>listeners.message({origin:'https://scotty.test',source:frameWindow,data:{type:'scotty:project-selected',project:id}})};
}
async function select(f){await f.say('Use my writing project');}
async function plan(f){await select(f);await f.say('Recommend agents for review my outline');await f.say('Use agents one and two');await f.say('Lead chief one');await f.say('Save project plan');}
test('spoken project choice, brief, weekly and help reuse existing conversation without writes',async()=>{
 const f=fixture();await f.say('List my projects');await select(f);assert.match(await f.say('Read my daily briefing'),/0 overdue/);assert.match(await f.say('Read my weekly project review'),/weekly review/);await f.say('Project voice help');assert.equal(f.requests.some(x=>x.body),false);assert.ok(f.replies.every(x=>x.token===17&&x.thread==='existing-thread'));assert.equal(await f.say('Unrelated conversation'),false);
});
test('team plan requires exact one-use confirmation; no model execution or implicit approval',async()=>{
 const f=fixture();await plan(f);assert.equal(f.mutations().length,0);const phrase=f.confirm();assert.match(await f.say('yes'),/general yes cannot/);assert.equal(f.mutations().length,0);await f.say(phrase);assert.equal(f.mutations().length,1);const b=f.mutations()[0].body;assert.equal(b.realDrafts,false);assert.deepEqual(b.agentIds,['chief','writer']);assert.equal(f.mutations()[0].options.headers['X-Scotty-CSRF'],'1');assert.equal(f.mutations()[0].options.credentials,'same-origin');await f.say(phrase);assert.equal(f.mutations().length,1);assert.match(await f.say('Generate next project draft'),/disabled/);
});
test('project selection and exact confirmation expiry invalidate writes',async()=>{
 const f=fixture();await plan(f);const stale=f.confirm();await f.say('Use project Other project');await f.say(stale);assert.equal(f.mutations().length,0);await plan(f);const expired=f.confirm();f.expire();assert.match(await f.say(expired),/No matching/);assert.equal(f.mutations().length,0);
});
test('same-origin iframe project changes invalidate pending voice consent',async()=>{
 const f=fixture();await plan(f);const phrase=f.confirm();f.projectMessage('other');await f.say(phrase);assert.equal(f.mutations().length,0);
});
test('document sharing requires preview, explicit named recipients and separate confirmation',async()=>{
 const f=fixture();await select(f);await f.say('List my Google Docs');await f.say('Preview document one');assert.match(await f.say('Attach document'),/choose explicit/);await f.say('Share with agents two');await f.say('Attach document');const phrase=f.confirm();assert.equal(f.mutations().length,0);await f.say(phrase);const post=f.requests.find(x=>x.body?.action==='attach');assert.deepEqual(post.body.agentIds,['writer']);assert.equal(post.body.previewToken,'token');assert.equal(post.body.approved,true);assert.ok(f.requests.filter(x=>x.path.endsWith('/documents')).every(x=>['list','preview','attach'].includes(x.body.action)));
});
test('dictated project notes retain original text and explicit source recipients',async()=>{
 const f=fixture();await select(f);await f.say('Project note is Keep this ending unresolved');await f.say('Note title is Ending note');await f.say('Share with agents one');await f.say('Attach project note');await f.say(f.confirm());const b=f.mutations()[0].body;assert.equal(b.kind,'note');assert.equal(b.body,'Keep this ending unresolved');assert.deepEqual(b.agentIds,['chief']);
});
test('development records are scoped to the selected existing member and require approval',async()=>{
 const f=fixture();await select(f);await f.say('List agent records');await f.say('Choose record agent two');await f.say('Project correction is Cite the dated source');await f.say('Save development record');assert.equal(f.mutations().length,0);await f.say(f.confirm());assert.equal(f.mutations()[0].body.agentId,'writer');assert.equal(f.mutations()[0].body.kind,'correction');assert.equal(f.mutations()[0].body.approved,true);
});
test('mission approval checks exact revision again before dispatch',async()=>{
 const f=fixture();await select(f);await f.say('Read mission progress');await f.say('Choose mission one');await f.say('Approve selected mission');const phrase=f.confirm();f.revision(2);assert.match(await f.say(phrase),/Mission changed/);assert.equal(f.mutations().length,0);
});
test('mission approval and start are separate confirmations and never run a model',async()=>{
 const f=fixture();await select(f);await f.say('Read mission progress');await f.say('Choose mission one');await f.say('Approve selected mission');await f.say(f.confirm());assert.equal(f.mutations()[0].body.action,'approve');assert.equal(f.mutations().length,1);await f.say('Start selected mission');await f.say(f.confirm());assert.equal(f.mutations()[1].body.action,'start-coordination');assert.ok(!f.requests.some(x=>x.body?.action==='run-draft'));
});
test('handoff list filters other projects and approval binds one chosen request',async()=>{
 const f=fixture();await select(f);assert.doesNotMatch(await f.say('List handoff approvals'),/Private other/);await f.say('Choose handoff one');await f.say('Approve selected handoff');await f.say(f.confirm());assert.ok(f.mutations()[0].path.endsWith('/request-1'));assert.equal(f.mutations()[0].body.decision,'approved');
});
test('membership grant names one existing agent and waits for specific permission confirmation',async()=>{
 const f=fixture();await select(f);await f.say('List available agents');await f.say('Add agent Writer Beta to project');assert.equal(f.mutations().length,0);await f.say(f.confirm());assert.deepEqual(f.mutations()[0].body,{agentId:'writer',decision:'grant'});assert.ok(f.mutations()[0].path.includes('/collaboration/writing/grants'));
});
test('another command or explicit cancellation invalidates a staged write',async()=>{
 const f=fixture();await plan(f);let phrase=f.confirm();await f.say('Read my daily briefing');await f.say(phrase);assert.equal(f.mutations().length,0);await plan(f);phrase=f.confirm();await f.say('Cancel project action');await f.say(phrase);assert.equal(f.mutations().length,0);
});
test('late recommendation cannot replace current project state or stage a stale plan',async()=>{
 const f=fixture();await select(f);let release;f.delay(new Promise(r=>release=r));f.context.SCOTTYProjectTeamVoice.execute('Recommend agents for stale goal');await pause();await f.say('Use project Other project');release();await pause();await pause();assert.match(await f.say('Save project plan'),/Describe the goal/);assert.equal(f.mutations().length,0);
});
test('specific evidence selection and chief comparison remain draft choices until confirmed',async()=>{
 const f=fixture();await select(f);await f.say('Recommend agents for compare evidence');await f.say('Compare chiefs');await f.say('Use agents one and three');await f.say('Lead chief one');await f.say('List project evidence');await f.say('Use evidence one');await f.say('Save project plan');await f.say(f.confirm());assert.equal(f.mutations()[0].body.chiefReview,true);assert.deepEqual(f.mutations()[0].body.evidenceIds,['evidence-1']);assert.equal(f.mutations()[0].body.realDrafts,false);
});

test('chief comparison refuses a non-chief before preparing confirmation',async()=>{const f=fixture();await select(f);await f.say('Recommend agents for compare evidence');await f.say('Compare chiefs');assert.match(await f.say('Save project plan'),/at least two explicitly selected project chiefs/);assert.equal(f.mutations().length,0);});
test('blanket project approvals are consumed and do not reach the legacy command path',async()=>{const f=fixture();await select(f);assert.match(await f.say('Approve all project decisions'),/Blanket project approval is not supported/);assert.equal(f.mutations().length,0);});
test('draft release checks exact output again and never reuses a development lesson as review text',async()=>{
 const f=fixture();f.mission.status='needs_review';f.mission.steps=[{id:'draft',deliverable:'Outline',output:{text:'Original draft',unresolved:[]}}];await select(f);await f.say('Read mission progress');await f.say('Choose mission one');await f.say('Read selected draft');assert.match(await f.say('Release selected draft'),/review note/);await f.say('Draft review note is Approved exact original');await f.say('Release selected draft');const phrase=f.confirm();f.mission.steps[0].output={text:'Changed draft',unresolved:[]};assert.match(await f.say(phrase),/Draft changed/);assert.equal(f.mutations().length,0);
});

test('spoken confirmation numbers work and a conversation-thread change cancels pending consent',async()=>{
 const f=fixture();await plan(f);await f.say(f.confirm().replace(/1$/,'one'));assert.equal(f.mutations().length,1);await plan(f);const phrase=f.confirm();f.context.SCOTTYConversation.db.state.active='different-thread';await f.say(phrase);assert.equal(f.mutations().length,1);
});

test('confirmation is not submitted during Scotty speech and global stop clears pending consent',async()=>{const f=fixture();await plan(f);const phrase=f.confirm();f.context.speaking=true;assert.equal(f.context.SCOTTYProjectTeamVoice.execute(phrase),true);await pause();assert.equal(f.mutations().length,0);f.context.speaking=false;assert.equal(f.context.SCOTTYProjectTeamVoice.execute('stop'),false);await f.say(phrase);assert.equal(f.mutations().length,0);});
