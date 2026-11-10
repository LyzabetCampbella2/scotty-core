/**
 * SCOTTY Phase 5 — 185-agent policy REVIEW ONLY.
 * Compiles a frozen roster index from a reviewed Activepieces snapshot.
 * No app route, user session, database, real grant, owner consent or agent
 * execution uses this. All decisions have actualPermissionGranted:false.
 */
const EXPECTED={agents:185,chiefs:25,specialists:160};
const VALID_ID=/^(?:chief-[a-z0-9-]+|agent-[a-z0-9-]+)$/;
const VALID_ROLES=new Set(['Chief','Specialist']);
const VALID_PROVENANCE=new Set(['production-source-fallback','proposed-addition']);
const VALID_STATUS='Development profile — not executing';
const SCOPES=new Set(['individual','departmental','shared']);
const reject=reason=>Object.freeze({
 decision:'DENY',reason,actualPermissionGranted:false,
 stagingOnly:true,ownerApprovalVerified:false,
 authorizedResourceAccess:false,canExecute:false
});
function accept(scope,reason,requirements){
 return Object.freeze({
  decision:'REVIEW_ONLY_PENDING_APPROVAL',reason,scope,
  requiredApprovals:Object.freeze([...requirements]),
  actualPermissionGranted:false,stagingOnly:true,
  ownerApprovalVerified:false,authorizedResourceAccess:false,
  canExecute:false
 });
}
function compilePhase5RosterSnapshot(snapshot){
 if(!snapshot||snapshot.schemaVersion!==1||snapshot.snapshotKind!=='development-review-only'||
   !Array.isArray(snapshot.agents)||snapshot.agents.length!==EXPECTED.agents||
   snapshot.source?.records!==EXPECTED.agents||snapshot.source?.chiefs!==EXPECTED.chiefs||
   snapshot.source?.specialists!==EXPECTED.specialists||
   snapshot.source?.authority!=='not-live-permissions'||
   snapshot.source?.table!=='SCOTTY — Public Agent Registry (Draft)')
  throw Error('UNTRUSTED_OR_INCOMPLETE_ROSTER');
 const byId=new Map();
 let chiefs=0,specialists=0;
 for(const x of snapshot.agents){
  if(!x||typeof x!=='object'||Array.isArray(x)||!VALID_ID.test(x.id)||
    !VALID_ROLES.has(x.role)||typeof x.name!=='string'||!x.name.trim()||
    typeof x.department!=='string'||!x.department.trim()||
    typeof x.specialty!=='string'||!x.specialty.trim()||
    !VALID_PROVENANCE.has(x.provenance)||x.runtimeStatus!==VALID_STATUS||
    byId.has(x.id))throw Error('INVALID_OR_DUPLICATE_AGENT_PROFILE');
  if(x.role==='Chief'){
   if(!x.id.startsWith('chief-')||x.chiefId!==null)
    throw Error('INVALID_CHIEF_PARENT');
   chiefs++;
  }else{
   if(!x.id.startsWith('agent-')||typeof x.chiefId!=='string')
    throw Error('INVALID_SPECIALIST_PARENT');
   specialists++;
  }
  byId.set(x.id,Object.freeze({
   id:x.id,name:x.name,role:x.role,
   department:x.department,chiefId:x.chiefId,
   specialty:x.specialty,provenance:x.provenance,
   runtimeStatus:x.runtimeStatus
  }));
 }
 if(chiefs!==EXPECTED.chiefs||specialists!==EXPECTED.specialists)
  throw Error('CANONICAL_ROLE_COUNTS_MISMATCH');
 const specialistByChief=new Map();
 for(const x of byId.values()){
  if(x.role!=='Specialist')continue;
  const chief=byId.get(x.chiefId);
  if(!chief||chief.role!=='Chief'||chief.department!==x.department)
   throw Error('CROSS_DEPARTMENT_OR_MISSING_CHIEF');
  specialistByChief.set(x.chiefId,(specialistByChief.get(x.chiefId)||0)+1);
 }
 if([...byId.values()].filter(x=>x.role==='Chief').some(x=>!specialistByChief.has(x.id)))
  throw Error('CHIEF_WITHOUT_SPECIALIST');
 return Object.freeze({
  counts:Object.freeze({...EXPECTED}),
  agentIds:Object.freeze([...byId.keys()].sort()),
  chiefs:Object.freeze([...byId.values()].filter(x=>x.role==='Chief').map(x=>x.id).sort()),
  byId, // private compiler result; never exposed by either public function
  provenance:Object.freeze({
   fallback:[...byId.values()].filter(x=>x.provenance==='production-source-fallback').length,
   proposed:[...byId.values()].filter(x=>x.provenance==='proposed-addition').length
  })
 });
}
/**
 * A static review of a proposed access relationship, NOT memory entitlement.
 * For EVERY scope, owner-approved, signed and durable grants remain required.
 */
