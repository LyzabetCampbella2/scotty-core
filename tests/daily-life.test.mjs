import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto} from 'node:crypto';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=p=>stripTypeScriptTypes(read(p)).replace(/^import .*;\n/gm,'').replace(/export /g,'');
function model(){const c=vm.createContext({});vm.runInContext(source('src/daily/model.ts'),c);return c}
test('local time conversion rejects nonexistent and invalid dates and chooses a consistent repeated hour',()=>{
 const c=model();assert.equal(c.localInstant('2027-01-10T08:00','America/Los_Angeles').toISOString(),'2027-01-10T16:00:00.000Z');
 assert.throws(()=>c.localInstant('2027-03-14T02:30','America/Los_Angeles'),/clocks change/);
 assert.throws(()=>c.localInstant('2027-02-30T10:00','UTC'));
 assert.equal(c.localInstant('2027-11-07T01:30','America/Los_Angeles').toISOString(),'2027-11-07T08:30:00.000Z');
 assert.throws(()=>c.zone('Fake/Zone'),/valid time zone/);
});
test('daily and weekly recurrence preserve local clock time and skip missed occurrences',()=>{
 const c=model();assert.equal(c.nextDue(new Date('2027-03-13T16:00Z'),'daily','America/Los_Angeles',new Date('2027-03-13T16:01Z')).toISOString(),'2027-03-14T15:00:00.000Z');
 assert.equal(c.nextDue(new Date('2027-03-01T16:00Z'),'weekly','America/Los_Angeles',new Date('2027-03-18T00:00Z')).toISOString(),'2027-03-22T15:00:00.000Z');
 assert.equal(c.nextDue(new Date(),'none','UTC'),null);
 assert.throws(()=>c.normalizeSchedule({title:'Old',dueAt:'2020-01-01T00:00Z'}),/future/);
});
test('calendar adjacency is free and suggested alternatives preserve duration without overlap',()=>{
 const c=model(),event={start:'2027-01-01T10:00Z',end:'2027-01-01T11:00Z'};
 assert.equal(c.overlap(event,{start:event.end,end:'2027-01-01T12:00Z'}),false);
 assert.equal(c.overlap(event,{start:'2027-01-01T10:30Z',end:'2027-01-01T12:00Z'}),true);
 const alternatives=c.suggestions(new Date(event.start),new Date(event.end),[event]);assert.equal(alternatives.length,3);for(const a of alternatives){assert.equal(c.overlap(a,event),false);assert.equal(new Date(a.end)-new Date(a.start),3600000)}
});
test('energy plans respect budgets, effort, completion, priority and local due dates',()=>{
 const c=model(),tasks=[{title:'High effort',status:'queued',priority:'critical',energy:'high',estimateMinutes:30},{title:'Done',status:'completed',estimateMinutes:5},{title:'Small',status:'queued',estimateMinutes:20},{title:'Overdue locally',status:'queued',dueAt:'2027-01-02T02:00Z',estimateMinutes:20}];
 const p=c.planTasks(tasks,'light','2027-01-01','America/Los_Angeles');assert.equal(p.selected.length,2);assert.equal(p.selected[0].title,'Overdue locally');assert.equal(p.minutes,40);assert.equal(p.deferred.length,1);
 for(const e of ['normal','ambitious']){const p=c.planTasks(Array.from({length:20},(_,i)=>({title:String(i),status:'queued',estimateMinutes:25})),e,'2027-01-01');assert.ok(p.minutes<=p.budget);assert.equal(p.selected.length,e==='normal'?4:6)}
});
test('focus validation requires a single goal and bounded duration/check-ins',()=>{
 const c=model();assert.throws(()=>c.focusInput({goal:'',minutes:25}),/goal/);assert.throws(()=>c.focusInput({goal:'Draft',minutes:0}),/duration/);assert.throws(()=>c.focusInput({goal:'Draft',minutes:25,checkInMinutes:2}),/Check-ins/);assert.equal(c.focusInput({goal:'Draft',minutes:25,checkInMinutes:5}).checkIn,5);
});
function backend({schedules=[],events=[],focus=[],regular=[],missions=[],forge=[],calendarError=false}={}){
 const notices=new Map(),previews=new Map(),actions=[],queries=[],writes=[];let eventList=events,rows=schedules.map(s=>({...s}));
 const q=async(strings,...values)=>{const query=strings.join('?');queries.push(query);
  if(query.startsWith('select data from'))return [{data:{timeZone:'UTC'}}];
  if(query.includes('from scotty_tasks t'))return regular;
  if(query.includes('from scotty_missions'))return missions;
  if(query.includes('from scotty_forge_jobs'))return forge;
  if(query.includes('select id,kind,payload'))return rows.filter(s=>s.enabled&&new Date(s.next_at)<=values[0]).map(s=>({id:s.id,kind:s.kind,payload:s.payload,timeZone:s.time_zone,nextAt:s.next_at}));
  if(query.includes('select * from scotty_daily_schedules where enabled'))return rows.filter(s=>s.enabled&&new Date(s.next_at)<=values[0]);
  if(query.startsWith('insert into scotty_daily_notifications')){if(!notices.has(values[1]))notices.set(values[1],values);return []}
  if(query.startsWith('update scotty_daily_schedules set enabled=?')){const s=rows.find(s=>s.id===values[3]);s.enabled=values[0];s.next_at=values[1];return []}
  if(query.startsWith('select status,ends_at'))return focus.filter(f=>f.id===values[0]);
  if(query.includes("set status='awaiting_recap'")){for(const f of focus)if(f.id===values[1]&&f.status==='running')f.status='awaiting_recap';return []}
  if(query.includes("select id from scotty_focus_sessions where status"))return focus.filter(f=>['running','break'].includes(f.status));
  if(query.startsWith('insert into scotty_calendar_previews')){previews.set(values[0],{id:values[0],payload:values[1],conflicts:values[2],state:'draft',created_at:new Date()});return []}
  if(query.startsWith('select * from scotty_calendar_previews'))return [previews.get(values[0])].filter(Boolean);
  if(query.startsWith('update scotty_calendar_previews set conflicts')){previews.get(values[1]).conflicts=values[0];return []}
  if(query.includes("set state='creating'")){const p=previews.get(values[0]);if(['draft','error'].includes(p.state)){p.state='creating';return [{id:p.id}]}return []}
  if(query.startsWith('update scotty_calendar_previews set state=?')){Object.assign(previews.get(values[2]),{state:values[0],receipt:values[1]});return []}
  if(/^(insert|update)/.test(query))writes.push({query,values});return [];
 };q.json=x=>x;q.begin=fn=>fn(q);
 const c=vm.createContext({postgres:()=>q,bootstrapResources:async()=>{},getGoogleAccessToken:async()=>{if(calendarError)throw Error('Connect Google first');return 'test'},executeProviderAction:async a=>{actions.push(a);return {ok:true,result:{id:'actual-google-id',summary:a.payload.title}}},process:{env:{}},crypto:webcrypto,Response,Request,URL,URLSearchParams,AbortSignal,console,fetch:async()=>({ok:true,json:async()=>({items:eventList})})});
 vm.runInContext(source('src/daily/model.ts')+'\n'+source('src/daily/cloud.ts'),c);
 const request=async(path,body)=>{const u=new URL('https://example.com/api/daily'+path),r=await c.handleDaily(new Request(u,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})}),u);return {status:r.status,...await r.json()}};
 return {c,request,notices,actions,queries,writes,previews,rows,setEvents:es=>eventList=es};
}
const due=(kind,repeat='none',extra={})=>({id:kind,kind,title:'Check draft',next_at:new Date(Date.now()-120000),repeat,time_zone:'UTC',payload:{body:'Check draft'},enabled:true,...extra});
test('scheduler catches up once, persists deduplicated alerts and advances recurring reminders',async()=>{
 const h=backend({schedules:[due('reminder','daily')]});await h.c.dailyTick();await h.c.dailyTick();assert.equal(h.notices.size,1);assert.equal(h.rows[0].enabled,true);assert.ok(new Date(h.rows[0].next_at)>new Date());assert.ok(h.queries.some(q=>/for update skip locked/.test(q)));
});
test('one-time reminders disable after delivery and stale focus check-ins are suppressed',async()=>{
 const h=backend({schedules:[due('reminder'),due('focus-checkin','none',{link_id:'f'}),due('focus-end','none',{link_id:'f'})],focus:[{id:'f',status:'running',ends_at:new Date(Date.now()-1000)}]});await h.c.dailyTick();assert.equal(h.notices.size,2);assert.ok(h.rows.every(s=>!s.enabled));
});
test('briefings report unavailable calendars instead of claiming no commitments, and unify existing work',async()=>{
 const h=backend({calendarError:true,regular:[{title:'Task',status:'queued'}],missions:[{id:'m',title:'Mission',status:'queued'}],forge:[{id:'j',title:'Forge',status:'queued'}]});const r=await h.request('/briefing');assert.equal(r.ok,true);assert.match(r.text,/3 unfinished/);assert.match(r.text,/Calendar unavailable: Connect Google first/);assert.equal(r.calendar.available,false);
});
test('calendar previews never write events; confirmation returns actual receipt and retries do not duplicate',async()=>{
 const h=backend(),r=await h.request('/calendar/preview',{title:'Draft time',startWall:'2027-12-01T10:00',endWall:'2027-12-01T11:00',timeZone:'UTC'});assert.equal(r.ok,true);assert.equal(h.actions.length,0);const confirmed=await h.request('/calendar/confirm',{id:r.id});assert.equal(confirmed.result.id,'actual-google-id');assert.equal(h.actions.length,1);await h.request('/calendar/confirm',{id:r.id});assert.equal(h.actions.length,1);
});
test('new calendar conflicts require fresh explicit approval even when old conflicts were approved',async()=>{
 const e=id=>({id,summary:id,start:{dateTime:'2027-12-01T10:30:00Z'},end:{dateTime:'2027-12-01T11:30:00Z'}}),h=backend({events:[e('first')]}),r=await h.request('/calendar/preview',{title:'Draft',startWall:'2027-12-01T10:00',endWall:'2027-12-01T11:00',timeZone:'UTC'});
 assert.equal((await h.request('/calendar/confirm',{id:r.id})).needsConflictApproval,true);assert.equal(h.actions.length,0);h.setEvents([e('first'),e('second')]);assert.equal((await h.request('/calendar/confirm',{id:r.id,allowConflict:true})).needsConflictApproval,true);assert.equal(h.actions.length,0);assert.equal((await h.request('/calendar/confirm',{id:r.id,allowConflict:true})).ok,true);assert.equal(h.actions.length,1);
});
test('calendar access failures stop previews and simultaneous focus sessions are refused',async()=>{
 const h=backend({calendarError:true,focus:[{id:'f',status:'running'}]});assert.equal((await h.request('/calendar/preview',{title:'Draft',startWall:'2027-12-01T10:00',endWall:'2027-12-01T11:00',timeZone:'UTC'})).ok,false);assert.equal(h.actions.length,0);assert.match((await h.request('/focus',{goal:'Next',minutes:25})).error,/active focus/);
});
test('voice reminders require timing and valid captures persist with spoken source',async()=>{
 const h=backend();const vague=await h.request('/command',{text:'remind me to draft'});assert.equal(vague.handled,true);assert.match(vague.reply,/date and time/);assert.equal(h.writes.filter(x=>x.query.includes("'reminder'")).length,0);await h.request('/command',{text:'remind me to draft in 20 minutes'});assert.equal(h.writes.filter(x=>x.query.includes("'reminder'")).length,1);await h.request('/command',{text:'add to my inbox: Draft chapter'});assert.ok(h.writes.some(x=>x.query.includes('insert into scotty_tasks')&&x.values.includes('spoken')));
});
function provider(fetcher,existing){const c=vm.createContext({getGoogleAccessToken:async()=> 'test',fetch:fetcher,fetchJson:async()=>existing,AbortSignal,crypto:webcrypto});const s=source('src/providers/cloud.ts');vm.runInContext(s.slice(s.indexOf('async function google('),s.indexOf('async function slack(')),c);return c}
test('Google updates send the preview etag and refuse overwriting a changed event',async()=>{
 let sent;const c=provider(async(url,opt)=>{sent=opt;return {ok:false,status:412,json:async()=>({})}},{summary:'Changed',start:{dateTime:'2027-01-01T10:00Z'},end:{dateTime:'2027-01-01T11:00Z'}});await assert.rejects(c.google('calendar_update',{eventId:'event123',etag:'old-tag',summary:'Draft',start:'2027-01-01T10:00Z',end:'2027-01-01T11:00Z'}),/fresh preview/);assert.equal(sent.method,'PATCH');assert.equal(sent.headers['If-Match'],'old-tag');
});
test('Google creation retries recover the matching existing event by deterministic ID',async()=>{
 const existing={id:'abc123',summary:'Draft',start:{dateTime:'2027-01-01T10:00Z'},end:{dateTime:'2027-01-01T11:00Z'}},c=provider(async()=>({ok:false,status:409,json:async()=>({})}),existing);const r=await c.google('calendar_create',{requestId:'abc123',summary:'Draft',start:'2027-01-01T10:00Z',end:'2027-01-01T11:00Z'});assert.equal(r.id,'abc123');
});
test('Daily Life HUD routes commands to persisted APIs and wires focus, reminders and tabs',async()=>{
 const elements=new Map(),requests=[],tabs=['briefing','inbox','reminders','calendar','plan','focus'];
 function el(){const classes=new Set();return {value:'',textContent:'',hidden:false,children:[],dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},setAttribute(){},addEventListener(){},appendChild(x){this.children.push(x);if(x.id)elements.set('#'+x.id,x)},replaceChildren(){this.children=[]},querySelectorAll(q){return q==='[data-view]'?views:q==='[data-tab]'?buttons:q==='[data-energy]'?energies:[]},set innerHTML(html){for(const m of html.matchAll(/id="([^"]+)"/g))elements.set('#'+m[1],el())}}}
 const views=tabs.map(t=>({...el(),dataset:{view:t}})),buttons=tabs.map(t=>({...el(),dataset:{tab:t}})),energies=['light','normal','ambitious'].map(t=>({...el(),dataset:{energy:t}}));
 const select=q=>{if(!elements.has(q))elements.set(q,el());return elements.get(q)},store=new Map();
 const snapshot={ok:true,preferences:{timeZone:'UTC',morning:'08:00',evening:'20:00'},tasks:[],reminders:[],notifications:[],focus:[],plans:[],projects:[],scheduler:{}};
 const c=vm.createContext({document:{querySelector:select,createElement:el,head:el(),createTextNode:text=>({textContent:text})},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},AbortController,setTimeout:()=>1,clearTimeout(){},setInterval(){},fetch:async(url,opt)=>{requests.push({url,body:opt.body&&JSON.parse(opt.body)});return {ok:true,json:async()=>url.endsWith('/command')?{ok:true,handled:true,reply:'Added'}:snapshot}},loadResources:async()=>{},speak:async()=>{}});c.window=c;vm.runInContext(read('public/daily-life.js'),c);
 await c.SCOTTYDaily.refresh(true);select('#dailyButton').onclick();buttons[4].onclick();assert.equal(views[4].hidden,false);assert.ok(views.filter((_,i)=>i!==4).every(v=>v.hidden));
 select('#dailyFocusGoal').value='Draft';select('#dailyFocusMinutes').value='25';select('#dailyFocusCheckIn').value='5';await select('#dailyFocusStart').onclick();assert.equal(requests.find(r=>r.url.endsWith('/focus')).body.goal,'Draft');
 select('#dailyReminderTitle').value='Read';select('#dailyReminderTime').value='2027-12-01T08:00';select('#dailyReminderRepeat').value='weekly';await select('#dailyAddReminder').onclick();assert.equal(requests.find(r=>r.url.endsWith('/reminders')).body.repeat,'weekly');
 const reply=await c.SCOTTYDaily.handleCommand('add to my inbox: Draft');assert.equal(reply.handled,true);assert.equal(requests.find(r=>r.url.endsWith('/command')).body.text,'add to my inbox: Draft');assert.equal(views[1].hidden,false);assert.equal((await c.SCOTTYDaily.handleCommand('ordinary chat')).handled,false);
});
