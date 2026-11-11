import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyChiefSummary} from './daily-chief-brief.mjs';
test('all-project briefing counts only saved project work, shows gaps and makes no live or AI claims',()=>{
 const brief=dailyChiefSummary([
  {project:{id:'project-bloodpool',name:'Bloodpool'},brief:{asOf:'2026-10-30T10:00:00Z',
   overdue:[{title:'Review chapter one',dueAt:'2026-10-29'}],
   upcoming:[{title:'Outline chapter two',dueAt:'2026-11-01'}],
   blocked:[{reason:'Approval required'}],decisions:[{goal:'Approve revision',status:'awaiting_approval'}],
   pendingHandoffs:1,connectedAppItems:[{name:'Example calendar',stale:true}],
   gaps:['No live Calendar fetch']}},
  {project:{id:'project-goldenhour',name:'Golden Hour Creative'},brief:{
   overdue:[],upcoming:[],blocked:[],decisions:[],pendingHandoffs:0,connectedAppItems:[],gaps:[]}}
 ],new Date('2026-10-30T12:00:00Z'));
 assert.equal(brief.projectCount,2);
 assert.deepEqual(brief.totals,{overdue:1,upcoming:1,decisions:1,blocked:1,pendingHandoffs:1});
 assert.equal(brief.projects[0].staleSnapshots,1);
 assert.equal(brief.projects[0].freshLiveEmailRead,false);
 assert.equal(brief.projects[0].freshLiveCalendarRead,false);
 assert.equal(brief.modelCalls,0);
 assert.equal(brief.providerWrites,0);
 assert.equal(brief.scheduled,false);
 assert.match(brief.projects[0].attention[0].text,/chapter one/);
});
test('briefing never invents unsupported dates or private source content',()=>{
 const summary=dailyChiefSummary([{project:{id:'project-x',name:'Project X'},errors:['Calendar disconnected']}]);
 assert.equal(summary.projects[0].asOf,null);
 assert.equal(summary.projects[0].sourceGaps[0],'Calendar disconnected');
 assert.equal(summary.totals.overdue,0);
 assert.equal(summary.liveAppsQueried,false);
});