export function validatePhase5RosterSnapshot(snapshot){
 const {counts,agentIds,chiefs,provenance}=compilePhase5RosterSnapshot(snapshot);
 return Object.freeze({
  counts,uniqueIds:agentIds.length,chiefsWithSpecialists:chiefs.length,
  provenance
 });
}
export function createPhase5RosterMemoryPolicyReview(snapshot,{enabled=false}={}){
 const {byId,counts,agentIds,chiefs,provenance}=compilePhase5RosterSnapshot(snapshot);
 function evaluate({actorId,ownerAgentId,scope,projectId}={}){
  if(!enabled)return reject('ROSTER_REVIEW_DISABLED_BY_DEFAULT');
  if(!SCOPES.has(scope))return reject('UNKNOWN_MEMORY_SCOPE');
  if(typeof projectId!=='string'||!/^SYN-PROJECT-[A-Z0-9-]{1,80}$/.test(projectId))
   return reject('SYNTHETIC_PROJECT_REQUIRED');
  const actor=byId.get(actorId),owner=byId.get(ownerAgentId);
  if(!actor||!owner)return reject('UNKNOWN_CANONICAL_AGENT');
  if(scope==='individual'){
   if(actor.id!==owner.id)return reject('INDIVIDUAL_SCOPE_DIFFERENT_AGENT');
   return accept(scope,'SAME_AGENT_ID_ONLY',[
    'trusted-agent-session','owner-signed-specific-grant',
    'individual-memory-RLS','redacted-read-audit','global-emergency-stop'
   ]);
  }
  if(scope==='departmental'){
   // Dept membership is a review-only relation, NEVER automatic sharing.
   if(actor.department!==owner.department)return reject('CROSS_DEPARTMENT_SCOPE');
   const managingChief=actor.role==='Chief'?actor.id:actor.chiefId;
   const ownerChief=owner.role==='Chief'?owner.id:owner.chiefId;
   if(managingChief!==ownerChief)return reject('DIFFERENT_CHIEF_SCOPE');
   return accept(scope,'SAME_CHIEF_DEPARTMENT_RELATION_ONLY',[
    'trusted-agent-session','owner-signed-department-grant',
    'department-memory-RLS','department-consent-revocation',
    'redacted-read-audit','global-emergency-stop'
   ]);
  }
  // Shared memory MUST have independent, object-specific owner consent.
  // Neither being in one project nor chief authority is enough to read.
  return accept(scope,'SHARED_SCOPE_REQUIRES_EXPLICIT_OBJECT_GRANT',[
   'trusted-agent-session','owner-signed-object-specific-share-grant',
   'shared-memory-RLS','recipient-project-membership',
   'redacted-read-audit','global-emergency-stop'
  ]);
 }
 return Object.freeze({
  rosterSummary:()=>Object.freeze({
   ...counts,uniqueIds:agentIds.length,chiefsWithSpecialists:chiefs.length,
   fallbackProfiles:provenance.fallback,proposedProfiles:provenance.proposed,
   runtimeAgentsEnabled:0,actualPermissionsGranted:0
  }),
  review:evaluate
 });
}
