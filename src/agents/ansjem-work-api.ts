import {ensureAnsjemWork,ansjemBoard,ansjemDetail,ansjemStaffing,createAnsjemWork,updateAnsjemWork} from './ansjem-work.ts';
import {missionDb as db} from './mission-records.ts';
import {weeklyCoordination,exchangeInput,coordinationEnabled,ensureAnsjemCoordination} from './ansjem-coordination.ts';
import {fingerprint} from './ansjem-work-model.ts';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function handleAnsjemWork(req:Request,u:URL,p:string,id?:string){
 if(process.env.SCOTTY_ANSJEM_WORK_ENABLED!=='true')return json({ok:false,error:'ANSJEM development workspace is disabled'},503);
 try{
  if(req.method==='GET'&&!id&&u.searchParams.get('view')==='coordination-weekly'){await ensureAnsjemWork();return json({ok:true,brief:await weeklyCoordination(p,u.searchParams.get('cursor')||'0',u.searchParams.get('asOf')||undefined)});}
  if(req.method==='GET')return json({ok:true,...(id&&u.searchParams.get('view')==='staffing'?await ansjemStaffing(p,id):id?await ansjemDetail(p,id,u.searchParams.get('before')||undefined):await ansjemBoard(p,u.searchParams.get('cursor')||'0',u.searchParams.get('status')||''))});
  if(req.method!=='POST')return json({ok:false,error:'Method not allowed'},405);
  if(req.headers.get('origin')!==u.origin||req.headers.get('x-scotty-csrf')!=='1')return json({ok:false,error:'Origin/CSRF verification failed'},403);
  const text=await req.text();if(text.length>64000)return json({ok:false,error:'Work request is too large'},413);let body;try{body=JSON.parse(text);}catch{return json({ok:false,error:'Invalid JSON'},400);}
  if(id&&body.action==='preview-exchange'){if(!coordinationEnabled())throw Error('ANSJEM coordination tools are disabled');await ensureAnsjemWork();await ensureAnsjemCoordination();const w=(await db()`select * from scotty_ansjem_work where project_id=${p} and work_id=${id}`)[0];if(!w)throw Error('Work request not found');const envelope=exchangeInput(w,body);return json({ok:true,envelope,previewDigest:await fingerprint(envelope),version:w.version,authoritative:false,synced:false});}
  return json({ok:true,work:id?await updateAnsjemWork(p,id,body):await createAnsjemWork(p,body)},id?200:201);
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:'ANSJEM work request failed'},409);}
}
