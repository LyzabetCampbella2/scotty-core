/**
 * SCOTTY draft-only multidisciplinary project proposal.
 * Inputs: projectRows=Activepieces Tables Find Records output;
 *         directory=public roster HTTP response;
 *         projectId=one of the public project IDs.
 * Nothing is assigned, executed, approved, or persisted.
 */
export const code = async (inputs) => {
  const dr=inputs?.directory;
  const directory=typeof dr==='string'?JSON.parse(dr):(dr?.body||dr);
  const rr=inputs?.projectRows;
  const rows=typeof rr==='string'?JSON.parse(rr):(Array.isArray(rr)?rr:rr?.records);
  const projectId=String(inputs?.projectId||'').trim();
  if(!directory || directory.mode!=='STATIC_READ_ONLY' ||
    directory.live_roster_verified!==false ||
    directory.contains_private_memory!==false ||
    directory.counts?.total!==185 || !Array.isArray(directory.agents) ||
    directory.agents.length!==185 || !Array.isArray(rows) ||
    rows.length>20 || !/^[a-z0-9-]{3,80}$/.test(projectId)) {
    throw Error('INVALID_STAGING_SOURCE');
  }
  const get=(row,name)=>{
    const cell=Object.values(row.cells||{}).find(x=>x?.fieldName===name);
    return typeof cell?.value==='string'?cell.value:'';
  };
  const entry=rows.find(x=>get(x,'Project ID')===projectId);
  if(!entry)return {status:'UNKNOWN_PROJECT',projectId,teams:[],actionsTaken:0,liveAgents:false};
  if(get(entry,'Owner Review')==='Do not use')return {status:'OWNER_BLOCKED',projectId,teams:[],actionsTaken:0,liveAgents:false};
  if(get(entry,'Assignment State')!=='Suggestions only')throw Error('INVALID_ASSIGNMENT_STATE');
  const departments=get(entry,'Candidate Departments').split(';').map(s=>s.trim()).filter(Boolean);
  if(departments.length===0 || departments.length>8 || get(entry,'Public Focus').length>250)throw Error('INVALID_PUBLIC_PROJECT');
  const chiefs=new Map(directory.agents.filter(x=>x.isChief).map(x=>[x.id,x]));
  const candidates=directory.agents.filter(x=>!x.isChief&&chiefs.has(x.chiefId));
  const focusTerms=new Set(get(entry,'Public Focus').toLowerCase().match(/[a-z]{4,}/g)||[]);
  const proposal=[];
  for(const department of departments){
    const choices=candidates.filter(x=>x.department===department)
      .map(a=>{
        const text=[a.specialty,...(a.skills||[])].join(' ').toLowerCase();
        const score=[...focusTerms].reduce((sum,term)=>sum+(text.includes(term)?1:0),0);
        return {a,score};
      }).sort((a,b)=>b.score-a.score||a.a.id.localeCompare(b.a.id));
    if(choices[0]){
      const c=choices[0],ch=chiefs.get(c.a.chiefId);
      proposal.push({agentId:c.a.id,name:c.a.name,chiefId:ch.id,
        chiefName:ch.name,department,discipline:c.a.specialty,
        reason:'Public project department match',status:'suggested-not-assigned'});
    }
  }
  return {status:proposal.length?'PENDING_OWNER_REVIEW':'NO_MATCH',
    mode:'PUBLIC_PROJECT_ROUTING_PREVIEW',projectId,
    projectName:get(entry,'Project'),projectCategory:get(entry,'Category'),
    publicFocus:get(entry,'Public Focus'),
    suggestedTeam:proposal.slice(0,5),
    ownerReview:get(entry,'Owner Review'),liveAgents:false,
    ownerApprovalRequired:true,projectMembershipVerified:false,
    assignmentsCreated:0,aiCalls:0,externalActions:0,memoryWrites:0,
    warning:'Static public project metadata only. No actual authorization or assignment.'};
};
