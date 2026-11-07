/**
 * SCOTTY staging-only memory access assessment: NO memory values, no grants.
 * Input: roster = GET public-agent-directory.json HTTP output;
 *        policyRows = Table Find Records (Memory Scope Rules);
 *        actorId / targetAgentId / scope / projectId = synthetic IDs only.
 * The only possible decision is DENY_UNTIL_SCOTTY_AUTHENTICATES.
 */
export const code = async (inputs) => {
  const parse=x=>typeof x==='string'?JSON.parse(x):x;
  const raw=parse(inputs?.roster);
  const roster=raw?.body||raw;
  const table=parse(inputs?.policyRows);
  const rows=Array.isArray(table)?table:table?.records;
  if(!roster||roster.mode!=='STATIC_READ_ONLY'||roster.live_roster_verified!==false||
      roster.contains_private_memory!==false||roster.counts?.total!==185||
      !Array.isArray(roster.agents)||roster.agents.length!==185||
      !Array.isArray(rows)||rows.length!==4)throw Error('INVALID_STAGING_MEMORY_POLICY_INPUT');
  const get=(row,key)=>{
    const c=row?.cells;
    if(!c||typeof c!=='object')return '';
    const val=c[key];
    if(typeof val==='string')return val;
    const match=Object.values(c).find(x=>x&&typeof x==='object'&&x.fieldName===key);
    return typeof match?.value==='string'?match.value:'';
  };
  const scopes=new Set(['agent','department','shared','project']);
  const found=new Set();
  for(const row of rows){
    const scope=get(row,'Scope');
    if(!scopes.has(scope)||found.has(scope)||get(row,'Owner Review Required')!=='Yes'||
       get(row,'Current Backend Verification')!=='Unavailable — deny'||
       get(row,'Memory Content')!=='None — policy only'||
       get(row,'Automatic Promotion')!=='Never')throw Error('UNSAFE_OR_DUPLICATED_SCOPE_RULE');
    found.add(scope);
  }
  if(found.size!==4)throw Error('MISSING_REQUIRED_MEMORY_SCOPE');
  const idRe=/^[a-z0-9][a-z0-9_-]{1,79}$/i;
  const actorId=String(inputs?.actorId||'').trim();
  const targetAgentId=String(inputs?.targetAgentId||'').trim();
  const scope=String(inputs?.scope||'').trim();
  const projectId=String(inputs?.projectId||'').trim();
  if(!idRe.test(actorId)||!idRe.test(targetAgentId)||!scopes.has(scope)||
      (projectId&&!idRe.test(projectId)))throw Error('INVALID_PUBLIC_SCOPE_QUERY');
  const agents=new Map(roster.agents.map(a=>[a.id,a]));
  const actor=agents.get(actorId),target=agents.get(targetAgentId);
  if(!actor||!target)throw Error('UNKNOWN_PUBLIC_DEVELOPMENT_AGENT');
  // An outline eligibility hint is NOT proof of actual user/project authorization.
  const sameAgent=actorId===targetAgentId;
  const sameDepartment=actor.department===target.department;
  const metadataEligible=scope==='agent'?sameAgent:
    scope==='department'?sameDepartment:
    scope==='shared'?false:
    false; // project requires protected SCOTTY membership, never inferred.
  return {type:'SCOTTY_MEMORY_SCOPE_ASSESSMENT',status:'DENIED_PENDING_PROTECTED_BACKEND',
    scope,actorId,targetAgentId,projectId:projectId||null,
    metadataEligible,backendSessionVerified:false,projectMembershipVerified:false,
    ownerApprovedGrantVerified:false,memoryReadAllowed:false,memoryWriteAllowed:false,
    grantCreated:false,sharedWithOthers:false,privateMemoryLoaded:false,
    memoryReads:0,memoryWrites:0,externalActions:0,aiCalls:0,
    reason:metadataEligible?
      'Development profile suggests a potential relationship, but trusted backend identity and an owner-reviewed grant are missing.':
      'Development profile does not establish recipient eligibility; protected project and memory authorization are missing.',
    warning:'Activepieces holds policy metadata ONLY. No actual SCOTTY memory, permission, or credentials are connected.'};
};
