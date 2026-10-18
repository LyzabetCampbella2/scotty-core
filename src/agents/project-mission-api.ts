import {createProjectMission,reviseProjectMission,approveProjectMission,controlProjectMission,simulateProjectMission,reviewMissionDraft,projectMissionDetail,projectMissionList,missionRecommendations} from './project-missions.ts';
import {startCoordination,recoverCoordination,coordinationSnapshot,simulateCoordinationTick,simulateProjectQueueTick} from './chief-coordination.ts';
import {missionSourceChoices,missionHandoffChoices,missionProjectChoices} from './project-missions.ts';
import {reconcileMissionStep} from './chief-coordination.ts';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function handleProjectMissions(req:Request,u:URL){
 if(process.env.SCOTTY_PROJECT_MISSIONS_ENABLED!=='true')return json({ok:false,error:'Project missions disabled'},503);
 if(u.pathname==='/api/agent-brains/project-missions')return req.method==='GET'?json({ok:true,projects:await missionProjectChoices()}):json({ok:false,error:'Method not allowed'},405);
 const match=u.pathname.match(/^\/api\/agent-brains\/project-missions\/([\w-]{1,160})(?:\/([0-9a-f-]{36}|recommendations))?$/i);
 if(!match)return json({ok:false,error:'Route not found'},404);
 const [,project,id]=match;
 try{
  if(req.method==='GET'){
   if(id&&id!=='recommendations'&&u.searchParams.get('coordination')==='true'){
    if(process.env.SCOTTY_CHIEF_COORDINATION_ENABLED!=='true')return json({ok:false,error:'Chief coordination disabled'},503);
    return json({ok:true,...await coordinationSnapshot(project,id,Number(u.searchParams.get('revision')))});
   }
   return json({ok:true,...(id==='recommendations'?{agents:await missionRecommendations(project),sources:await missionSourceChoices(project),handoffs:await missionHandoffChoices(project)}:id?await projectMissionDetail(project,id):{plans:await projectMissionList(project)})});
  }
  if(req.method!=='POST')return json({ok:false,error:'Method not allowed'},405);
  if(req.headers.get('origin')!==u.origin||req.headers.get('x-scotty-csrf')!=='1')return json({ok:false,error:'Origin/CSRF verification failed'},403);
  const b=await req.json();
  if(!id&&b.action==='tick-project'){
   if(process.env.SCOTTY_CHIEF_COORDINATION_ENABLED!=='true'||process.env.SCOTTY_PROJECT_MISSION_SIMULATION_ENABLED!=='true')return json({ok:false,error:'Coordination simulation disabled'},503);
   return json(await simulateProjectQueueTick(project));
  }
  if(!id)return json({ok:true,...await createProjectMission(project,b.spec)},201);
  if(!Number.isInteger(b.revision)||b.revision<1)throw Error('Plan revision required');
  if(['start-coordination','recover-coordination','tick-coordination','reconcile-coordination'].includes(b.action)){
   if(process.env.SCOTTY_CHIEF_COORDINATION_ENABLED!=='true')return json({ok:false,error:'Chief coordination disabled'},503);
   if(b.action==='tick-coordination'&&process.env.SCOTTY_PROJECT_MISSION_SIMULATION_ENABLED!=='true')return json({ok:false,error:'Simulation disabled'},503);
   if(b.action==='reconcile-coordination'){
    if(!['accept_draft','abandon'].includes(b.decision)||typeof b.stepId!=='string'||typeof b.note!=='string')throw Error('Invalid reconciliation');
    return json({ok:true,...await reconcileMissionStep(project,id,b.revision,b.stepId,b.decision,b.note)});
   }
   const result=await (b.action==='start-coordination'?startCoordination:b.action==='recover-coordination'?recoverCoordination:simulateCoordinationTick)(project,id,b.revision);return json({ok:true,...result});
  }
  if(b.action==='revise')return json({ok:true,...await reviseProjectMission(project,id,b.revision,b.spec)});
  if(b.action==='approve')return json({ok:true,...await approveProjectMission(project,id,b.revision)});
  if(['pause','resume','cancel','reject'].includes(b.action))return json({ok:true,...await controlProjectMission(project,id,b.revision,b.action)});
  if(b.action==='simulate'){
   if(process.env.SCOTTY_PROJECT_MISSION_SIMULATION_ENABLED!=='true')return json({ok:false,error:'Simulation disabled'},503);
   return json({ok:true,...await simulateProjectMission(project,id,b.revision)});
  }
  if(b.action==='review'&&['approved','rejected','revision_requested'].includes(b.decision)&&typeof b.stepId==='string'&&typeof b.note==='string')return json({ok:true,...await reviewMissionDraft(project,id,b.revision,b.stepId,b.decision,b.note)});
  throw Error('Invalid action');
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:'Mission request failed'},409);}
}
