/**
 * SCOTTY Phase B2 — deterministic, process-local SYNTHETIC memory laboratory.
 *
 * This is an offline test harness, not a memory service. It intentionally has
 * no network, filesystem, database, auth provider, model, timers or deployment
 * hooks. Its test-owner context can be minted by any caller; NEVER use it as
 * production authentication or call it from an HTTP route.
 *
 * Only fictional text beginning with "SYNTHETIC:" is accepted. Real content,
 * private data, credentials and production exports must never enter this lab.
 */
import {createHash} from "node:crypto";

const hash=s=>createHash("sha256").update(s).digest("hex");
const text=s=>typeof s==="string"&&s.trim().length>0&&s.length<=1024;
const id=s=>typeof s==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(s);
const synthetic=s=>text(s)&&s.startsWith("SYNTHETIC:");
const validScope=new Set(["individual","department","project","explicit_shared","owner_only"]);
const validStates=new Set(["candidate","accepted","superseded","archived","deleted"]);
const own=Object.prototype.hasOwnProperty;

function canonical(frozen){
 if(frozen?.freezeStatus!=="OWNER_APPROVED_VERSIONED_SNAPSHOT"||
    frozen.records?.length!==185)throw Error("FROZEN_ROSTER_REQUIRED");
 const agents=new Map(frozen.records.map(r=>[r["Agent ID"],{
   id:r["Agent ID"],dept:r.Department,role:r.Role,chief:r["Chief ID"]
 }]));
 if(agents.size!==185||[...agents.values()].filter(x=>x.role==="Chief").length!==25||
    [...agents.values()].filter(x=>x.role==="Specialist").length!==160)
  throw Error("INVALID_CANONICAL_ROSTER");
 for(const x of agents.values()){
  if(!id(x.id)||!text(x.dept))throw Error("INVALID_IDENTITY");
  if(x.role==="Specialist"&&(!agents.has(x.chief)||agents.get(x.chief).dept!==x.dept))
   throw Error("INVALID_DEPARTMENT_LINK");
 }
 return agents;
}
const copy=x=>structuredClone(x);

