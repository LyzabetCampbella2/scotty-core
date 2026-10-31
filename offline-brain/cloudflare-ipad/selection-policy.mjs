/** Exact and ambiguity-safe specialist selection. A spoken name never silently falls back. */
export function requestedSpecialist(question){
 const m=String(question||'').match(/^\s*use specialist ([^:]{1,100}):\s*(.{1,500})$/i);
 return m?{choice:m[1].trim(),task:m[2].trim()}:null;
}
export function matchSpecialist(roster,choice){
 const needle=String(choice||'').trim().toLowerCase().replace(/\s+/g,' ');
 if(!needle)return {status:'unknown',candidates:[]};
 const rosterSpecialists=(roster||[]).filter(a=>!a.isChief&&a.id!=='scotty');
 const exact=rosterSpecialists.filter(a=>[a.id,a.name].some(s=>String(s||'').toLowerCase().replace(/\s+/g,' ')===needle));
 if(exact.length===1)return {status:'selected',agent:exact[0],reason:'Explicit owner choice by exact specialist '+(exact[0].id===choice?'ID':'name')};
 if(exact.length>1)return {status:'ambiguous',candidates:exact.map(a=>({id:a.id,name:a.name}))};
 return {status:'unknown',candidates:[],reason:'No exact specialist name or ID matched; SCOTTY must ask for clarification.'};
}
export function selectionRationale(assignment,agent){
 if(assignment.selectionReason)return assignment.selectionReason;
 if(Array.isArray(assignment.matched)&&assignment.matched.length)return 'Matched task terms: '+assignment.matched.join(', ')+'.';
 return 'Selected from the '+String(agent?.department||'assigned')+' department; verify fit before consent.';
}
