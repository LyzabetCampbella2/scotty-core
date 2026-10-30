import test from 'node:test';
import assert from 'node:assert/strict';
import {connectedRoster} from './connected-roster.mjs';
import {normalizeProjectContext,projectEvidenceFor} from './project-evidence-policy.mjs';
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
  p=>{p.sources[0].classification='private';},
  p=>{p.noPrivateDataConfirmed=false;},
  p=>{p.sources[0].allowedAgentIds=[other.id];},
  p=>{p.assignedAgentIds=[];}
 ];
 for(const change of mutate){const p=payload();change(p);assert.throws(()=>normalizeProjectContext(p,roster));}
});
test('preview never reads unapproved source for an unrelated department chief',async()=>{
 const ctx=normalizeProjectContext(payload(),roster);
 const p=await previewTeamKnowledge({roster,question:'Use specialist '+agent.id+': Review a synthetic test checklist',getEvidence:async()=>[],projectContext:ctx});
 assert.ok(p.readers.length>=2);
 assert.ok(p.readers[0].references.some(r=>r.scope==='project'));
 assert.ok(p.readers.slice(1).every(r=>!r.references.some(s=>s.scope==='project')));
});
test('chief quality gate requires substantive handoff and explicitly leaves owner review pending',()=>{
 const r=evaluateTeamDeliverable({question:'List 3 test cases',answer:'I deployed the application.',results:[{role:'specialist',text:'A draft'}]});
 assert.equal(r.deliverableStatus,'incomplete');
 assert.ok(r.qualitySignals.some(x=>x.code==='NO_CHIEF'));
 assert.ok(r.qualitySignals.some(x=>x.code==='EXECUTION_CLAIM'));
 const done=evaluateTeamDeliverable({question:'Describe a test procedure',answer:'First specify the input constraints, then run the synthetic test. Review the observed result against independent acceptance criteria.',results:[{role:'specialist',text:'Draft'},{role:'department chief',text:'Reviewed with limitations'},{role:'overseer',text:'Final'}]});
 assert.equal(done.deliverableStatus,'owner-review-required');assert.equal(done.ownerAccepted,false);
});
