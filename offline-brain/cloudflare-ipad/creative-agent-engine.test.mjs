import test from 'node:test';
import assert from 'node:assert/strict';
import {creativeAgentBio,invokeCreativeAgent,CREATIVE_MEDIA_ENGINE_VERSION} from './creative-agent-engine.mjs';

const now=new Date('2026-11-07T16:00:00.000Z');
const ids=['agent-creative-pulse','agent-creative-frame','agent-creative-iris','chief-lumen'];
const intent='a'.repeat(64);
function fixture(agentId='agent-creative-pulse'){
 const task={projectId:'golden-hour-creative',agentId,missionId:'mission-creative-0001',
  revision:'r1',intentDigest:intent,idempotencyKey:'creative-'+agentId,
  description:'Plan a fictional cat UGC creative campaign for a public demo',
  classification:'public-or-synthetic',containsPrivateData:false,
  requestedExternalAction:false};
 const context={source:'scotty-protected-server',now,
  session:{verifiedByScotty:true,provenance:'scotty-server-side-session',
   role:'owner',ownerId:'owner-demo-0001'},
  project:{source:'scotty-server-project-store',active:true,
   id:'golden-hour-creative',allowedAgentIds:ids},
  executionGrant:{source:'scotty-server-execution-grant',
   approvalKind:'mission.execute',ownerReviewConfirmed:true,
   ownerId:'owner-demo-0001',projectId:task.projectId,
   missionId:task.missionId,revision:task.revision,
   intentDigest:task.intentDigest,idempotencyKey:task.idempotencyKey,
   approvedAgentIds:[agentId],maxCalls:1,revoked:false,committed:false,
   paidProviderAllowed:true,externalActionsAllowed:false,
   memoryWritesAllowed:false,expiresAt:'2026-11-07T16:30:00.000Z'}
 };
 return {task,context};
}
function memoryStore(evidence=[]){
 const claims=new Map(),writes=[],fails=[];
 return {
  claims,writes,fails,
  async claim(x){
   const key=x.missionId+':'+x.revision+':'+x.agentId;
   if(claims.has(key))return {status:'EXISTS'};
   const claimId='claim-'+String(claims.size+1).padStart(4,'0');
   claims.set(key,{...x,claimId});
   return {status:'CLAIMED',claimId};
  },
  async approvedEvidence(){return structuredClone(evidence);},
  async complete(x){writes.push(x);return {verified:true};},
  async fail(x){fails.push(x);return {verified:true};}
 };
}
function fakeModel(){
 const calls=[];
 return {calls,async run(args){
   calls.push(args);
   return {text:'Distinct fictional '+args.agentId+' deliverable for an owner-reviewed project. Includes assumptions and shot or caption requirements.'};
 }};
}
test('profiles have four distinct agents, skills, memory namespaces and review chains',()=>{
 assert.equal(CREATIVE_MEDIA_ENGINE_VERSION,'creative-media-engine-v1');
 const bios=ids.map(creativeAgentBio);
 assert.equal(new Set(bios.map(x=>x.name)).size,4);
 assert.equal(new Set(bios.map(x=>x.proposedMemoryNamespace)).size,4);
 assert.deepEqual(bios.map(x=>x.name),['PULSE','FRAME','IRIS','LUMEN']);
 assert.ok(bios.every(x=>x.projects.length===0&&x.missions.length===0&&!x.running&&!x.providerConnected));
 assert.equal(bios[3].reportingChief,'SCOTTY');
 assert.ok(bios.slice(0,3).every(x=>x.reportingChief==='LUMEN'));
});
test('four independent synthetic model invocations each retain unique agent prompt, review and checkpoint',async()=>{
 const store=memoryStore();
 const model=fakeModel();
 for(const agentId of ids){
   const {context,task}=fixture(agentId);
   const result=await invokeCreativeAgent({context,task,store,model});
   assert.equal(result.status,'AWAITING_REVIEW');
   assert.equal(result.agentId,agentId);
   assert.equal(result.reviewerId,agentId==='chief-lumen'?'scotty':'chief-lumen');
   assert.equal(result.checkpointVerified,true);
   assert.equal(result.memoryWrites,0);
   assert.equal(result.modelCalls,1);
   assert.equal(result.published,false);
 }
 assert.equal(model.calls.length,4);
 assert.equal(store.writes.length,4);
 assert.equal(new Set(model.calls.map(c=>c.instruction)).size,4);
 for(const c of model.calls){
  assert.ok(c.instruction.includes(c.agentId==='chief-lumen'?'SCOTTY':'LUMEN'));
  assert.equal(c.input.projectId,'golden-hour-creative');
  assert.equal(c.maxTokens,700);
 }
});
test('second request cannot rerun an already reserved agent',async()=>{
 const store=memoryStore(),model=fakeModel(),{context,task}=fixture();
 const first=await invokeCreativeAgent({context,task,store,model});
 assert.equal(first.modelCalls,1);
 const second=await invokeCreativeAgent({context,task,store,model});
 assert.equal(second.status,'ALREADY_RESERVED_NO_RETRY');
 assert.equal(second.modelCalls,0);
 assert.equal(model.calls.length,1);
});
test('only exact approved agent and project scoped evidence reaches the model',async()=>{
 const note={id:'note-pulse-001',ownerReviewed:true,projectId:'golden-hour-creative',
  scope:'agent',agentId:'agent-creative-pulse',
  title:'Public planning preference',content:'Prefer a bright opening hook and fast caption.'};
 const store=memoryStore([note]),model=fakeModel();
 const {context,task}=fixture();
 const result=await invokeCreativeAgent({context,task,store,model});
 assert.deepEqual(result.evidenceIds,['note-pulse-001']);
 assert.equal(model.calls[0].input.evidence[0].content,note.content);
 const other=fixture('agent-creative-iris');
 const before=model.calls.length;
 await assert.rejects(()=>invokeCreativeAgent({...other,store:memoryStore([note]),model}),/CREATIVE_EVIDENCE_UNAVAILABLE/);
 assert.equal(model.calls.length,before);
 const crossProject={...note,projectId:'eirden-atelier'};
 await assert.rejects(()=>invokeCreativeAgent({...other,store:memoryStore([crossProject]),model}),/CREATIVE_EVIDENCE_UNAVAILABLE/);
 assert.equal(model.calls.length,before);
});
test('preview-only approval and client-supplied approval flags cannot authorize a model call',async()=>{
 const original=fixture();
 const model=fakeModel(),store=memoryStore();
 for(const tamper of [
 {context:{...original.context,executionGrant:{...original.context.executionGrant,approvalKind:'mission.preview'}}},
 {context:{...original.context,session:{...original.context.session,provenance:'activepieces-json'}}},
 {context:{...original.context,executionGrant:{...original.context.executionGrant,revoked:true}}},
 {context:{...original.context,executionGrant:{...original.context.executionGrant,paidProviderAllowed:false}}},
 {context:{...original.context,executionGrant:{...original.context.executionGrant,approvedAgentIds:['agent-creative-iris']}}},
 {context:{...original.context,project:{...original.context.project,allowedAgentIds:['agent-creative-iris']}}},
 {task:{...original.task,containsPrivateData:true,ownerApproved:true}},
 {task:{...original.task,requestedExternalAction:true}},
 {task:{...original.task,projectId:'eirden-atelier'}},
 {task:{...original.task,idempotencyKey:'changed-key'}}
 ]){
  await assert.rejects(()=>invokeCreativeAgent({...original,...tamper,store,model}));
 }
 assert.equal(model.calls.length,0);
 assert.equal(store.claims.size,0);
});
test('model failure is marked non-retryable and never silently calls provider again',async()=>{
 const store=memoryStore();
 const model={calls:0,async run(){this.calls++;throw Error('Provider unavailable')}};
 const {context,task}=fixture();
 await assert.rejects(()=>invokeCreativeAgent({context,task,store,model}),/CREATIVE_MODEL_OR_CHECKPOINT_FAILED/);
 assert.equal(model.calls,1);
 assert.equal(store.fails.length,1);
 assert.equal(store.fails[0].retryAllowed,false);
 const again=await invokeCreativeAgent({context,task,store,model});
 assert.equal(again.status,'ALREADY_RESERVED_NO_RETRY');
 assert.equal(model.calls,1);
});
test('absent trusted model or durable store fails before reservation',async()=>{
 const {context,task}=fixture();
 const store=memoryStore();
 await assert.rejects(()=>invokeCreativeAgent({context,task,store,model:null}),/AUTHORIZED_MODEL_AND_DURABLE_STORE_REQUIRED/);
 assert.equal(store.claims.size,0);
 await assert.rejects(()=>invokeCreativeAgent({context,task,store:null,model:fakeModel()}));
});
