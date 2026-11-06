import {canUse,passages,detectConflicts,factKey} from './knowledge-model.ts';
// A read-only projection: model outputs never become trusted recall by repetition.
export function selectRecall(rows:any[],query:string,scope:string,space:any,agentId='scotty',limit=18,now=new Date()){
 if(!canUse(space,agentId))return {memories:[],warnings:[],status:'denied',truncated:false};
 const eligible=rows.filter(m=>m.scope===scope&&m.status==='active'&&(!['agent-result','mission-summary','mission-step'].includes(m.kind)||m.evidenceState==='owner-stated'));
 const ranked=eligible.map(m=>({...m,hits:passages([m.text,m.factKey,m.factValue,m.sourceContent].filter(Boolean).join('\n'),query)})).filter(m=>m.hits.length).sort((a,b)=>(b.hits[0].score-a.hits[0].score)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 const cap=Math.max(1,Math.min(30,Math.floor(Number(limit)||18))),selected:any[]=[],seen=new Set();let truncated=false;
 // Keep conflicting facts together. If the family cannot fit, disclose the gap.
 for(const m of ranked){if(seen.has(m.id))continue;const key=factKey(m.factKey),family=key?eligible.filter(r=>factKey(r.factKey)===key):[m];for(const peer of family){if(seen.has(peer.id))continue;seen.add(peer.id);if(selected.length>=cap){truncated=true;continue;}selected.push({...peer,hits:passages(peer.sourceContent||peer.text,query),retrievalReason:peer.id===m.id?'Matches your request':'Related fact key; included to check competing versions'});}}
 const warnings=detectConflicts(eligible,now).filter(w=>w.memories.some((m:any)=>selected.some(s=>s.id===m.id))).map(w=>({type:w.type,key:w.key,reason:w.reason,memoryIds:w.memories.map((m:any)=>String(m.id))}));
 if(truncated)warnings.push({type:'limit',key:'recall',reason:'Some matching memories or competing versions did not fit. Review memory before resolving a disagreement.',memoryIds:[]});
 return {memories:selected,warnings,status:selected.length?'ready':'empty',truncated};
}
export async function consumerRecall(loader:any,query:string,scope='shared',agentId='scotty',limit=18){
 try{return await loader(query,scope,agentId,limit)}catch{return {text:'',sources:[],memories:[],recall:{status:'unavailable',scope,agentId,warnings:[{type:'unavailable',reason:'Memory could not be read. Do not imply that saved facts were checked.'}]}};}
}
export function recallNotice(recall:any){return 'MEMORY READ STATUS: '+JSON.stringify(recall||{status:'not_requested'})+'. Use only supplied evidence. A missing match is not proof that no saved memory exists. If unavailable or denied, explain that limitation when the answer depends on memory. Never resolve a reported conflict by guessing.';}
