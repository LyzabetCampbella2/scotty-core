import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness({migrationReady=false}={}){
 class Node{
  constructor(tag='div',text=''){this.tag=tag;this.textContent=String(text);this.children=[];this.style={};this.listeners={};this.parentNode=null;this.value='';this.checked=false;this.id='';this.href='';}
  appendChild(x){x.parentNode=this;this.children.push(x);return x}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null}
  get firstChild(){return this.children[0]||null}
  setAttribute(k,v){this[k]=String(v)}
  addEventListener(type,fn){this.listeners[type]=fn}
  focus(){}
 }
 const body=new Node('body');
 const find=(filter,n=body)=>filter(n)?n:n.children.map(c=>find(filter,c)).find(Boolean);
 const all=(filter,n=body)=>[...(filter(n)?[n]:[]),...n.children.flatMap(c=>all(filter,c))];
 const document={body,readyState:'complete',createElement:tag=>new Node(tag),createTextNode:text=>new Node('#text',text),
  getElementById:id=>find(n=>n.id===id)};
 const calls=[];
 const answer={providerCalls:0,memoryWrites:0,readers:[{agentId:'agent-1',name:'TEST SPECIALIST',role:'specialist',selectionReason:'Explicit owner choice',
  specialistPlaybook:{focus:'test design',version:'v2',reviewed:false,foundation:'Distinguish the expected result',
   procedure:['Specify input','Record expected outcome'],workedExample:'Synthetic tests are not production evidence',
   boundaries:['Never claim real execution'],candidateReferences:[{publisher:'NIST',verified:false}]},references:[]}]};
 const fetch=async(path,options={})=>{
  calls.push({path,options});
  if(path==='/api/agent-brains/project-operations')return Response.json({ok:true,projects:[{id:'project-bloodpool',name:'Bloodpool'},{id:'project-goldenhour',name:'Golden Hour Creative'}],realDraftsEnabled:false,ansjemEnabled:false,providerConfigured:false});
  if(path==='/api/agent-brains/project-operations/project-bloodpool/brief')return Response.json({ok:true,brief:{asOf:'2026-10-30',overdue:[],upcoming:[{title:'Fictional draft review',dueAt:'2026-11-01'}],decisions:[{goal:'Approve fiction outline',status:'awaiting_approval'}],blocked:[],pendingHandoffs:1,gaps:['No live calendar connection']}});
  if(path==='/api/agent-brains/project-operations/project-bloodpool/progress')return Response.json({ok:true,missions:[{id:'sample-mission',goal:'Fictional outline',status:'review',steps:[{agentId:'agent-one',status:'drafted',deliverable:'Three-scene outline'}]}]});
  if(path==='/api/agent-brains/project-operations/project-bloodpool/team-status')return Response.json({ok:true,members:[{id:'chief-one',name:'Lead Chief',isChief:true},{id:'agent-one',name:'First Agent',isChief:false,chiefId:'chief-one'}]});
  if(path==='/api/agent-brains/project-operations/project-bloodpool/team-presets')return Response.json({ok:true,teams:[],readOnly:true});
  if(path==='/api/agent-brains/project-operations/project-bloodpool/evidence')return Response.json({ok:true,evidence:[{id:'evidence-one',title:'Fictional chapter extract',recipients:['agent-one']} ]});
  if(path==='/api/connectors')return Response.json({ok:true,providers:[{provider:'notion',enabled:false},{provider:'googledocs',enabled:true}],vaultConfigured:false});
  if(path==='/api/folders?structure=1')return Response.json({ok:true,folders:[{id:'folder-1'}],projects:[{id:'project-bloodpool'}]});
  if(path==='/api/independent-brain/operations')return Response.json({memoryReady:true,counts:{completed:7,running:2},total:9,staleRunningSample:[{missionId:'synthetic-running-00001',lastCheckpoint:'2026-10-01'}],quota:null,providerCalls:null});
  if(path==='/api/independent-brain/quality-cases')return Response.json({
   version:'department-acceptance-v1',modelCalls:0,cases:[{
    department:'Quality & Verification',chiefId:'chief-tuvok',specialistId:'agent-tuvok-01',
    question:'Use specialist agent-tuvok-01: Design three synthetic verification cases.',
    synthetic:true,ownerReviewRequired:true,reviewCriteria:['Expected results','Source limits']
   }]});
  if(path==='/api/independent-brain/team-preview')return Response.json(answer);
  if(path==='/api/independent-brain/status')return Response.json({status:'ISOLATED',governanceMigrationReady:migrationReady});
  if(path==='/api/independent-brain/memory?agentId=scotty')return Response.json({notes:[{id:'00000000-0000-0000-0000-000000000001',title:'Synthetic note',content:'A harmless synthetic reminder',scope:'agent',reviewedAt:'2026-10-30',expiresAt:'2026-11-30'}]});
  if(path==='/api/independent-brain/readiness')return Response.json({ready:false});
  if(path==='/api/system/status')return Response.json({status:'accessible'});
  return Response.json({ok:true,notes:[]});
 };
 const window={location:{href:'/'}};
 const script=fs.readFileSync(new URL('../public/brain-operations-panel.js',import.meta.url),'utf8');
 vm.runInNewContext(script,{document,window,fetch,Response,Date,Math,JSON});
 window.SCOTTYBrainOperations.open();
 return {body,all,find,calls,readiness:migrationReady};
}
const byLabel=(h,text)=>h.find(n=>n.tag==='button'&&n.textContent===text);
const text=(n)=>n.textContent+' '+n.children.map(text).join(' ');

