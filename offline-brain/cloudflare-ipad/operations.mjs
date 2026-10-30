/** Owner-only read of D1 mission counts; no model or project content. */
export async function operatingSnapshot(db,now=new Date()){
 if(typeof db?.prepare!=='function')return {memoryReady:false,counts:{},quota:null};
 const q=async sql=>(await db.prepare(sql).bind().all()).results||[];
 const rows=await q('SELECT status, COUNT(*) AS count FROM brain_missions GROUP BY status');
 const running=await q("SELECT id,updated_at FROM brain_missions WHERE status='running' ORDER BY updated_at ASC LIMIT 20");
 const counts=Object.fromEntries(rows.map(r=>[String(r.status),Number(r.count)]));
 const stale=running.filter(r=>Number.isFinite(Date.parse(r.updated_at))&&
  now.getTime()-Date.parse(r.updated_at)>600000).map(r=>({missionId:r.id,lastCheckpoint:r.updated_at}));
 const cutoff=new Date(now.getTime()-600000).toISOString();
 const staleTotalQuery=await db.prepare("SELECT COUNT(*) AS count FROM brain_missions WHERE status='running' AND updated_at < ?")
  .bind(cutoff).all();
 const staleRunningTotal=Number(staleTotalQuery.results?.[0]?.count||0);
 return {memoryReady:true,counts,total:Object.values(counts).reduce((a,b)=>a+b,0),
  staleRunningSample:stale,staleRunningTotal,sampleLimit:20,
  requiresOwnerReview:Number(counts.incomplete||0)+staleRunningTotal,
  recoveryPolicy:{manualOnly:true,minimumStaleMinutes:10,preservesSavedStages:true,
    compareAndSwap:true,automaticRetry:false,ownerApprovedMutationRequired:true},
  quota:null,providerCalls:null,useProviderDashboardForQuota:true,automaticallyRetry:false};
}

/** A running mission older than ten minutes can be marked incomplete by an owner.
 * Re-checks the exact checkpoint timestamp in the UPDATE: no retry, delete or AI call.
 */
const MISSION_ID=/^[a-z0-9-]{16,80}$/i;
const STALE_AFTER_MS=600000;
const stamped=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
export async function staleMissionReview(db,input,now=new Date()){
 if(typeof db?.prepare!=='function')throw Error('MISSION_STORAGE_NOT_CONNECTED');
 if(!input||!MISSION_ID.test(input.missionId||''))throw Error('INVALID_MISSION_ID');
 if(input.stage!=='preview'&&input.stage!=='apply')throw Error('INVALID_RECOVERY_STAGE');
 if(input.stage==='apply'&&
  (input.ownerApproved!==true||input.reviewAcknowledged!==true||!stamped(input.expectedUpdatedAt)))
  throw Error('OWNER_RECOVERY_REVIEW_REQUIRED');
 const r=await db.prepare('SELECT id,status,result_json,updated_at FROM brain_missions WHERE id=? LIMIT 1')
  .bind(input.missionId).all();
 const row=r.results?.[0];
 if(!row)throw Error('MISSION_NOT_FOUND');
 const age=now.getTime()-Date.parse(row.updated_at);
 if(row.status!=='running'||!Number.isFinite(age)||age<STALE_AFTER_MS)throw Error('MISSION_NOT_STALE_OR_ALREADY_UPDATED');
 if(input.stage==='preview')return {missionId:row.id,stage:'preview',status:'running',
  expectedUpdatedAt:row.updated_at,staleMinutes:Math.floor(age/60000),
  proposedStatus:'incomplete',willRunAI:false,willRetry:false,
  willDeleteSavedResults:false,requiresOwnerApproval:true,
  warning:'A slow worker may still finish. Only mark this checkpoint incomplete after investigating; exact timestamp prevents overwriting a newer update.'};
 if(input.expectedUpdatedAt!==row.updated_at)throw Error('MISSION_CHECKPOINT_CHANGED');
 // JSON mutation retains all saved stage findings and question context. The condition
 // prevents overwriting an active worker checkpoint updated after this preview.
 const cutoff=new Date(now.getTime()-STALE_AFTER_MS).toISOString();
 const write=await db.prepare(`UPDATE brain_missions
  SET status='incomplete',
   result_json=json_set(result_json,
    '$.status','incomplete',
    '$.error','OWNER_REVIEWED_STALE_MISSION',
    '$.retryAttempted',json('false')),
   updated_at=?
  WHERE id=? AND status='running' AND updated_at=? AND updated_at<?`)
  .bind(now.toISOString(),input.missionId,input.expectedUpdatedAt,cutoff).run();
 if(write.meta?.changes!==1)throw Error('MISSION_CHECKPOINT_CHANGED');
 const check=await db.prepare('SELECT status,result_json,updated_at FROM brain_missions WHERE id=? LIMIT 1')
  .bind(input.missionId).all();
 const saved=check.results?.[0];
 let result;
 try{result=JSON.parse(saved?.result_json||'null');}catch{throw Error('MISSION_READBACK_UNVERIFIED');}
 if(saved?.status!=='incomplete'||saved?.updated_at!==now.toISOString()||
   result?.status!=='incomplete'||result?.error!=='OWNER_REVIEWED_STALE_MISSION'||
   result?.retryAttempted!==false)throw Error('MISSION_READBACK_UNVERIFIED');
 return {missionId:input.missionId,status:'incomplete',verified:true,
  preservedStages:Array.isArray(result.results)?result.results.length:0,
  retryAttempted:false,modelCalls:0,deleted:false};
}
