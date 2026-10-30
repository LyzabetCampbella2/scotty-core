import {reviewDeliverable} from './upgrade-checks.mjs';
const output=(value,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
/** Auth is required by the server router AND checked here to prevent accidental exposure. */
export async function handleBrainUpgrade(req,u,authenticated=async()=>false){
 if(u.pathname!=='/api/hud/brain-upgrades/review')return null;
 if(!(await authenticated(req)))return output({ok:false,error:'OWNER_LOGIN_REQUIRED'},401);
 if(req.method!=='POST')return output({ok:false,error:'METHOD_NOT_ALLOWED'},405);
 const origin=req.headers.get('origin');if(origin&&origin!==u.origin)return output({ok:false,error:'ORIGIN_DENIED'},403);
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return output({ok:false,error:'JSON_REQUIRED'},415);
 let body;try{const raw=await req.text();if(raw.length>30000)return output({ok:false,error:'BODY_TOO_LARGE'},413);body=JSON.parse(raw);}catch{return output({ok:false,error:'INVALID_JSON'},400)}
 if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.question!=='string'||body.question.length>500||typeof body.answer!=='string'||body.answer.length>16000||!Array.isArray(body.results)||body.results.length>12||!Array.isArray(body.references)||body.references.length>30)return output({ok:false,error:'INVALID_REVIEW_DATA'},400);
 const results=body.results.map(r=>({role:String(r?.role||'').slice(0,70),status:String(r?.status||'').slice(0,50)}));
 const references=body.references.map(r=>({id:String(r?.id||'').slice(0,100)}));
 return output({ok:true,review:reviewDeliverable({question:body.question,answer:body.answer,results,references}),persisted:false,aiCalls:0});
}
