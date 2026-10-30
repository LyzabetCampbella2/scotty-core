/** Owner-approved ephemeral *public or synthetic only* project sources.
 * Never fetches Render private files, client records, or a different project.
 */
const safeId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
export function normalizeProjectContext(raw,roster,now=new Date()){
 if(raw==null)return null;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!safeId(raw.projectId)||raw.approved!==true||
    raw.noPrivateDataConfirmed!==true||raw.classification!=='public-or-synthetic')
  throw Error('PROJECT_OWNER_CONSENT_REQUIRED');
 const valid=new Set((roster||[]).map(a=>a.id).concat('scotty'));
 const assigned=raw.assignedAgentIds;
 if(!Array.isArray(assigned)||assigned.length<1||assigned.length>8||assigned.some(id=>!safeId(id)||!valid.has(id)))
  throw Error('INVALID_PROJECT_TEAM');
 const unique=[...new Set(assigned)];
 if(unique.length!==assigned.length)throw Error('DUPLICATE_PROJECT_ASSIGNEE');
 if(!Array.isArray(raw.sources)||raw.sources.length<1||raw.sources.length>3)throw Error('INVALID_PROJECT_SOURCES');
 const sources=raw.sources.map(s=>{
  if(!s||!safeId(s.id)||!safeId(s.projectId)||s.projectId!==raw.projectId||s.ownerApproved!==true||
    typeof s.title!=='string'||!s.title.trim()||s.title.length>100||
    typeof s.content!=='string'||!s.content.trim()||s.content.length>300||
    s.classification!=='public-or-synthetic')throw Error('PROJECT_SOURCE_NOT_APPROVED');
  if(!Array.isArray(s.allowedAgentIds)||s.allowedAgentIds.length<1||s.allowedAgentIds.some(id=>!unique.includes(id)))
   throw Error('PROJECT_SOURCE_RECIPIENT_DENIED');
  if(s.revoked===true||s.expiresAt&&new Date(s.expiresAt).getTime()<=now.getTime())throw Error('PROJECT_SOURCE_EXPIRED_OR_REVOKED');
  let url=null;
  if(s.url!=null){try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password)throw Error('BAD_URL');url=u.href}catch{throw Error('PROJECT_SOURCE_URL_DENIED')}}
  return {id:s.id,projectId:s.projectId,title:s.title.trim(),content:s.content.trim(),allowedAgentIds:[...new Set(s.allowedAgentIds)],
   url,classification:'public-or-synthetic',reviewedAt:s.reviewedAt||null,scope:'project',ownerApproved:true};
 });
 if(new Set(sources.map(s=>s.id)).size!==sources.length)throw Error('DUPLICATE_PROJECT_SOURCE');
 return {projectId:raw.projectId,assignedAgentIds:unique,sources,ephemeral:true,productionDatabaseConnected:false};
}
export function projectEvidenceFor(agent,ctx){
 if(!ctx||!agent?.id||!ctx.assignedAgentIds.includes(agent.id))return [];
 return ctx.sources.filter(s=>s.projectId===ctx.projectId&&s.ownerApproved===true&&s.allowedAgentIds.includes(agent.id))
  .map(s=>({id:'project:'+s.projectId+':'+s.id,title:s.title,content:s.content,url:s.url,scope:'project',retrievalReason:'Explicitly assigned public/synthetic project evidence for '+agent.id,reviewedAt:s.reviewedAt}));
}
