import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster} from './connected-roster.mjs';
import {normalizeProjectContext,projectEvidenceFor,assertApprovedReviewChain} from './project-evidence-policy.mjs';
import {previewTeamKnowledge} from './team-runtime.mjs';
import {evaluateTeamDeliverable} from './chief-quality.mjs';
const roster=connectedRoster(),agent=roster.find(a=>!a.isChief),other=roster.find(a=>!a.isChief&&a.id!==agent.id);
function payload(){return {projectId:'fictional-project-7',classification:'public-or-synthetic',approved:true,noPrivateDataConfirmed:true,
 assignedAgentIds:[agent.id],sources:[{id:'synthetic-doc-1',projectId:'fictional-project-7',title:'Public example',content:'Synthetic documentation for a mock review.',classification:'public-or-synthetic',ownerApproved:true,allowedAgentIds:[agent.id]}]};}
test('only the specifically assigned specialist can read approved project evidence',()=>{
 const ctx=normalizeProjectContext(payload(),roster);
 assert.equal(ctx.productionDatabaseConnected,false);
 assert.equal(projectEvidenceFor(agent,ctx).length,1);
 assert.deepEqual(projectEvidenceFor(other,ctx),[]);
 assert.deepEqual(projectEvidenceFor({id:'scotty'},ctx),[]);
 assert.equal(projectEvidenceFor(agent,ctx)[0].scope,'project');
});
test('project switch, revoked source and private content classification are all rejected',()=>{
 const mutate=[
  p=>{p.sources[0].projectId='fictional-project-other';},
  p=>{p.sources[0].revoked=true;},
  p=>{p.sources[0].expiresAt='not-a-date';},
  p=>{p.sources[0].expiresAt='2026-01-01T00:00:00Z';},
  p=>{p.sources[0].classification='private';},
  p=>{p.noPrivateDataConfirmed=false;},
  p=>{p.sources[0].allowedAgentIds=[other.id];},
  p=>{p.assignedAgentIds=[];}
 ];
 for(const change of mutate){const p=payload();change(p);assert.throws(()=>normalizeProjectContext(p,roster));}
});
test('specialist-only sources cannot flow into an unapproved chief or SCOTTY synthesis',async()=>{
 const ctx=normalizeProjectContext(payload(),roster);
 await assert.rejects(()=>previewTeamKnowledge({roster,question:'Use specialist '+agent.id+': Review a synthetic test checklist',getEvidence:async()=>[],projectContext:ctx}),/PROJECT_REVIEW_CHAIN_NOT_APPROVED/);
});
test('the entire approved chief review chain can see its owner-granted synthetic source',async()=>{
 const p=payload(),chief=agent.chiefId;
 p.assignedAgentIds=[agent.id,chief,'scotty'];
 p.sources[0].allowedAgentIds=[agent.id,chief,'scotty'];
 const ctx=normalizeProjectContext(p,roster);
 const view=await previewTeamKnowledge({roster,question:'Use specialist '+agent.id+': Review a synthetic test checklist',getEvidence:async()=>[],projectContext:ctx});
 assert.equal(view.readers.length,3);
 assert.ok(view.readers.every(r=>r.references.some(x=>x.scope==='project')));
 assert.equal(assertApprovedReviewChain(ctx,view.plan).permitted,true);
 assert.deepEqual(projectEvidenceFor(other,ctx),[]);
});
test('a chief granted evidence cannot pass project findings to SCOTTY without explicit permission',()=>{
 const p=payload();
 p.assignedAgentIds=[agent.id,agent.chiefId];
 p.sources[0].allowedAgentIds=[agent.chiefId];
 const ctx=normalizeProjectContext(p,roster);
 assert.throws(()=>assertApprovedReviewChain(ctx,{assignments:[{agentId:agent.id,chiefId:agent.chiefId}]}),/PROJECT_CHIEF_HANDOFF_NOT_APPROVED/);
});
test('chief quality gate requires substantive handoff and explicitly leaves owner review pending',()=>{
 const r=evaluateTeamDeliverable({question:'List 3 test cases',answer:'I deployed the application.',results:[{role:'specialist',text:'A draft'}]});
 assert.equal(r.deliverableStatus,'incomplete');
 assert.ok(r.qualitySignals.some(x=>x.code==='NO_CHIEF'));
 assert.ok(r.qualitySignals.some(x=>x.code==='EXECUTION_CLAIM'));
 const done=evaluateTeamDeliverable({question:'Describe a test procedure',answer:'First specify the input constraints, then run the synthetic test. Review the observed result against independent acceptance criteria.',results:[{role:'specialist',text:'Draft'},{role:'department chief',text:'Reviewed with limitations'},{role:'overseer',text:'Final'}]});
 assert.equal(done.deliverableStatus,'owner-review-required');assert.equal(done.ownerAccepted,false);
});
