import {missionProjectChoices,createProjectMission,projectMissionDetail} from './project-missions.ts';
import {buildReleasedDeliverable} from './project-deliverables.mjs';
import {evidenceCandidates,evidenceList,approveEvidence,revokeEvidence} from './project-evidence.ts';
import {recommendProjectTeam,proposedTeamPlan,dailyProjectBrief,missionProgress} from './project-operations.ts';
import {agentDevelopment,recordAgentDevelopment,weeklyProjectReview,projectTeamStatus} from './project-insights.ts';
import {projectDocumentChoices,previewProjectDocument,attachProjectDocument} from './project-documents.ts';
import {handleAnsjemWork} from './ansjem-work-api.ts';
import {preferredTeams,savePreferredTeam,archivePreferredTeam} from './project-team-presets.ts';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function handleProjectOperations(req:Request,u:URL){
 if(process.env.SCOTTY_PROJECT_OPERATIONS_ENABLED!=='true'||process.env.SCOTTY_PROJECT_MISSIONS_ENABLED!=='true')return json({ok:false,error:'Project operations disabled'},503);
 const root='/api/agent-brains/project-operations';
 try{
  if(u.pathname===root&&req.method==='GET')return json({ok:true,projects:await missionProjectChoices(),ansjemEnabled:process.env.SCOTTY_ANSJEM_WORK_ENABLED==='true',ansjemDeliveryEnabled:process.env.SCOTTY_ANSJEM_DELIVERY_ENABLED==='true',ansjemCoordinationEnabled:process.env.SCOTTY_ANSJEM_COORDINATION_ENABLED==='true',realDraftsEnabled:process.env.SCOTTY_REAL_PROJECT_DRAFTS_ENABLED==='true'&&!!process.env.GROQ_API_KEY,providerConfigured:!!process.env.GROQ_API_KEY});
  const work=u.pathname.match(/^\/api\/agent-brains\/project-operations\/([\w-]{1,160})\/ansjem(?:\/(ANSJEM-DEV-\d{4,20}))?$/);if(work)return handleAnsjemWork(req,u,work[1],work[2]);
  const match=u.pathname.match(/^\/api\/agent-brains\/project-operations\/([\w-]{1,160})\/(brief|progress|evidence|candidates|team|team-presets|plan|development|weekly|team-status|documents|deliverable)$/);if(!match)return json({ok:false,error:'Route not found'},404);const [,p,kind]=match;
  if(req.method==='GET'&&kind==='deliverable'){
   const missionId=u.searchParams.get('missionId')||'',stepId=u.searchParams.get('stepId')||null,
    revision=Number(u.searchParams.get('revision')),format=u.searchParams.get('format')||'md';
   if(!/^[a-f0-9-]{36}$/i.test(missionId)||stepId&&!/^[a-z0-9_-]{1,100}$/i.test(stepId)||
      !Number.isInteger(revision)||revision<1||!['md','txt'].includes(format))throw Error('Valid mission, step, current revision and md/txt format required');
   const file=buildReleasedDeliverable(await projectMissionDetail(p,missionId),{projectId:p,stepId,revision,format});
   return new Response(file.content,{status:200,headers:{
    'Content-Type':file.mime,'Content-Disposition':'attachment; filename="'+file.filename+'"',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'
   }});
  }
  if(req.method==='GET'){
   if(kind==='weekly')return json({ok:true,review:await weeklyProjectReview(p)});
   if(kind==='development')return json({ok:true,...await agentDevelopment(p)});
   if(kind==='team-status')return json({ok:true,...await projectTeamStatus(p)});
   if(kind==='team-presets')return json({ok:true,...await preferredTeams(p)});
   if(kind==='brief')return json({ok:true,brief:await dailyProjectBrief(p)});
   if(kind==='progress')return json({ok:true,...await missionProgress(p)});
   if(kind==='evidence')return json({ok:true,evidence:await evidenceList(p)});
   if(kind==='candidates')return json({ok:true,...await evidenceCandidates(p)});
   return json({ok:false,error:'Method not allowed'},405);
  }
  if(req.method!=='POST')return json({ok:false,error:'Method not allowed'},405);
  if(req.headers.get('origin')!==u.origin||req.headers.get('x-scotty-csrf')!=='1')return json({ok:false,error:'Origin/CSRF verification failed'},403);
  const b=await req.json();
  if(kind==='documents'){if(b.action==='list')return json({ok:true,...await projectDocumentChoices(p,b.provider,b.query||'')});if(b.action==='preview')return json({ok:true,...await previewProjectDocument(p,b)});if(b.action==='attach')return json({ok:true,...await attachProjectDocument(p,b)});return json({ok:false,error:'Choose list, preview or attach'},400);}
  if(kind==='development')return json({ok:true,...await recordAgentDevelopment(p,b)},201);
  if(kind==='team')return json({ok:true,...await recommendProjectTeam(p,b.goal)});
  if(kind==='team-presets')return json({ok:true,...await (b.action==='archive'?archivePreferredTeam(p,b):b.action==='save'?savePreferredTeam(p,b):Promise.reject(Error('Choose save or archive')))});
  if(kind==='plan')return json({ok:true,...await createProjectMission(p,await proposedTeamPlan(p,b))},201);
  if(kind==='evidence')return json({ok:true,...await (b.action==='revoke'?revokeEvidence(p,b.id):approveEvidence(p,b))});
  return json({ok:false,error:'Method not allowed'},405);
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:'Project operation failed'},409);}
}
