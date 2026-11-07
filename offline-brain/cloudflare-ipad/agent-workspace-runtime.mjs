/** SCOTTY agent workspace staging runtime: injectable durable store, trusted identity required. */
import {agentProfile} from './personalized-agent-workspaces.mjs';
const clone=x=>structuredClone(x);
function guard(ctx,projectId,permission){if(!ctx?.verifiedByServer||!ctx.subject||!ctx.permissions?.[projectId]?.includes(permission))throw Error('FORBIDDEN');}
function requireStore(store){if(!store||typeof store.transaction!=='function'||typeof store.read!=='function')throw Error('PERSISTENT_STORE_REQUIRED');}
const key=(projectId,kind,id)=>JSON.stringify([projectId,kind,id]);
export class AgentWorkspaceRuntime{
 constructor(store){requireStore(store);this.store=store;}
 async submitAssignment({ctx,projectId,agentId,missionId,job,question='',collaborators=[]}){
  guard(ctx,projectId,'assignment:propose');const agent=agentProfile(agentId);
  if(!missionId||!agent.jobs.includes(job))throw Error('INVALID_ASSIGNMENT');
  for(const id of collaborators)agentProfile(id);
  const id=ctx.nextId?.();if(!id)throw Error('TRUSTED_ID_GENERATOR_REQUIRED');
  const item={id,projectId,agentId,missionId,job,question,collaborators,proposedBy:ctx.subject,status:'pending-owner-approval'};
  await this.store.transaction(async tx=>{if(await tx.read(key(projectId,'assignment',id)))throw Error('DUPLICATE_ID');await tx.write(key(projectId,'assignment',id),item);await tx.append(key(projectId,'audit','events'),{event:'assignment-proposed',id,by:ctx.subject});});
  return clone(item);
 }
 async approveAssignment({ctx,projectId,id}){
  guard(ctx,projectId,'assignment:approve');if(!ctx.roles?.includes('owner'))throw Error('OWNER_REQUIRED');
  return this.store.transaction(async tx=>{const k=key(projectId,'assignment',id),item=await tx.read(k);if(!item||item.status!=='pending-owner-approval')throw Error('INVALID_STATE');const updated={...item,status:'approved',approvedBy:ctx.subject};await tx.write(k,updated);await tx.append(key(projectId,'audit','events'),{event:'assignment-approved',id,by:ctx.subject});return clone(updated);});
 }
 async proposeKnowledge({ctx,projectId,agentId,topic,summary,sources=[]}){
  guard(ctx,projectId,'knowledge:propose');agentProfile(agentId);
  if(!topic?.trim()||!summary?.trim()||!sources.length||sources.some(x=>!x.ref||!x.observedAt))throw Error('EVIDENCE_REQUIRED');
  const id=ctx.nextId?.();if(!id)throw Error('TRUSTED_ID_GENERATOR_REQUIRED');
  const item={id,projectId,agentId,topic,summary,sources,verification:'unverified',status:'pending-owner-review'};
  await this.store.transaction(async tx=>{if(await tx.read(key(projectId,'knowledge',id)))throw Error('DUPLICATE_ID');await tx.write(key(projectId,'knowledge',id),item);await tx.append(key(projectId,'audit','events'),{event:'knowledge-proposed',id,by:ctx.subject});});
  return clone(item);
 }
 async approveKnowledge({ctx,projectId,id,verificationEvidence}){
  guard(ctx,projectId,'knowledge:approve');if(!ctx.roles?.includes('owner')||!verificationEvidence?.trim())throw Error('OWNER_AND_VERIFICATION_REQUIRED');
  return this.store.transaction(async tx=>{const k=key(projectId,'knowledge',id),item=await tx.read(k);if(!item||item.status!=='pending-owner-review')throw Error('INVALID_STATE');const updated={...item,status:'approved',verification:'owner-reviewed',verificationEvidence,approvedBy:ctx.subject};await tx.write(k,updated);await tx.append(key(projectId,'audit','events'),{event:'knowledge-approved',id,by:ctx.subject});return clone(updated);});
 }
 async bio({ctx,projectId,agentId}){
  guard(ctx,projectId,'workspace:read');const agent=agentProfile(agentId);
  const assignments=await this.store.readPrefix(key(projectId,'assignment','').slice(0,-2));
  const knowledge=await this.store.readPrefix(key(projectId,'knowledge','').slice(0,-2));
  return {agent:clone(agent),projectId,assignments:assignments.filter(x=>x.agentId===agentId),missions:[...new Set(assignments.filter(x=>x.agentId===agentId).map(x=>x.missionId))],questions:assignments.filter(x=>x.agentId===agentId&&x.question).map(x=>({assignmentId:x.id,question:x.question})),collaborators:[...new Set(assignments.filter(x=>x.agentId===agentId).flatMap(x=>x.collaborators))],knowledge:knowledge.filter(x=>x.agentId===agentId&&x.status==='approved'),source:'persisted-store'};
 }
 async hud({ctx,projectId,agentId}){const b=await this.bio({ctx,projectId,agentId});return {...b,pendingApprovals:b.assignments.filter(x=>x.status==='pending-owner-approval'),live:false};}
}
export class SyntheticTransactionalStore{
 #rows=new Map();
 async read(k){return clone(this.#rows.get(k)??null);}
 async readPrefix(prefix){return [...this.#rows].filter(([k])=>k.startsWith(prefix)).map(([,v])=>clone(v));}
 async transaction(fn){
  const next=new Map([...this.#rows].map(([k,v])=>[k,clone(v)]));
  const tx={read:async k=>clone(next.get(k)??null),write:async(k,v)=>{next.set(k,clone(v));},append:async(k,v)=>{const list=next.get(k)||[];list.push(clone(v));next.set(k,list);}};
  const result=await fn(tx);this.#rows=next;return result;
 }
}
