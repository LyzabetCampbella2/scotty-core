/** Owner-only read of D1 mission counts; no model or project content. */
export async function operatingSnapshot(db,now=new Date()){
 if(typeof db?.prepare!=='function')return {memoryReady:false,counts:{},quota:null};
 const q=async sql=>(await db.prepare(sql).bind().all()).results||[];
 const rows=await q('SELECT status, COUNT(*) AS count FROM brain_missions GROUP BY status');
 const running=await q("SELECT id,updated_at FROM brain_missions WHERE status='running' ORDER BY updated_at ASC LIMIT 20");
 const counts=Object.fromEntries(rows.map(r=>[String(r.status),Number(r.count)]));
 const stale=running.filter(r=>Number.isFinite(Date.parse(r.updated_at))&&
  now.getTime()-Date.parse(r.updated_at)>600000).map(r=>({missionId:r.id,lastCheckpoint:r.updated_at}));
 return {memoryReady:true,counts,total:Object.values(counts).reduce((a,b)=>a+b,0),
  staleRunningSample:stale,sampleLimit:20,quota:null,providerCalls:null,
  useProviderDashboardForQuota:true,automaticallyRetry:false};
}
