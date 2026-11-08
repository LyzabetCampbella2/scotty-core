/**
 * SCOTTY Stage B / Phase 2 — OFFLINE memory architecture, no persistence.
 *
 * This code designs scope isolation and owner-review requirements only.
 * It never reads/stores memory or acts on agent-provided role/permission claims.
 * Real operations require an independently authenticated runtime, secure DB
 * policies, backups, deletion/retention and live denial/restart tests.
 */
export const MEMORY_SCOPES=Object.freeze([
 "individual","department","project","explicit_shared","owner_only"
]);
export const DATA_CLASSES=Object.freeze([
 "SYNTHETIC_PUBLIC","OWNER_PRIVATE","PROJECT_CONFIDENTIAL","THIRD_PARTY_RESTRICTED"
]);
const safe=s=>typeof s==="string"&&s.trim().length>0&&s.length<=256;
const emptyOrId=s=>s===null||safe(s);
const sourceRole=row=>({
 agentId:row["Agent ID"],displayName:row.Name,department:row.Department,
 role:row.Role,chiefId:row.Role==="Chief"?null:row["Chief ID"]
});
function canonicalRoster(frozen){
 if(frozen?.freezeStatus!=="OWNER_APPROVED_VERSIONED_SNAPSHOT"||frozen.records?.length!==185)
  throw Error("APPROVED_185_ROSTER_REQUIRED");
 const byId=new Map(frozen.records.map(row=>[row["Agent ID"],sourceRole(row)]));
 if(byId.size!==185||frozen.records.filter(x=>x.Role==="Chief").length!==25||
    frozen.records.filter(x=>x.Role==="Specialist").length!==160)
  throw Error("INVALID_CANONICAL_ROSTER");
 for(const row of byId.values()){
  if(!safe(row.agentId)||!safe(row.department)||!safe(row.displayName))throw Error("INVALID_CANONICAL_ROW");
  if(row.role==="Specialist"&&(!byId.has(row.chiefId)||byId.get(row.chiefId).department!==row.department))
   throw Error("INVALID_SPECIALIST_CHIEF");
 }
 return byId;
}
export function buildMemoryBlueprints(frozen,rosterBlobSha){
 const byId=canonicalRoster(frozen);
 if(typeof rosterBlobSha!=="string"||!/^[0-9a-f]{40}$/.test(rosterBlobSha))
  throw Error("ROSTER_BLOB_REQUIRED");
 const profiles=[...byId.values()].map(agent=>({
  canonicalAgentId:agent.agentId,displayName:agent.displayName,role:agent.role,
  chiefId:agent.chiefId,department:agent.department,
  rosterBlobSha,
  scopesProposed:MEMORY_SCOPES.map(scope=>({
   scope,
   runtimePermission:"DENY_BY_DEFAULT",
   externalOwnerGrantRequired:scope!=="individual",
   canReadRealData:false,canWriteRealData:false,
   sharedPromotionAllowed:false
  })),
  dataClasses:DATA_CLASSES,
  proposedRecordFields:[
   "memoryId","canonicalAgentId","department","projectId","scope","dataClass",
   "sourceId","sourceKind","verifiedStatus","consentRef","ownerGrantRef",
   "createdAt","updatedAt","expiresAt","supersedesId","version","contentRef"
  ],
  lifecycle:["candidate","owner_review","accepted","superseded","archived","deletion_pending"],
  operationalStatus:"ARCHITECTURE_ONLY_NO_MEMORY_DATABASE",
  actualDurableMemoryRecords:0,
  ownerAcceptedLearningRules:0,
  retrievalCertification:"NOT_RUN",
  dataSourceAccess:false
 }));
 return {stage:"B",phase:2,mode:"SCHEMA_AND_PERMISSION_PLAN_ONLY",
  a0OperationalCertified:false,rosterBlobSha,
  profiles,
  summary:{blueprints:185,chiefs:25,specialists:160,departments:25,
   durableStores:0,realRecords:0,verifiedRetrievals:0,independentRestartTests:0}
 };
}
const scopeChecks={
 individual:(record,actor)=>actor.agentId===record.canonicalAgentId,
 department:(record,actor)=>actor.department===record.department,
 project:(record,actor)=>actor.projectId!==null&&actor.projectId===record.projectId,
 explicit_shared:()=>false,
 owner_only:()=>false
};
const allowedInput=new Set(["agentId","department","projectId","intent","dataClass","ownerApproved","ownerSession","permissions"]);
export function previewMemoryAccess(record,request,frozen){
 const roster=canonicalRoster(frozen);
 const deny=reason=>({decision:"DENY",reason,realDataAccessAllowed:false,requiresTrustedRuntime:true});
 if(!record||!request||typeof request!=="object"||Array.isArray(request)||
    Object.keys(request).some(k=>!allowedInput.has(k)))
  return deny("MALFORMED_OR_UNTRUSTED_REQUEST");
 const actor=roster.get(request.agentId);
 if(!actor)return deny("UNKNOWN_CANONICAL_AGENT");
 if(request.department!==actor.department)return deny("FORGED_DEPARTMENT");
 if(request.intent!=="read"&&request.intent!=="write"&&request.intent!=="correct"&&request.intent!=="delete")
  return deny("UNSUPPORTED_MEMORY_INTENT");
 if(!MEMORY_SCOPES.includes(record.scope)||!DATA_CLASSES.includes(record.dataClass)||
    !safe(record.canonicalAgentId)||!roster.has(record.canonicalAgentId)||
    record.department!==roster.get(record.canonicalAgentId).department ||
    !emptyOrId(record.projectId)||!emptyOrId(request.projectId))
  return deny("INVALID_MEMORY_DESCRIPTOR");
 if(record.dataClass!=="SYNTHETIC_PUBLIC")
  return deny("RESTRICTED_DATA_NEEDS_SEPARATE_OWNER_CONSENT");
 if(record.scope==="owner_only"||record.scope==="explicit_shared")
  return deny("OWNER_ONLY_OR_UNVERIFIED_SHARING");
 if(request.dataClass!==record.dataClass)return deny("DATA_CLASS_MISMATCH");
 if(!scopeChecks[record.scope](record,request))
  return deny("SCOPE_BOUNDARY_MISMATCH");
 // This is only structural planning, NEVER a grant or record access.
 return {
  decision:"NEEDS_EXTERNAL_PERMISSION_VERIFICATION",
  reason:"STRUCTURAL_SCOPE_MATCH_ONLY",
  realDataAccessAllowed:false,
  requiresTrustedRuntime:true,
  requiredChecks:[
   "Independently authenticated owner or agent session",
   "Exact immutable agent ID and current project/department membership",
   "Source/consent/retention and operation-specific owner grant",
   "A0 emergency-stop, budget and audit policies at the real executor"
  ]
 };
}
export function planMemoryLifecycle(record,action,reason){
 const actions=new Set(["CORRECT","SUPERSEDE","ARCHIVE","REQUEST_DELETE"]);
 if(!record||!safe(record.memoryId)||!safe(record.canonicalAgentId)||
    !actions.has(action)||!safe(reason))throw Error("INVALID_MEMORY_LIFECYCLE_PLAN");
 return {
  planKind:"OFFLINE_NO_WRITE_MEMORY_LIFECYCLE",
  memoryId:record.memoryId,canonicalAgentId:record.canonicalAgentId,
  currentVersion:Number.isInteger(record.version)?record.version:null,
  proposedAction:action,reason,approvalStatus:"NOT_APPROVED",
  memoryRecordChanged:false,actualDataRead:false,actualDataWritten:false,
  recordPurged:false,encryptedBackupReconciled:false,
  requiresSeparateOwnerDecision:true,
  requiresRuntimePermissionAndAudit:true
 };
}
