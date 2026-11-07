/**
 * SCOTTY Public Development Roster audit (Activepieces Code action).
 * Input: directory = HTTP GET output from the public directory.
 * This is not a production identity / permission audit.
 */
export const code = async (inputs) => {
  const raw=inputs?.directory;
  const data=typeof raw==='string'?JSON.parse(raw):(raw?.body||raw);
  if (!data || data.mode!=='STATIC_READ_ONLY' ||
      data.live_roster_verified!==false || data.contains_private_memory!==false ||
      data.counts?.chiefs!==25 || data.counts?.specialists!==160 ||
      data.counts?.total!==185 || !Array.isArray(data.agents) ||
      data.agents.length!==185) throw new Error('NOT_A_PUBLIC_DEVELOPMENT_ROSTER');
  const chiefs=data.agents.filter(a=>a.isChief===true);
  const specialists=data.agents.filter(a=>a.isChief===false);
  const ids=new Set(),chiefIds=new Set(chiefs.map(a=>a.id));
  const violations=[];
  for(const a of data.agents) {
    if (!a || typeof a.id!=='string' || ids.has(a.id)) violations.push('DUPLICATE_OR_MISSING_ID');
    else ids.add(a.id);
    if (!a.name || !a.department || !a.specialty) violations.push('MISSING_PUBLIC_PROFILE_METADATA');
    if (a.isChief===false && !chiefIds.has(a.chiefId)) violations.push('MISSING_PARENT_CHIEF');
    if (a.isChief===true && a.chiefId!==null) violations.push('CHIEF_HAS_PARENT');
  }
  if (chiefs.length!==25 || specialists.length!==160) violations.push('ROLE_COUNT_MISMATCH');
  const departments=[...new Set(data.agents.map(a=>a.department))].sort();
  const provenance={};
  for (const a of data.agents) provenance[a.provenance||'unspecified']=(provenance[a.provenance||'unspecified']||0)+1;
  return {status:violations.length?'REVIEW_REQUIRED':'PASS_PUBLIC_ROSTER_INTEGRITY',
    mode:'STATIC_READ_ONLY',counts:{chiefs:chiefs.length,specialists:specialists.length,total:data.agents.length},
    departmentCount:departments.length,departments,provenance,
    uniqueIdCount:ids.size,violations:[...new Set(violations)],
    liveAgentsVerified:0, permissionScopesVerified:false,
    projectAssignmentsVerified:false, privateMemoryConnected:false,
    aiCalls:0, memoryWrites:0, externalActions:0,
    note:'Development roster structure only; no evidence of active, trained or authenticated agents.'};
};
