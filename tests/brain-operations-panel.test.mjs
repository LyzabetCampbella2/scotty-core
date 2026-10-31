import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness({migrationReady=false,recoveryAuditReady=true}={}){
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
  if(path==='/api/agent-brains/project-operations/project-bloodpool/team-presets')return Response.json({ok:true,teams:[{name:'Creative Team',agentIds:['chief-one','agent-one'],leadChiefId:'chief-one',revision:2,active:true}],readOnly:true});
  if(path==='/api/agent-brains/project-operations/project-bloodpool/plan')return Response.json({ok:true,id:'fake-plan-id',status:'awaiting_approval'});
  if(path==='/api/agent-brains/project-operations/project-bloodpool/evidence')return Response.json({ok:true,evidence:[{id:'evidence-one',title:'Fictional chapter extract',recipients:['agent-one']} ]});
  if(path==='/api/workspace/project?id=project-bloodpool')return Response.json({ok:true,
   project:{id:'project-bloodpool'},files:[{id:'file-12345678',name:'fictional-chapter.pdf',mimeType:'application/pdf'}]});
  if(path==='/api/agent-brains/project-operations/project-bloodpool/local-file-evidence'){
   const data=JSON.parse(options.body||'{}');
   if(data.action==='preview')return Response.json({ok:true,previewToken:'synthetic-review-token',
    title:'fictional-chapter.pdf',kind:'pdf',body:'Synthetic extracted evidence text',sha256:'sha-123',
    referenceOnly:false,note:'Dated text snapshot'});
   return Response.json({ok:true,id:'evidence-sample-1',evidenceReadbackVerified:true,
    limitation:'Text only, no original PDF transferred'});
  }
  if(path==='/api/connectors')return Response.json({ok:true,providers:[{provider:'notion',enabled:false},{provider:'googledocs',enabled:true}],vaultConfigured:false});
  if(path==='/api/voice/status')return Response.json({ok:true,provider:'Piper AWB Scottish',configured:true,ready:false,code:'voice_worker_unreachable'});
  if(path==='/api/connections')return Response.json({ok:true,connections:{google:{status:'connected',needsReconnect:false,refreshCapable:true,updatedAt:'2026-10-30T00:00:00Z',scopes:['https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/drive.file']}}});
  if(path==='/api/folders?structure=1')return Response.json({ok:true,folders:[{id:'folder-1'}],projects:[{id:'project-bloodpool'}]});
  if(path==='/api/independent-brain/mission-incidents')return Response.json({
   version:'mission-recovery-audit-v1',readOnly:true,containsPrivateOutputs:false,incidents:[
    {missionId:'synthetic-running-00001',eventId:'synthetic-audit-00001',
     completedAt:'2026-10-30T22:00:00.000Z',previousStatus:'running',newStatus:'incomplete',preservedStageCount:2}
   ]});
  if(path==='/api/independent-brain/mission-recovery'){
   const input=JSON.parse(options.body||'{}');
   if(input.stage==='preview')return Response.json({stage:'preview',missionId:input.missionId,
    expectedUpdatedAt:'2026-10-01T00:00:00.000Z',staleMinutes:42000,
    proposedStatus:'incomplete',canApply:recoveryAuditReady,auditMigrationReady:recoveryAuditReady,auditMigrationReason:recoveryAuditReady?null:'MISSION_RECOVERY_AUDIT_MIGRATION_REQUIRED',warning:'Investigate the worker before closing'});
   return Response.json({missionId:input.missionId,status:'incomplete',verified:true,preservedStages:2,
    modelCalls:0,retryAttempted:false,deleted:false});
  }
  if(path==='/api/independent-brain/operations')return Response.json({memoryReady:true,counts:{completed:7,running:2},total:9,staleRunningTotal:1,requiresOwnerReview:1,recoveryAudit:{ready:recoveryAuditReady,version:'mission-recovery-audit-v1'},staleRunningSample:[{missionId:'synthetic-running-00001',lastCheckpoint:'2026-10-01'}],quota:null,providerCalls:null});
  if(path==='/api/independent-brain/quality-cases')return Response.json({
   version:'department-acceptance-v1',modelCalls:0,cases:[{
    department:'Quality & Verification',chiefId:'chief-tuvok',specialistId:'agent-tuvok-01',
    question:'Use specialist agent-tuvok-01: Design three synthetic verification cases.',
    synthetic:true,ownerReviewRequired:true,reviewCriteria:['Expected results','Source limits']
   }]});
  if(path==='/api/independent-brain/team-preview')return Response.json(answer);
  if(path==='/api/independent-brain/status')return Response.json({status:'ISOLATED',governanceMigrationReady:migrationReady,recoveryAuditMigrationReady:true,recoveryAuditReason:null});
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
 assert.match(view,/Stale missions/);
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

test('uploaded PDF preview cannot attach without explicit source and recipient approval',async()=>{
 const h=harness();
 await byLabel(h,'Load my real project list').listeners.click();
 const project=h.find(n=>n.tag==='select'&&n['aria-label']==='Choose a real SCOTTY project');
 project.value='project-bloodpool';
 await byLabel(h,'Attach uploaded PDF, document or image evidence').listeners.click();
 await byLabel(h,'List uploaded files and approved recipients').listeners.click();
 const select=h.find(n=>n.tag==='select'&&n['aria-label']==='Uploaded project file');
 select.value='file-12345678';
 await byLabel(h,'Preview file content or image reference').listeners.click();
 assert.match(text(h.body),/Synthetic extracted evidence text/);
 const attach=byLabel(h,'Attach owner-approved project evidence');
 await attach.listeners.click();
 assert.equal(h.calls.filter(x=>x.path.includes('local-file-evidence')&&JSON.parse(x.options.body||'{}').action==='attach').length,0);
 const chiefLabel=h.find(n=>n.tag==='label'&&text(n).includes('Allow Lead Chief'));
 assert.ok(chiefLabel);chiefLabel.children.find(n=>n.tag==='input').checked=true;
 const approval=h.find(n=>n.tag==='label'&&text(n).includes('I reviewed this exact file preview'));
 approval.children.find(n=>n.tag==='input').checked=true;
 await attach.listeners.click();
 const writes=h.calls.filter(x=>x.path.includes('local-file-evidence')&&JSON.parse(x.options.body||'{}').action==='attach');
 assert.equal(writes.length,1);
 assert.deepEqual(JSON.parse(writes[0].options.body).agentIds,['chief-one']);
 assert.equal(writes[0].options.headers['x-scotty-csrf'],'1');
 assert.equal(h.calls.filter(x=>x.path.includes('/independent-brain/team')).length,0);
});

test('preferred team can prepare a multi-step mission with no automatic execution or source sharing',async()=>{
 const h=harness();
 await byLabel(h,'Load my real project list').listeners.click();
 const project=h.find(n=>n.tag==='select'&&n['aria-label']==='Choose a real SCOTTY project');
 project.value='project-bloodpool';
 await byLabel(h,'Manage preferred project team (owner approval required)').listeners.click();
 for(let n=0;n<10;n++)await Promise.resolve();
 const goal=h.find(n=>n.tag==='input'&&n.placeholder==='New goal for this preferred project team');
 assert.ok(goal);goal.value='Prepare three fictional scene outlines';
 const propose=byLabel(h,'Prepare mission plan from preferred team');
 assert.ok(propose);
 await propose.listeners.click();
 assert.equal(h.calls.filter(x=>x.path.endsWith('/plan')&&x.options.method==='POST').length,0);
 const checkbox=h.find(n=>n.tag==='label'&&text(n).includes('I authorize saving a non-executing multi-step mission draft'));
 assert.ok(checkbox);checkbox.children.find(n=>n.tag==='input').checked=true;
 await propose.listeners.click();
 const posts=h.calls.filter(x=>x.path.endsWith('/plan')&&x.options.method==='POST');
 assert.equal(posts.length,1);
 const body=JSON.parse(posts[0].options.body);
 assert.equal(body.goal,'Prepare three fictional scene outlines');
 assert.deepEqual(body.agentIds,['chief-one','agent-one']);
 assert.equal(body.realDrafts,false);
 assert.deepEqual(body.evidenceIds,[]);
 assert.equal(posts[0].options.headers['x-scotty-csrf'],'1');
});

test('native Google OAuth panel distinguishes granted scopes from unverified Gmail read access',async()=>{
 const h=harness();
 await byLabel(h,'Verify native Google Gmail, Calendar and Drive scope grants').listeners.click();
 const rendered=text(h.body);
 assert.match(rendered,/Gmail send/);
 assert.match(rendered,/Gmail read/);
 assert.match(rendered,/Calendar event create\/update/);
 assert.match(rendered,/Not confirmed/);
 assert.match(rendered,/Scope grants confirm recorded authorization/);
 const calls=h.calls.filter(c=>c.path==='/api/connections');
 assert.equal(calls.length,1);
 assert.ok(!calls[0].options.body);
});

test('voice health panel reports truthful provider readiness without calling synthesis or microphone',async()=>{
 const h=harness();
 await byLabel(h,'Inspect live Scottish TTS readiness and local voice state').listeners.click();
 const v=text(h.body);
 assert.match(v,/Piper AWB Scottish/);
 assert.match(v,/voice_worker_unreachable/);
 assert.match(v,/For iPad acceptance/);
 const reads=h.calls.filter(x=>x.path==='/api/voice/status');
 assert.equal(reads.length,1);
 assert.equal(reads[0].options.method,'GET');
 assert.equal(h.calls.filter(x=>x.path.includes('/api/voice/speak')||x.path.includes('/api/tts')).length,0);
});

test('stale mission monitor requires independent owner review and one deliberate recovery call',async()=>{
 const h=harness();
 for(let i=0;i<60;i++)await Promise.resolve();
 const review=byLabel(h,'Review stale mission — no retry');
 assert.ok(review);
 assert.equal(h.calls.filter(x=>x.path.includes('/mission-recovery')).length,0);
 await review.listeners.click();
 assert.equal(h.calls.filter(x=>x.path.includes('/mission-recovery')).length,1);
 assert.equal(JSON.parse(h.calls.find(x=>x.path.includes('/mission-recovery')).options.body).stage,'preview');
 const apply=byLabel(h,'Confirm this exact stale checkpoint');
 assert.ok(apply);
 await apply.listeners.click();
 assert.equal(h.calls.filter(x=>x.path.includes('/mission-recovery')).length,1);
 const check=h.find(n=>n.tag==='label'&&text(n).includes('I investigated mission synthetic-running'));
 assert.ok(check);
 check.children.find(n=>n.tag==='input').checked=true;
 await apply.listeners.click();
 const posts=h.calls.filter(x=>x.path.includes('/mission-recovery'));
 assert.equal(posts.length,2);
 const payload=JSON.parse(posts[1].options.body);
 assert.equal(payload.stage,'apply');
 assert.equal(payload.expectedUpdatedAt,'2026-10-01T00:00:00.000Z');
 assert.equal(payload.ownerApproved,true);
 assert.equal(payload.reviewAcknowledged,true);
 assert.equal(posts[1].options.headers['x-scotty-csrf'],'1');
 assert.match(text(h.body),/Verified incomplete/);
 assert.equal(h.calls.filter(x=>x.path.includes('/api/independent-brain/team')).length,0);
});

test('owner HUD recovery incident history is opt-in, redacted, and read only',async()=>{
 const h=harness();
 for(let n=0;n<50;n++)await Promise.resolve();
 assert.equal(h.calls.filter(c=>c.path.includes('/mission-incidents')).length,0);
 assert.match(text(h.body),/Recovery audit migration/);
 const btn=byLabel(h,'Inspect redacted recovery audit (read-only)');
 assert.ok(btn);
 await btn.listeners.click();
 const reads=h.calls.filter(c=>c.path==='/api/independent-brain/mission-incidents');
 assert.equal(reads.length,1);
 assert.equal(reads[0].options.method,'GET');
 const output=text(h.body);
 assert.match(output,/synthetic-audit-00001/);
 assert.match(output,/Preserved stages/);
 assert.match(output,/No prompt, files, private notes/);
 assert.equal(h.calls.filter(c=>c.options.method==='POST'&&c.path.includes('/mission-recovery')).length,0);
});

test('missing D1 recovery audit migration hides confirmation even after owner previews stale mission',async()=>{
 const h=harness({recoveryAuditReady:false});
 for(let n=0;n<60;n++)await Promise.resolve();
 assert.match(text(h.body),/NOT VERIFIED — recovery apply must remain disabled/);
 const preview=byLabel(h,'Review stale mission — no retry');
 assert.ok(preview);await preview.listeners.click();
 assert.equal(byLabel(h,'Confirm this exact stale checkpoint'),undefined);
 assert.match(text(h.body),/MISSION_RECOVERY_AUDIT_MIGRATION_REQUIRED/);
 assert.equal(h.calls.filter(c=>c.path.includes('/mission-recovery')&&
  JSON.parse(c.options.body||'{}').stage==='apply').length,0);
});
