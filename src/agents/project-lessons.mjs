/** Draft reusable project lessons from OWNER review notes, never model-generated facts. */
export function lessonCandidatesFromCorrections(projectId,agents){
 const candidates=[],seen=new Set();
 for(const a of Array.isArray(agents)?agents:[]){
  for(const w of Array.isArray(a.work)?a.work:[]){
   for(const correction of Array.isArray(w.corrections)?w.corrections:[]){
    if(!['rejected','revision_requested'].includes(String(correction.decision||'')))continue;
    const feedback=String(correction.note||'').trim();
    if(feedback.length<12||feedback.length>2000)continue;
    const key=[projectId,a.id,w.missionId,w.stepId,feedback.toLowerCase()].join('|');
    if(seen.has(key))continue;seen.add(key);
    const title=String(w.deliverable||'the assigned work').slice(0,110);
    candidates.push({projectId,agentId:a.id,agentName:a.name||a.id,
     missionId:w.missionId||null,stepId:w.stepId||null,sourceDecision:correction.decision,
     sourceNote:feedback,proposedLesson:'Before releasing '+title+', review the owner correction: '+feedback,
     approved:false,automaticallyApplied:false,memoryUpdated:false,ownerReviewRequired:true,
     evidenceRequired:'Review the original mission, applicable evidence and current project permissions.'});
    if(candidates.length>=30)return candidates;
   }
  }
 }
 return candidates;
}