export class SyntheticMemoryLab {
 #agents; #contexts=new WeakMap(); #records=new Map(); #events=[]; #sequence=0;
 #at;
 constructor(frozen,{clock="2026-11-07T12:00:00.000Z"}={}){
  this.#agents=canonical(frozen);
  if(!text(clock)||!Number.isFinite(Date.parse(clock)))throw Error("INVALID_TEST_CLOCK");
  this.#at=Date.parse(clock);
 }
 /** Synthetic sessions have no security meaning outside this lab. */
 testActor(agentId,{projects=[]}={}){
  if(!this.#agents.has(agentId)||!Array.isArray(projects)||projects.some(p=>!id(p)))
   throw Error("UNKNOWN_TEST_AGENT_OR_PROJECT");
  const handle=Object.freeze({});
  this.#contexts.set(handle,{type:"agent",id:agentId,projects:new Set(projects)});
  return handle;
 }
 testOwner(){
  const handle=Object.freeze({});
  this.#contexts.set(handle,{type:"owner"});
  return handle;
 }
 #actor(handle){
  if(!handle||typeof handle!=="object")throw Error("TEST_CONTEXT_REQUIRED");
  const ctx=this.#contexts.get(handle);
  if(!ctx)throw Error("FORGED_OR_FOREIGN_TEST_CONTEXT");
  return ctx;
 }
 #owner(handle){
  if(this.#actor(handle).type!=="owner")throw Error("SYNTHETIC_OWNER_CONTEXT_REQUIRED");
 }
 #event(type,entry){
  this.#sequence++;
  this.#events.push({seq:this.#sequence,type,...entry,at:new Date(this.#at).toISOString()});
 }
 #get(memoryId){
  if(!id(memoryId)||!this.#records.has(memoryId))throw Error("UNKNOWN_SYNTHETIC_MEMORY");
  return this.#records.get(memoryId);
 }
 #exposable(record,ctx){
  if(ctx.type!=="agent"||record.status!=="accepted"||
     record.content===null||(record.expiresAt!==null&&Date.parse(record.expiresAt)<=this.#at))
   return false;
  const who=this.#agents.get(ctx.id);
  // Project-tagged notes require current fixture membership even when shared.
  if(record.projectId!==null&&!ctx.projects.has(record.projectId))return false;
  if(record.scope==="individual")return record.canonicalAgentId===ctx.id;
  if(record.scope==="department")return record.department===who.dept;
  if(record.scope==="project")return record.projectId!==null&&ctx.projects.has(record.projectId);
  if(record.scope==="explicit_shared")return record.recipientIds.includes(ctx.id);
  return false; // owner_only and all unknown scopes are never agent-readable
 }
 #redact(record){
  const {content,recipientIds,sourceId,consentRef,expiresAt,...metadata}=record;
  return copy({...metadata,content});
 }
 /** Candidate notes are invisible until an explicit synthetic owner test decision. */
 addCandidate(actor,input={}){
  if(!input||typeof input!=="object"||Array.isArray(input)||
     Object.keys(input).some(k=>!["content","projectId","sourceId","expiresAt"].includes(k)))
   throw Error("UNSUPPORTED_SYNTHETIC_INPUT");
  const {content,projectId=null,sourceId="synthetic-test",expiresAt=null}=input;
  const ctx=this.#actor(actor);
  if(ctx.type!=="agent"||!synthetic(content)||!id(sourceId)||
    !(projectId===null||id(projectId))||
    (projectId!==null&&!ctx.projects.has(projectId))||
    !(expiresAt===null||(text(expiresAt)&&Date.parse(expiresAt)>this.#at)))
   throw Error("INVALID_SYNTHETIC_CANDIDATE");
  const owner=this.#agents.get(ctx.id);
  const existing=[...this.#records.values()].find(r=>
   r.canonicalAgentId===ctx.id&&r.projectId===projectId&&r.content===content&&
   ["candidate","accepted"].includes(r.status)&&
   (r.expiresAt===null||Date.parse(r.expiresAt)>this.#at));
  if(existing)return {memoryId:existing.memoryId,status:existing.status,
   persistent:false,ownerAccepted:false,deduplicated:true};
  const memoryId="synthetic-memory-"+(this.#sequence+1);
  const record={
   memoryId,canonicalAgentId:ctx.id,department:owner.dept,projectId,
   scope:"individual",recipientIds:[],dataClass:"SYNTHETIC_PUBLIC",
   content,sourceId,consentRef:null,
   expiresAt:expiresAt===null?null:new Date(expiresAt).toISOString(),
   status:"candidate",version:1,supersedesId:null
  };
  this.#records.set(memoryId,record);
  this.#event("candidate-created",{memoryId,actorId:ctx.id});
  return {memoryId,status:"candidate",persistent:false,ownerAccepted:false};
 }
 acceptForTest(owner,memoryId){
  this.#owner(owner);
  const record=this.#get(memoryId);
  if(record.status!=="candidate")throw Error("ONLY_CANDIDATES_CAN_BE_ACCEPTED");
  record.status="accepted";
  this.#event("synthetic-owner-accepted",{memoryId});
  return {memoryId,acceptedInSimulation:true,realOwnerApproval:false};
 }
 /** A test-only owner promotion, NEVER a real consent or executable grant. */
 shareForTest(owner,memoryId,input={}){
  this.#owner(owner);
  if(!input||typeof input!=="object"||Array.isArray(input)||
     Object.keys(input).some(k=>!["scope","recipientIds","consentRef"].includes(k)))
   throw Error("UNSUPPORTED_SYNTHETIC_SHARING");
  const {scope,recipientIds=[],consentRef}=input;
  const record=this.#get(memoryId);
  if(record.status!=="accepted"||!validScope.has(scope)||
     !["department","project","explicit_shared"].includes(scope)||
     !id(consentRef)||!consentRef.startsWith("synthetic-consent-")||
     !Array.isArray(recipientIds))throw Error("SYNTHETIC_SHARING_NOT_APPROVED");
  if(scope==="project"&&record.projectId===null)throw Error("PROJECT_MEMBERSHIP_REQUIRED");
  if(scope==="explicit_shared"&&
    (recipientIds.length===0||new Set(recipientIds).size!==recipientIds.length||
     recipientIds.some(x=>!this.#agents.has(x))))
     throw Error("INVALID_EXPLICIT_RECIPIENTS");
  if(scope!=="explicit_shared"&&recipientIds.length>0)throw Error("UNEXPECTED_RECIPIENTS");
  record.scope=scope;
  record.recipientIds=scope==="explicit_shared"?[...recipientIds]:[];
  record.consentRef=consentRef;
  this.#event("synthetic-owner-shared",{memoryId,scope});
  return {memoryId,scope,realConsentVerified:false};
 }
 find(actor,input={}){
  if(!input||typeof input!=="object"||Array.isArray(input)||
     Object.keys(input).some(k=>!["query","projectId"].includes(k)))
   throw Error("UNSUPPORTED_SYNTHETIC_QUERY");
  const {query,projectId=null}=input;
  const ctx=this.#actor(actor);
  if(ctx.type!=="agent"||!text(query)||query.length>120||
     !(projectId===null||id(projectId)))throw Error("INVALID_SYNTHETIC_SEARCH");
  const needle=query.toLocaleLowerCase("en");
  const result=[];
  for(const record of this.#records.values()){
   if(projectId!==null&&record.projectId!==projectId)continue;
   if(!this.#exposable(record,ctx))continue;
   if(record.content.toLocaleLowerCase("en").includes(needle))
    result.push(this.#redact(record));
  }
  return result;
 }
 correctForTest(owner,memoryId,replacement,reason){
  this.#owner(owner);
  const record=this.#get(memoryId);
  if(record.status!=="accepted"||!synthetic(replacement)||!text(reason))
   throw Error("UNAPPROVED_SYNTHETIC_CORRECTION");
  const newId="synthetic-memory-"+(this.#sequence+1);
  const next={...copy(record),memoryId:newId,content:replacement,
    status:"candidate",version:record.version+1,supersedesId:record.memoryId,
    scope:"individual",recipientIds:[],consentRef:null};
  this.#records.set(newId,next);
  record.status="superseded";
  this.#event("synthetic-correction-pending",{memoryId:newId,supersedesId:memoryId});
  return {memoryId:newId,needsSeparateSyntheticAcceptance:true,realCorrectionPerformed:false};
 }
 archiveForTest(owner,memoryId){
  this.#owner(owner);
  const record=this.#get(memoryId);
  if(record.status!=="accepted")throw Error("NOT_ACCEPTED");
  record.status="archived";
  this.#event("synthetic-archived",{memoryId});
  return {memoryId,visible:false,realArchivePerformed:false};
 }
 deleteForTest(owner,memoryId){
  this.#owner(owner);
  const record=this.#get(memoryId);
  if(record.status==="deleted")throw Error("ALREADY_DELETED");
  // Remove fictional text from this disposable store; keep only a tombstone.
  record.content=null;
  record.status="deleted";
  record.recipientIds=[];
  record.consentRef=null;
  this.#event("synthetic-tombstone",{memoryId});
  return {memoryId,deletedFromSimulation:true,realDataDeletion:false,backupsReconciled:false};
 }
 /** Test-only erasure across correction lineage, NOT a real backup deletion. */
 deleteLineageForTest(owner,memoryId){
  this.#owner(owner);
  let root=this.#get(memoryId);
  const visited=new Set();
  while(root.supersedesId!==null){
   if(visited.has(root.memoryId))throw Error("CORRUPT_SYNTHETIC_LINEAGE");
   visited.add(root.memoryId);
   root=this.#get(root.supersedesId);
  }
  const members=new Set([root.memoryId]);
  let changed=true;
  while(changed){
   changed=false;
   for(const r of this.#records.values()){
    if(r.supersedesId!==null&&members.has(r.supersedesId)&&!members.has(r.memoryId)){
     members.add(r.memoryId);changed=true;
    }
   }
  }
  for(const key of members){
   const rec=this.#get(key);
   rec.content=null;rec.status="deleted";rec.recipientIds=[];rec.consentRef=null;
  }
  this.#event("synthetic-lineage-tombstone",{memoryId,versions:members.size});
  return {versionsTombstoned:members.size,realDataDeletion:false,
   realBackupsReconciled:false};
 }
 /** Explicit simulated TTL purge, since hiding alone does not erase bytes. */
 purgeExpiredForTest(owner){
  this.#owner(owner);
  let count=0;
  for(const rec of this.#records.values()){
   if(rec.expiresAt!==null&&Date.parse(rec.expiresAt)<=this.#at&&rec.content!==null){
    rec.content=null;rec.status="deleted";rec.recipientIds=[];rec.consentRef=null;
    count++;
   }
  }
  this.#event("synthetic-expiry-purge",{recordsTombstoned:count});
  return {recordsTombstoned:count,realRetentionJobExecuted:false,
   realBackupDeletionConfirmed:false};
 }
 advanceClockForTest(owner,clock){
  this.#owner(owner);
  const next=Date.parse(clock);
  if(!Number.isFinite(next)||next<this.#at)throw Error("TEST_CLOCK_MUST_BE_MONOTONIC");
  this.#at=next;
  this.#event("clock-advanced",{});
 }
 auditForTest(owner){
  this.#owner(owner);
  return copy(this.#events);
 }
 /** Process-to-process imitation; output stays memory-only and fictional. */
 exportForRestartTest(owner){
  this.#owner(owner);
  const payload={
   kind:"SCOTTY_OFFLINE_SYNTHETIC_RESTART_FIXTURE",
   schemaVersion:1,clock:new Date(this.#at).toISOString(),
   sequence:this.#sequence,records:[...this.#records.values()].map(copy),
   events:copy(this.#events)
  };
  const json=JSON.stringify(payload);
  return {payload:json,digest:hash(json),isActualBackup:false,containsRealData:false};
 }
 static restoreForTest(frozen,exportObject){
  if(!exportObject||typeof exportObject.payload!=="string"||
     exportObject.digest!==hash(exportObject.payload)||
     exportObject.isActualBackup!==false||exportObject.containsRealData!==false)
    throw Error("INVALID_SYNTHETIC_RESTART_FIXTURE");
  let data;
  try{data=JSON.parse(exportObject.payload)}catch{throw Error("INVALID_SYNTHETIC_RESTART_FIXTURE")}
  if(data.kind!=="SCOTTY_OFFLINE_SYNTHETIC_RESTART_FIXTURE"||
     data.schemaVersion!==1||!Array.isArray(data.records)||!Array.isArray(data.events)||
     !Number.isInteger(data.sequence)||data.sequence<0)throw Error("INVALID_SYNTHETIC_RESTART_FIXTURE");
  const lab=new SyntheticMemoryLab(frozen,{clock:data.clock});
  const ids=new Set();
  for(const rec of data.records){
   if(!id(rec.memoryId)||ids.has(rec.memoryId)||
      !lab.#agents.has(rec.canonicalAgentId)||
      !validScope.has(rec.scope)||!validStates.has(rec.status)||
      rec.department!==lab.#agents.get(rec.canonicalAgentId).dept||
      rec.dataClass!=="SYNTHETIC_PUBLIC"||
      !(rec.status==="deleted"?rec.content===null:synthetic(rec.content))||
      !Array.isArray(rec.recipientIds)||rec.recipientIds.some(x=>!lab.#agents.has(x)))
    throw Error("INVALID_SYNTHETIC_RECORD");
   ids.add(rec.memoryId);
   lab.#records.set(rec.memoryId,copy(rec));
  }
  if(data.events.some(e=>!Number.isInteger(e.seq)||!text(e.type)))
   throw Error("INVALID_SYNTHETIC_AUDIT");
  lab.#sequence=data.sequence;
  lab.#events=copy(data.events);
  return lab; // Test sessions are intentionally NOT preserved across restart.
 }
 getStatus(){
  return {mode:"SYNTHETIC_OFFLINE_ONLY",records:this.#records.size,
   auditEvents:this.#events.length,persistentDatabase:false,
   realOwnerAuthentication:false,realMemoryAccess:false};
 }
}
