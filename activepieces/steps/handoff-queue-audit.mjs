/**
 * SCOTTY queue audit — public synthetic handoff metadata, READ ONLY.
 * Inputs: queueRows = Activepieces Find Records output,
 *         directory = public development roster HTTP response,
 *         projectId = exact public project ID.
 * All queued rows must remain unsent, unapproved and non-executable.
 */
export const code=async inputs=>{
 const parse=x=>typeof x==='string'?JSON.parse(x):x;
 const raw=parse(inputs?.directory),dir=raw?.body||raw;
 const rowsVal=parse(inputs?.queueRows);
 const rows=Array.isArray(rowsVal)?rowsVal:rowsVal?.records;
 const projectId=String(inputs?.projectId||'').trim();
 if(!dir||dir.mode!=='STATIC_READ_ONLY'||dir.live_roster_verified!==false||
   dir.contains_private_memory!==false||dir.counts?.total!==185||
   !Array.isArray(dir.agents)||dir.agents.length!==185||
   !Array.isArray(rows)||rows.length<3||rows.length>20||
   !/^[a-z0-9-]{3,80}$/.test(projectId))
   throw Error('INVALID_STAGING_QUEUE_SOURCE');
 const get=(r,k)=>{
   const c=r?.cells||{};
   if(typeof c[k]==='string')return c[k];
   const v=Object.values(c).find(x=>x&&typeof x==='object'&&x.fieldName===k);
   return typeof v?.value==='string'?v.value:'';
 };
 const agentMap=new Map(dir.agents.map(a=>[a.id,a]));
 if(agentMap.size!==185)throw Error('DUPLICATE_AGENT_ID');
 const byId=new Map(), counts={specialistToChief:0,crossChief:0,chiefToScotty:0};
 const entries=[];
 for(const row of rows){
   const id=get(row,'Handoff ID'),project=get(row,'Project ID'),
    stage=get(row,'Stage'),from=get(row,'From Agent ID'),to=get(row,'To Reviewer ID'),
    requires=get(row,'Depends On'),status=get(row,'Review Status'),
    delivery=get(row,'Delivery Status'),execution=get(row,'Execution Allowed');
   if(!id||id.length>180||byId.has(id)||project!==projectId||
      status!=='Proposed — not reviewed'||
      delivery!=='Not sent — no messaging connection'||
      execution!=='No'||requires.length>800)throw Error('UNSAFE_OR_DUPLICATED_HANDOFF');
   let kind;
   const sender=agentMap.get(from),receiver=agentMap.get(to);
   if(stage==='Specialist → Chief'){
     if(!sender||sender.isChief!==false||!receiver||receiver.isChief!==true||
       sender.chiefId!==to)throw Error('INVALID_SPECIALIST_CHIEF_LINK');
     counts.specialistToChief++;kind='specialist';
   }else if(stage==='Chief → Chief'){
     if(!sender||sender.isChief!==true||!receiver||receiver.isChief!==true||from===to)
       throw Error('INVALID_CROSS_CHIEF_LINK');
     counts.crossChief++;kind='cross-chief';
   }else if(stage==='Chief → SCOTTY'){
     if(!sender||sender.isChief!==true||to!=='scotty')throw Error('INVALID_SCOTTY_SYNTHESIS_LINK');
     counts.chiefToScotty++;kind='synthesis';
   }else throw Error('UNKNOWN_HANDOFF_STAGE');
   const deps=requires.trim()?requires.split(',').map(s=>s.trim()):[];
   if(deps.some(x=>!x||x===id)||new Set(deps).size!==deps.length)
     throw Error('INVALID_HANDOFF_DEPENDENCIES');
   const item={id,kind,from,to,dependsOn:deps};
   byId.set(id,item);entries.push(item);
 }
 const n=counts.specialistToChief;
 if(n<2||n>5||counts.crossChief!==n-1||counts.chiefToScotty!==1||
    rows.length!==n+counts.crossChief+1)throw Error('INVALID_HANDOFF_GRAPH_SHAPE');
 const visiting=new Set(),visited=new Set();
 function visit(id){
   if(visiting.has(id))throw Error('CYCLIC_HANDOFF_DEPENDENCIES');
   if(visited.has(id))return;
   const step=byId.get(id);
   if(!step)throw Error('MISSING_HANDOFF_DEPENDENCY');
   visiting.add(id);
   for(const parent of step.dependsOn)visit(parent);
   visiting.delete(id);visited.add(id);
 }
 for(const item of entries)visit(item.id);
 const specialistLinks=entries.filter(x=>x.kind==='specialist');
 const crossChief=entries.filter(x=>x.kind==='cross-chief');
 const synthesis=entries.find(x=>x.kind==='synthesis');
 const chiefIds=new Set(specialistLinks.map(x=>x.to));
 if(chiefIds.size!==n||!chiefIds.has(synthesis.from)||
    crossChief.some(x=>x.to!==synthesis.from||!chiefIds.has(x.from))||
    new Set(crossChief.map(x=>x.from)).size!==n-1)
   throw Error('INVALID_CHIEF_HANDOFF_COVERAGE');
 for(const edge of crossChief){
   const req=specialistLinks.find(x=>x.to===edge.from);
   if(!req||edge.dependsOn.length!==1||edge.dependsOn[0]!==req.id)
     throw Error('INVALID_CROSS_CHIEF_REVIEW_DEPENDENCY');
 }
 const expectedFinal=new Set([
  ...crossChief.map(x=>x.id),
  specialistLinks.find(x=>x.to===synthesis.from)?.id
 ]);
 if(expectedFinal.has(undefined)||synthesis.dependsOn.length!==expectedFinal.size||
    synthesis.dependsOn.some(x=>!expectedFinal.has(x)))
   throw Error('INVALID_SCOTTY_SYNTHESIS_DEPENDENCIES');
 return {status:'VALID_PUBLIC_HANDOFF_QUEUE_ONLY',
   mode:'SYNTHETIC_QUEUE_INTEGRITY',
   projectId,leadChiefId:synthesis.from,handoffCount:entries.length,
   counts,dependencyEdges:entries.reduce((sum,x)=>sum+x.dependsOn.length,0),
   approvedForExecution:false,readyToSend:false,
   ownerReviewVerified:false,projectMembershipVerified:false,
   messagesSent:0,memoryReads:0,memoryWrites:0,assignmentsCreated:0,
   aiCalls:0,externalActions:0,missionStarts:0,
   warning:'This validates an unsent development queue only. No live team messaging or authorization exists.'
 };
};
