/**
 * SCOTTY review aids. Conservative, deterministic, no network and no private data.
 * These are advisory signals, never a substitute for chief/owner review.
 */
const words = s => [...new Set(String(s||'').toLowerCase().match(/[a-z0-9]{3,}/g)||[])];
const stop = new Set(['the','and','for','with','from','that','this','into','your','have','make','give','please','each','every','scotty','agents','agent','team','what']);
export function rankNotes(query,notes,{agentId,chiefId,now=new Date(),limit=12}={}){
 const terms=words(query).filter(x=>!stop.has(x));
 const time=new Date(now).getTime();
 const visible=(notes||[]).filter(n=>{
  if(!['agent','department','shared'].includes(n.scope))return false;
  if(n.scope==='agent'&&n.agentId!==agentId)return false;
  if(n.scope==='department'&&n.agentId!==chiefId&&n.agentId!==agentId)return false;
  if(n.scope==='shared'&&n.agentId!=='shared')return false;
  if(n.status&&n.status!=='active')return false;
  if(n.expiresAt&&new Date(n.expiresAt).getTime()<=time)return false;
  return true;
 });
 return visible.map(n=>{
  const hay=(String(n.title||'')+' '+String(n.content||'')).toLowerCase();
  const matched=terms.filter(t=>hay.includes(t));
  const reviewed=new Date(n.reviewedAt||n.updatedAt||0).getTime();
  const age=Number.isFinite(reviewed)?Math.max(0,(time-reviewed)/86400000):365;
  const score=matched.length*10+(terms.length?matched.length/terms.length:0)+Math.max(0,5-Math.log2(age+1));
  return {...n,retrieval:{score:Number(score.toFixed(2)),matchedTerms:matched,reason:matched.length
   ?'Keyword overlap: '+matched.join(', ')+(n.scope==='agent'?'; individual scope':n.scope==='department'?'; department scope':'; shared scope')
   :'Relevant scope and recent review; no keyword overlap',freshnessDays:Math.round(age)}};
 }).sort((a,b)=>b.retrieval.score-a.retrieval.score||String(a.id).localeCompare(String(b.id))).slice(0,Math.min(50,Math.max(1,limit)));
}
export function reviewDeliverable({question='',answer='',results=[],references=[]}={}){
 const text=String(answer||'').trim(), q=String(question||'');
 const flags=[];
 if(!text)flags.push('No final deliverable was returned.');
 if(text&&text.length<70)flags.push('Final answer is very short; check completeness.');
 const count=q.match(/\b(?:give|write|list|produce|create|draft|provide|include)\s+(\d{1,2})\b/i);
 if(count){
  const requested=Number(count[1]);
  // Heuristic only: numbered lines are not the only valid way to supply requested items.
  const numbered=(text.match(/(?:^|\n)\s*(?:\d+[.)]|[-*] )/g)||[]).length;
  if(requested<=20&&numbered<requested)flags.push('Requested '+requested+' items; only '+numbered+' explicitly listed. Manual count required.');
 }
 if(/\b(?:deployed|sent (?:the )?email|verified (?:the )?database|updated (?:the )?account|completed (?:the )?payment)\b/i.test(text))
  flags.push('Contains an execution/verification claim; require tool evidence.');
 if(/\b(?:latest|today|currently|as of|this week)\b/i.test(text)&&!(references||[]).length)
  flags.push('Time-sensitive claim lacks attached source references.');
 if((results||[]).some(r=>r.status==='failed'||r.status==='incomplete'||r.status==='blocked'))
  flags.push('At least one specialist or chief stage is unfinished.');
 if((results||[]).length&&!results.some(r=>/chief/i.test(r.role||'')))
  flags.push('No chief review stage is present in the result.');
 return {completedCandidate:Boolean(text)&&!flags.some(f=>/No final|unfinished|No chief review/.test(f)),
  verdict:flags.length?'needs-human-review':'provisional-pass',flags,
  dimensions:{accuracy:'Requires source checking',completeness:flags.some(f=>/short|items|No final|unfinished/.test(f))?'review-needed':'not disproven',usefulness:text?'answer-present':'no-answer',unsupportedClaims:flags.some(f=>/claim/.test(f))?'possible':'not detected'},
  warning:'A provisional pass is not factual verification. Chiefs and owner must validate the deliverable.'};
}
export function sourceCandidate(feed,item,now=new Date()){
 const raw=String(item?.url||''); let url=null;
 try{const u=new URL(raw);if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href;}catch{}
 if(!url||!String(item?.title||'').trim())return null;
 const publishedAt=item.publishedAt||item.pubDate||null;
 const d=publishedAt?new Date(publishedAt):null;
 return {title:String(item.title).trim().slice(0,200),url,publisher:String(feed?.publisher||'Unknown publisher').slice(0,120),
  discoveredAt:new Date(now).toISOString(),publishedAt:d&&Number.isFinite(d.getTime())?d.toISOString():null,
  provenance:'Candidate from publisher feed',proposedUpdate:'Review the original source before writing or applying a knowledge update.',
  verified:false,promoted:false,reviewRequired:true};
}
export function permissionsForProject({agentId,assignedAgentIds=[],documents=[]}={}){
 const allowed=new Set(assignedAgentIds);
 if(!allowed.has(agentId))return {allowed:false,documents:[],reason:'Agent is not assigned to this project.'};
 return {allowed:true,documents:documents.filter(d=>d.approved===true&&
   (!Array.isArray(d.allowedAgentIds)||d.allowedAgentIds.includes(agentId))&&d.status!=='revoked'),
  reason:'Only owner-approved documents permitted to this assigned agent.'};
}
export function operatingSummary({status={},readiness={},missions=[],failures=[]}={}){
 const ready=readiness?.ready===true||readiness?.memoryReady===true;
 return {workerReady:ready,brainRelease:status.release||null,
  missions:{total:missions.length,unfinished:missions.filter(m=>!['completed','cancelled'].includes(m.status)).length},
  failures:failures.map(f=>String(f.message||f.error||f).slice(0,180)).slice(0,20),
  quota:status.quota??readiness.quota??null,quotaReported:status.quota!=null||readiness.quota!=null,
  recovery:'Review saved mission checkpoint and provider status before retrying. Never automatically replay uncertain model calls.',
  disclaimer:'No provider quota is inferred when the provider does not report it.'};
}