test('knowledge preview requires opt-in and renders only announced specialist playbooks',async()=>{
 const h=harness();
 const trigger=byLabel(h,'Preview selected agents and knowledge');
 const task=h.find(n=>n.tag==='input'&&n.placeholder==='Synthetic assignment (no private or client information)');
 task.value='Use specialist agent-1: Review a fictional checklist';
 await trigger.listeners.click();
 assert.equal(h.calls.filter(x=>x.path.includes('team-preview')).length,0);
 const label=h.find(n=>n.tag==='label'&&text(n).includes('I approve sending this non-private preview question'));
 assert.ok(label);
 label.children.find(x=>x.tag==='input').checked=true;
 await trigger.listeners.click();
 assert.equal(h.calls.filter(x=>x.path.includes('team-preview')).length,1);
 const rendered=text(h.body);
 assert.match(rendered,/Explicit owner choice/);
 assert.match(rendered,/Synthetic tests are not production evidence/);
 assert.match(rendered,/Authored methodology — not verified field facts/);
});
test('missing D1 governance migration makes notes read-only and hides all mutation controls',async()=>{
 const h=harness({migrationReady:false});
 const trigger=byLabel(h,'Read reviewed D1 notes');
 await trigger.listeners.click();
 const rendered=text(h.body);
 assert.match(rendered,/edits disabled/);
 assert.match(rendered,/A harmless synthetic reminder/);
 assert.equal(h.all(n=>n.tag==='button'&&['correct','replace','expire','archive','delete'].includes(n.textContent)).length,0);
 assert.equal(h.calls.filter(x=>x.path.includes('memory-change')).length,0);
});
test('a positive governance readiness allows preview controls but performs no mutation on load',async()=>{
 const h=harness({migrationReady:true});
 await byLabel(h,'Read reviewed D1 notes').listeners.click();
 assert.ok(byLabel(h,'correct'));
 assert.ok(byLabel(h,'delete'));
 assert.equal(h.calls.filter(x=>x.path.includes('memory-change')).length,0);
});
test('recovery display distinguishes dated last verified backup from live provider telemetry',()=>{
 const h=harness();
 const displayed=text(h.body);
 assert.match(displayed,/October 18, 2026/);
 assert.match(displayed,/November 7, 2026/);
 assert.match(displayed,/not a live Render control-plane feed/);
});

test('25-department acceptance section loads synthetic cases without inference or memory writes',async()=>{
 const h=harness();
 const b=byLabel(h,'Load 25 practical department acceptance cases (read-only)');
 assert.ok(b);
 await b.listeners.click();
 assert.equal(h.calls.filter(c=>c.path==='/api/independent-brain/quality-cases').length,1);
 assert.equal(h.calls.filter(c=>c.path.includes('/team')).length,0);
 assert.match(text(h.body),/Quality & Verification/);
 assert.match(text(h.body),/Not run \/ owner review required/);
});

