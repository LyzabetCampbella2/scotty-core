/**
 * Owner-only, isolated Cloudflare D1 agent portfolios.
 * No project documents, private memories, API tokens or prompt text are stored here.
 * A team recommendation is never an assignment or evidence of collaboration.
 */
export const STARTER_PROJECTS=Object.freeze([
 {id:'eirden-atelier',name:'Eirden Atelier',category:'Business application',focus:'manuscript software, client services, commerce, design and QA',departments:['Engineering & Systems','Security & Defense','Creative & Knowledge','Commerce & Finance','Quality & Verification']},
 {id:'bloodpool-trilogy',name:'Bloodpool Trilogy',category:'Creative writing',focus:'novel development, worldbuilding, chapter planning, editing and research',departments:['Creative & Knowledge','Communications & Languages','Research & Intelligence','History & Culture','Projects & Delivery']},
 {id:'golden-hour-creative',name:'Golden Hour Creative',category:'Creative business',focus:'UGC video, cat content, pricing, brand design and outreach',departments:['Creative & Knowledge','Design & Media','Commerce & Finance','Communications & Languages','Business & Enterprise']},
 {id:'scotty-aios',name:'SCOTTY AIOS',category:'Software platform',focus:'agent architecture, backups, secure automation, testing and voice HUD',departments:['Engineering & Systems','Security & Defense','Automation & Reliability','Quality & Verification','Command & Missions']},
 {id:'learning-coursework',name:'Learning & Coursework',category:'Education',focus:'astronomy, biology, anthropology, coursework tutoring and evidence review',departments:['Education & Learning','Science & Environment','Research & Intelligence','Creative & Knowledge','Quality & Verification']}
]);
export const PORTFOLIO_SCHEMA=String.raw`CREATE TABLE IF NOT EXISTS agent_projects (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, focus TEXT NOT NULL,
 created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS agent_project_links (
 agent_id TEXT NOT NULL, project_id TEXT NOT NULL, assigned_at TEXT NOT NULL,
 PRIMARY KEY(agent_id,project_id),
 FOREIGN KEY(project_id) REFERENCES agent_projects(id));
CREATE TABLE IF NOT EXISTS agent_activity (
 event_key TEXT NOT NULL, agent_id TEXT NOT NULL, project_id TEXT,
 kind TEXT NOT NULL CHECK(kind IN ('project','question','mission')),
 title TEXT NOT NULL, reference_id TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('owner-assigned','verified-run')),
 created_at TEXT NOT NULL,
 PRIMARY KEY(event_key,agent_id));
CREATE INDEX IF NOT EXISTS agent_activity_agent_recent ON agent_activity(agent_id,created_at DESC);
CREATE INDEX IF NOT EXISTS agent_activity_verified_mission ON agent_activity(reference_id,source,kind);
CREATE INDEX IF NOT EXISTS agent_links_project ON agent_project_links(project_id);
`;
const IDENT=/^[a-z0-9][a-z0-9_-]{1,79}$/i;
const REF=/^[a-z0-9][a-z0-9_-]{7,79}$/i;
const clean=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max&&!/[\x00-\x1f\x7f]/.test(value);
const rows=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results||[];
const mutation=async(db,sql,...args)=>db.prepare(sql).bind(...args).run();
export async function portfolioReadiness(db){
 if(typeof db?.prepare!=='function'||typeof db.batch!=='function')return {ready:false,reason:'PORTFOLIO_DB_NOT_CONNECTED'};
 try{
  await rows(db,'SELECT id,name,category,focus FROM agent_projects LIMIT 0');
  await rows(db,'SELECT agent_id,project_id,assigned_at FROM agent_project_links LIMIT 0');
  await rows(db,'SELECT event_key,agent_id,kind,source FROM agent_activity LIMIT 0');
  return {ready:true,reason:null};
 }catch{return {ready:false,reason:'AGENT_PORTFOLIO_MIGRATION_REQUIRED'};}
}
export async function seedStarterProjects(db){
 const now=new Date().toISOString();
 const statements=STARTER_PROJECTS.map(p=>db.prepare('INSERT OR IGNORE INTO agent_projects(id,name,category,focus,created_at) VALUES(?,?,?,?,?)').bind(p.id,p.name,p.category,p.focus,now));
 await db.batch(statements);
 return {starterProjects:STARTER_PROJECTS.length};
}
export async function createProject(db,input){
 if(input?.ownerApproved!==true||input.noPrivateDataConfirmed!==true||input.classification!=='public-or-synthetic')throw Error('PROJECT_OWNER_APPROVAL_REQUIRED');
 if(!clean(input.name,90)||!clean(input.category,50)||!clean(input.focus,160))throw Error('INVALID_PROJECT_METADATA');
 const id='project-'+crypto.randomUUID(),createdAt=new Date().toISOString();
 await mutation(db,'INSERT INTO agent_projects(id,name,category,focus,created_at) VALUES(?,?,?,?,?)',id,input.name.trim(),input.category.trim(),input.focus.trim(),createdAt);
 return {id,name:input.name.trim(),category:input.category.trim(),focus:input.focus.trim(),createdAt};
}
export async function listProjects(db,roster){
 const projects=await rows(db,'SELECT id,name,category,focus,created_at AS createdAt FROM agent_projects ORDER BY name LIMIT 100');
 const counts=await rows(db,'SELECT project_id AS projectId,COUNT(*) AS members FROM agent_project_links GROUP BY project_id');
 const lookup=new Map(counts.map(r=>[r.projectId,Number(r.members)]));
 return {projects:projects.map(p=>({...p,memberCount:lookup.get(p.id)||0,proposedTeam:recommendProjectTeam(p,roster)})),actualAssignmentsOnly:true,source:'isolated-cloudflare-d1'};
}
export function recommendProjectTeam(project,roster){
 const starter=STARTER_PROJECTS.find(p=>p.id===project.id);
 const preferred=starter?.departments||[];
 const terms=(project.focus||'').toLowerCase().match(/[a-z]{3,}/g)||[];
 const chiefDepartments=[...new Set(preferred)];
 const candidates=roster.filter(a=>!a.isChief).map(a=>{
  const hay=[a.department,a.specialty,...(a.skills||[])].join(' ').toLowerCase();
  const score=terms.reduce((n,w)=>n+(hay.includes(w)?1:0),0)+
   Math.max(0,12-preferred.indexOf(a.department))*Number(preferred.includes(a.department));
  return {agentId:a.id,name:a.name,department:a.department,chiefId:a.chiefId,specialty:a.specialty,score};
 }).sort((a,b)=>b.score-a.score||a.agentId.localeCompare(b.agentId));
 const chosen=[],departments=new Set();
 for(const item of candidates){if(chosen.length===5)break;if(departments.has(item.department))continue;if(item.score===0&&chosen.length>=3)break;chosen.push(item);departments.add(item.department);}
 return chosen.map(({score,...rest})=>({...rest,reason:preferred.includes(rest.department)?'Relevant project discipline':'Relevant specialty overlap',status:'suggested-not-assigned'}));
}
export function recommendPartners(agent,roster){
 const complements={
  'Creative & Knowledge':['Communications & Languages','Research & Intelligence','Design & Media'],
  'Engineering & Systems':['Security & Defense','Quality & Verification','Automation & Reliability'],
  'Commerce & Finance':['Communications & Languages','Creative & Knowledge','Business & Enterprise'],
  'Science & Environment':['Research & Intelligence','Education & Learning','Quality & Verification'],
  'Design & Media':['Creative & Knowledge','Communications & Languages','Business & Enterprise'],
  'Command & Missions':['Operations & Coordination','Engineering & Systems','Security & Defense']
 };
 const desired=complements[agent.department]||['Research & Intelligence','Operations & Coordination','Creative & Knowledge'];
 const picks=[];
 if(agent.chiefId){const chief=roster.find(a=>a.id===agent.chiefId);if(chief)picks.push({agentId:chief.id,name:chief.name,reason:'Department chief and required reviewer'});}
 for(const department of desired){
  const partner=roster.find(a=>a.id!==agent.id&&a.department===department&&!a.isChief);
  if(partner&&!picks.some(x=>x.agentId===partner.id))picks.push({agentId:partner.id,name:partner.name,reason:'Complementary '+department.toLowerCase()+' specialty'});
 }
 return picks.slice(0,5).map(p=>({...p,relationship:'suggested-not-observed'}));
}
export async function recordAssignment(db,roster,input,{verifiedRun=false}={}){
 if(!verifiedRun&&(input?.ownerApproved!==true||input.noPrivateDataConfirmed!==true))throw Error('OWNER_ASSIGNMENT_APPROVAL_REQUIRED');
 if(!['project','question','mission'].includes(input?.kind))throw Error('INVALID_ACTIVITY_TYPE');
 if(!REF.test(input.referenceId||'')||!clean(input.title,120))throw Error('INVALID_ACTIVITY_METADATA');
 const known=new Set(['scotty',...roster.map(a=>a.id)]),ids=input.agentIds;
 if(!Array.isArray(ids)||ids.length<1||ids.length>8||new Set(ids).size!==ids.length||ids.some(id=>!known.has(id)))throw Error('INVALID_AGENT_TEAM');
 const projectId=input.projectId||null;
 if(input.kind==='project'&&!projectId)throw Error('PROJECT_REQUIRED');
 if(projectId&&(!IDENT.test(projectId)||(await rows(db,'SELECT id FROM agent_projects WHERE id=? LIMIT 1',projectId)).length!==1))throw Error('UNKNOWN_PROJECT');
 const eventKey=input.kind+':'+input.referenceId;
 const source=verifiedRun?'verified-run':'owner-assigned';
 const previous=await rows(db,'SELECT agent_id AS agentId,project_id AS projectId,kind,title,reference_id AS referenceId,source FROM agent_activity WHERE event_key=?',eventKey);
 const same=previous.length===ids.length&&previous.every(p=>ids.includes(p.agentId)&&p.projectId===projectId&&p.kind===input.kind&&p.title===input.title.trim()&&p.referenceId===input.referenceId&&p.source===source);
 if(previous.length){if(!same)throw Error('ASSIGNMENT_ID_CONFLICT');return {recorded:true,replayed:true,eventKey,agentIds:ids,projectId};}
 const time=new Date().toISOString(),commands=[];
 for(const agentId of ids){
  commands.push(db.prepare('INSERT INTO agent_activity(event_key,agent_id,project_id,kind,title,reference_id,source,created_at) VALUES(?,?,?,?,?,?,?,?)')
   .bind(eventKey,agentId,projectId,input.kind,input.title.trim(),input.referenceId,source,time));
  if(projectId)commands.push(db.prepare('INSERT OR IGNORE INTO agent_project_links(agent_id,project_id,assigned_at) VALUES(?,?,?)').bind(agentId,projectId,time));
 }
 await db.batch(commands);
 const stored=await rows(db,'SELECT agent_id AS agentId,project_id AS projectId FROM agent_activity WHERE event_key=?',eventKey);
 if(stored.length!==ids.length||stored.some(r=>!ids.includes(r.agentId)||r.projectId!==projectId))throw Error('ASSIGNMENT_READBACK_FAILED');
 return {recorded:true,replayed:false,eventKey,agentIds:ids,projectId,source};
}
export async function agentBio(db,agent,roster){
 const projects=await rows(db,
  'SELECT p.id,p.name,p.category,p.focus,l.assigned_at AS assignedAt FROM agent_project_links l JOIN agent_projects p ON p.id=l.project_id WHERE l.agent_id=? ORDER BY l.assigned_at DESC LIMIT 50',agent.id);
 const history=await rows(db,
  'SELECT event_key AS eventKey,project_id AS projectId,kind,title,reference_id AS referenceId,source,created_at AS createdAt FROM agent_activity WHERE agent_id=? ORDER BY created_at DESC,event_key DESC LIMIT 80',agent.id);
 const teammates=await rows(db,
  'SELECT other.agent_id AS agentId,COUNT(*) AS sharedProjects FROM agent_project_links own JOIN agent_project_links other ON own.project_id=other.project_id AND other.agent_id<>own.agent_id WHERE own.agent_id=? GROUP BY other.agent_id ORDER BY sharedProjects DESC,other.agent_id LIMIT 30',agent.id);
 const coworkers=await rows(db,
  "SELECT peer.agent_id AS agentId,COUNT(DISTINCT peer.reference_id) AS verifiedMissions FROM agent_activity mine JOIN agent_activity peer ON mine.reference_id=peer.reference_id AND mine.agent_id<>peer.agent_id AND peer.kind='mission' AND peer.source='verified-run' WHERE mine.agent_id=? AND mine.kind='mission' AND mine.source='verified-run' GROUP BY peer.agent_id ORDER BY verifiedMissions DESC,peer.agent_id LIMIT 30",agent.id);
 const lookup=new Map(roster.concat([{id:'scotty',name:'SCOTTY'}]).map(a=>[a.id,a.name]));
 return {agent:{id:agent.id,name:agent.name,department:agent.department,specialty:agent.specialty,isChief:agent.isChief,chiefId:agent.chiefId,brain:agent.brain},
  projects,activity:history,
  suggestedPartners:recommendPartners(agent,roster),
  assignedTeammates:teammates.map(r=>({...r,name:lookup.get(r.agentId)||r.agentId,sharedProjects:Number(r.sharedProjects),relationship:'co-assigned-not-necessarily-collaborated'})),
  verifiedCollaborators:coworkers.map(r=>({...r,name:lookup.get(r.agentId)||r.agentId,verifiedMissions:Number(r.verifiedMissions),relationship:'participated-in-same-verified-mission'})),
  policy:{readOnlyProjects:false,automaticOnRecordedAssignment:true,noCrossProjectDocumentAccess:true,
   generatedKnowledgePromoted:false,metadataOnly:true,liveProductionRosterVerified:false,
   recommendationIsNotAssignment:true}};
}
