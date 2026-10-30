/** Bounded relevance recall: 4 per scope, searched across 80 recent active notes. */
const stop=new Set(['the','and','for','are','with','how','what','when','which','this','that','from','your','you','scotty','agent','team','please','about']);
const terms=q=>[...new Set(String(q||'').toLowerCase().match(/[a-z0-9]{3,}/g)||[])].filter(w=>!stop.has(w)).slice(0,24);
export function selectRelevantNotes(notes,question='',limit=4,now=new Date()){
 const keywords=terms(question),time=new Date(now).getTime();
 const current=(notes||[]).filter(n=>!n.expiresAt||new Date(n.expiresAt).getTime()>time);
 return current.map(n=>{
  const searchable=(String(n.title||'')+' '+String(n.content||'')).toLowerCase();
  const hits=keywords.filter(k=>searchable.includes(k));
  const reviewed=new Date(n.reviewedAt||0).getTime();
  const age=Number.isFinite(reviewed)?Math.max(0,(time-reviewed)/86400000):1000;
  const relevance=hits.length*10+Math.max(0,5-Math.log2(age+1));
  return {...n,retrievalReason:hits.length
   ?'Matched task terms: '+hits.join(', ')+'; within '+(n.scope||'approved')+' scope'
   :'Recent reviewed note within '+(n.scope||'approved')+' scope',
   matchedTerms:hits,retrievalScore:Math.round(relevance*100)/100};
 }).sort((a,b)=>keywords.length?b.retrievalScore-a.retrievalScore||String(b.reviewedAt).localeCompare(String(a.reviewedAt)):
  String(b.reviewedAt).localeCompare(String(a.reviewedAt))).slice(0,Math.max(1,Math.min(12,limit)));
}