test('owner operations panel displays actual checkpoint counts and unknown quota',async()=>{
 const h=harness();
 await byLabel(h,'Refresh readiness (read-only)').listeners.click();
 assert.ok(h.calls.some(c=>c.path==='/api/independent-brain/operations'));
 const view=text(h.body);
 assert.match(view,/Persisted mission count/);
 assert.match(view,/Stale missions needing manual review/);
 assert.match(view,/synthetic-running-00001/);
 assert.match(view,/Unavailable — check Cloudflare dashboard/);
 assert.equal(h.calls.filter(c=>c.path.includes('/team')).length,0);
});

test('read-only Project Command Center loads real projects and owner-scoped briefing without any writes',async()=>{
 const h=harness();
 const load=byLabel(h,'Load my real project list');
 assert.ok(load);
 await load.listeners.click();
 assert.match(text(h.body),/Bloodpool/);
 const inspect=byLabel(h,'Inspect selected project team, missions and briefing');
 assert.ok(inspect);
 const select=h.find(n=>n.tag==='select'&&n['aria-label']==='Choose a real SCOTTY project');
 assert.ok(select);
 select.value='project-bloodpool';
 await inspect.listeners.click();
 const shown=text(h.body);
 assert.match(shown,/Fictional draft review/);
 assert.match(shown,/Three-scene outline/);
 assert.match(shown,/First Agent/);
 assert.match(shown,/Fictional chapter extract/);
 assert.ok(h.calls.filter(c=>c.path.startsWith('/api/agent-brains/project-operations/')).every(c=>!c.options.body));
 assert.equal(h.calls.filter(c=>c.path.startsWith('/api/independent-brain/team')).length,0);
});
test('read-only connector and folder status never performs a third-party action',async()=>{
 const h=harness();
 await byLabel(h,'Check connector configuration (read-only)').listeners.click();
 await byLabel(h,'Check original folder and document database (read-only)').listeners.click();
 assert.match(text(h.body),/Configured/);
 assert.match(text(h.body),/Available folders/);
 assert.ok(h.calls.filter(c=>c.path.startsWith('/api/connectors')||c.path.startsWith('/api/folders')).every(c=>!c.options.body));
});

test('preferred team save is blocked without review and never auto-grants agents',async()=>{
 const h=harness();
 await byLabel(h,'Load my real project list').listeners.click();
 const picker=h.find(n=>n.tag==='select'&&n['aria-label']==='Choose a real SCOTTY project');
 picker.value='project-bloodpool';
 await byLabel(h,'Manage preferred project team (owner approval required)').listeners.click();
 for(let i=0;i<8;i++)await Promise.resolve();
 const button=byLabel(h,'Save owner-reviewed team preset');
 assert.ok(button);
 await button.listeners.click();
 assert.equal(h.calls.filter(c=>c.options.method==='POST'&&c.path.includes('/team-presets')).length,0);
 const proposed=h.find(n=>n.tag==='input'&&n.placeholder==='Team name (example: Manuscript Review Team)');
 assert.ok(proposed);proposed.value='Manuscript Review Team';
 const lead=h.find(n=>n.tag==='select'&&n['aria-label']==='Lead project chief');
 lead.value='chief-one';
 const choose=h.all(n=>n.tag==='label'&&(/Lead Chief|First Agent/.test(text(n))));
 assert.equal(choose.length,2);
 for(const lab of choose)lab.children.find(x=>x.tag==='input').checked=true;
 const consent=h.find(n=>n.tag==='label'&&text(n).includes('I reviewed the exact team and confirm'));
 assert.ok(consent);consent.children.find(n=>n.tag==='input').checked=true;
 await button.listeners.click();
 const writes=h.calls.filter(c=>c.options.method==='POST'&&c.path.endsWith('/team-presets'));
 assert.equal(writes.length,1);
 const payload=JSON.parse(writes[0].options.body);
 assert.deepEqual(payload.agentIds,['chief-one','agent-one']);
 assert.equal(payload.reviewed,true);
 assert.equal(payload.approved,true);
 assert.equal(payload.expectedRevision,0);
 assert.equal(writes[0].options.headers['x-scotty-csrf'],'1');
 assert.equal(h.calls.filter(c=>c.path.includes('/independent-brain/team')).length,0);
});
