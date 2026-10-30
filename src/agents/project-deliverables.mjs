/** Export owner-reviewed released work only. Never converts an unreleased AI draft to a final file. */
const safe=s=>String(s||'').replace(/[\r\n\0]/g,' ').slice(0,180);
const slug=s=>safe(s).replace(/[^a-z0-9_-]/gi,'-').slice(0,70)||'unnamed';
export function buildReleasedDeliverable(detail,{projectId,stepId=null,revision,format='md'}={}){
 if(!detail||detail.blocker||!detail.plan||!detail.mission)throw Error('DELIVERABLE_ACCESS_OR_SOURCE_UNAVAILABLE');
 if(format!=='md'&&format!=='txt')throw Error('UNSUPPORTED_DELIVERABLE_FORMAT');
 if(!Number.isInteger(revision)||revision!==Number(detail.plan.revision))throw Error('DELIVERABLE_REVISION_CHANGED');
 const spec=detail.plan.spec||{},steps=spec.steps||[],results=detail.mission.results||[],reviews=detail.mission.review||[];
 const chosen=stepId?steps.filter(s=>s.id===stepId):steps;
 if(chosen.length===0||stepId&&chosen.length!==1)throw Error('DELIVERABLE_STEP_NOT_FOUND');
 const blocks=[],metadata=[];
 for(const step of chosen){
  const output=results.find(r=>r.stepId===step.id&&r.revision===revision);
  const ownerReview=reviews.find(r=>r.stepId===step.id&&r.revision===revision&&r.decision==='approved');
  if(!output||output.status!=='released'||!ownerReview||typeof output.text!=='string'||!output.text.trim())
   throw Error('DELIVERABLE_NOT_RELEASED');
  const title=safe(step.deliverable||step.id);
  const body=output.text.trim().slice(0,150000);
  const refs=[...(step.sourceIds||[]),...(step.evidenceIds||[])].map(safe).slice(0,50);
  metadata.push({stepId:step.id,author:step.agentId,ownerReviewedAt:ownerReview.reviewedAt||null,sourceIds:refs});
  blocks.push({title,text:body,author:safe(step.agentId),refs});
 }
 const heading=safe(spec.goal||'SCOTTY mission deliverable');
 const isMd=format==='md';
 const parts=[isMd?'# '+heading:heading,'','Project: '+safe(projectId),
  'Mission revision: '+revision,'Owner release verified: YES',
  'Exported at: generated at download time','',
  'Important: owner release approves the draft for delivery; it does not independently verify every factual claim.',''];
 for(const block of blocks){
  parts.push(isMd?'## '+block.title:block.title.toUpperCase(),'Agent: '+block.author,
   'Approved source IDs: '+(block.refs.join(', ')||'No evidence IDs recorded'),'',
   block.text,'');
 }
 return {filename:'scotty-'+slug(projectId)+'-'+slug(stepId||'full-mission')+'-r'+revision+'.'+format,
  content:parts.join('\n').slice(0,750000),mime:isMd?'text/markdown; charset=utf-8':'text/plain; charset=utf-8',
  format,steps:metadata,ownerReleaseVerified:true,unreviewedDraftsIncluded:false,
  modelCalls:0,providerWrites:0};
}
