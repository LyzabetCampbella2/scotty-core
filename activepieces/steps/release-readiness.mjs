/**
 * SCOTTY manual launch readiness dashboard, public/synthetic status only.
 * Input: rows = output of Tables / Find Records for "Launch Readiness Gates".
 * Does not authorize deployment, spending, private memory or AI execution.
 */
export const code=async(inputs)=>{
 const raw=inputs?.rows;
 const parsed=typeof raw==='string'?JSON.parse(raw):raw;
 const rows=Array.isArray(parsed)?parsed:parsed?.records;
 if(!Array.isArray(rows)||rows.length!==11)throw Error('INCOMPLETE_STAGING_GATE_SET');
 const cell=(r,name)=>{
   const c=r?.cells||{};
   if(typeof c[name]==='string')return c[name];
   const val=Object.values(c).find(x=>x&&typeof x==='object'&&x.fieldName===name)?.value;
   return typeof val==='string'?val:'';
 };
 const expected=new Set(Array.from({length:11},(_,i)=>'G'+String(i+1).padStart(2,'0')));
 const seen=new Set();
 const allowedStatuses=new Set([
   'Verified staging preview','Blocked — not deployed',
   'Blocked — owner approval required','Blocked — implementation required',
   'Blocked — untested'
 ]);
 const allowedAreas=new Set(['Development tests','Owner approval','Database','Security','Execution','Release']);
 const gates=[];
 for(const r of rows){
   const id=cell(r,'Gate ID'),status=cell(r,'Status'),name=cell(r,'Gate');
   const area=cell(r,'Area'),evidence=cell(r,'Evidence'),next=cell(r,'Required Next Proof');
   if(!expected.has(id)||seen.has(id)||!allowedStatuses.has(status)||
      !allowedAreas.has(area)||!name||name.length>130||
      !evidence||evidence.length>350||!next||next.length>350)
     throw Error('INVALID_OR_DUPLICATE_LAUNCH_GATE');
   seen.add(id);
   // Stage 5-11 represent protected approvals, database, deployment, ACL,
   // private memory, costs and final QA: cannot be promoted to "verified"
   // by changing an Activepieces table or passing an automated test.
   if(Number(id.slice(1))>=5&&status==='Verified staging preview')
     throw Error('PROTECTED_GATE_CANNOT_BE_VERIFIED_FROM_ACTIVEPIECES_TABLE');
   gates.push({gateId:id,name,area,status,requiredNextProof:next});
 }
 if(seen.size!==11)throw Error('MISSING_REQUIRED_LAUNCH_GATE');
 const verified=gates.filter(x=>x.status==='Verified staging preview');
 const blocked=gates.filter(x=>x.status!=='Verified staging preview');
 return {
   type:'SCOTTY_STAGING_READINESS',
   status:'DEVELOPMENT_PREVIEW_ONLY',
   counts:{total:gates.length,previewVerified:verified.length,blocked:blocked.length},
   verifiedPreviewGates:verified.sort((a,b)=>a.gateId.localeCompare(b.gateId)),
   blockers:blocked.sort((a,b)=>a.gateId.localeCompare(b.gateId)),
   aiExecutionReady:false,permissionedMemoryReady:false,
   ownerMissionApprovalReady:false,productionReleaseReady:false,
   canExecute:false,canPublish:false,canDeploy:false,
   modelCalls:0,memoryWrites:0,externalActions:0,
   warning:'Read-only staging checklist; flags cannot grant actual backend authorization. Real owner review and security acceptance remain required.'
 };
};
