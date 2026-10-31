/** Deterministic chief-of-staff summary of existing authorized project snapshots.
 * No AI calls, live connected-app fetch or fabricated deadlines.
 */
const bounded=(a,n=12)=>Array.isArray(a)?a.slice(0,n):[];
export function dailyChiefSummary(items,now=new Date()){
 const projects=bounded(items,15).map(item=>{
  const b=item.brief||{},project=item.project||b.project||{};
  const incomplete=Array.isArray(item.errors)?item.errors:[];
  const counts={overdue:bounded(b.overdue,100).length,upcoming:bounded(b.upcoming,100).length,
   decisions:bounded(b.decisions,100).length,blocked:bounded(b.blocked,100).length,
   pendingHandoffs:Number.isFinite(Number(b.pendingHandoffs))?Math.max(0,Number(b.pendingHandoffs)):0};
  const connected=bounded(b.connectedAppItems,100),stale=connected.filter(x=>x.stale!==false);
  const attention=[
   ...bounded(b.overdue,8).map(x=>({kind:'overdue',text:String(x.title||'Untitled task').slice(0,180),dueAt:x.dueAt||null})),
   ...bounded(b.blocked,8).map(x=>({kind:'blocked',text:String(x.reason||'Unknown blocker').slice(0,180)})),
   ...bounded(b.decisions,8).map(x=>({kind:'decision',text:String(x.goal||'Unreviewed mission').slice(0,180),status:x.status}))
  ].slice(0,20);
  return {id:project.id||item.projectId,name:project.name||project.id||item.projectId,
   asOf:b.asOf||null,counts,attention,sourceGaps:[...bounded(b.gaps,20),...incomplete].map(String),
   connectedAppSnapshots:connected.length,staleSnapshots:stale.length,
   freshLiveEmailRead:false,freshLiveCalendarRead:false};
 });
 const counts={overdue:0,upcoming:0,decisions:0,blocked:0,pendingHandoffs:0};
 for(const p of projects)for(const key of Object.keys(counts))counts[key]+=p.counts[key];
 return {asOf:now.toISOString(),projects,totals:counts,projectCount:projects.length,
  generatedFrom:'existing owner-scoped stored mission/task/calendar/document snapshots',
  liveAppsQueried:false,scheduled:false,modelCalls:0,providerWrites:0,
  note:'This is an on-demand deterministic briefing; connection freshness must be checked separately.'};
}
