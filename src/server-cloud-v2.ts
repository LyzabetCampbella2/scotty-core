import {handleFolders} from './workspace/folders.ts';
import {handleCalls} from './calls/routes.ts';
import {handleConnectors} from './connectors/routes.ts';
import {handleVoiceWorkspace} from './control/workspace-voice.ts';
import {handleRoom,ensureRoom} from './control/room.ts';
import {handleControl,ensureControl} from './control/cloud.ts';
import {handleCreative,ensureCreative} from './creative/cloud.ts';
import {handleDaily,dailyTick} from "./daily/cloud.ts";
import {handleKnowledge,ensureKnowledge} from './memory/knowledge.ts';
import {handleTeamwork,teamTick,ensureTeamwork} from './agents/teamwork.ts';
import {handleApps,ensureApps} from './providers/apps.ts';
import {handleWorkspace,ensureWorkspace} from './workspace/cloud.ts';
import {handleSpatial,ensureSpatial} from './resources/spatial.ts';
import { handleEyesOn } from "./eyes/index.ts";
import { handleHudStt } from "./voice/hud-stt.ts";
import { handleCloudVoice } from "./voice/cloud.ts";
import { handleCloudMemory } from "./memory/cloud.ts";
import { handleCloudCommand } from "./brain/cloud.ts";
import { handleCloudAgents,bootstrapAgents } from "./agents/cloud.ts";
import { handleCloudForge,runForgeSelfTest } from "./forge/cloud.ts";
import { handleCloudResources,bootstrapResources } from "./resources/cloud.ts";
import { handleCloudAutonomy,bootstrapAutonomy,autonomyTick } from "./autonomy/cloud.ts";
import { handleCloudProviders } from "./providers/cloud.ts";
import { handleCloudConnections,connectionSetupStatus } from "./connections/cloud.ts";
import { handleHealth,handleSystemStatus,handleSystemQa,handleSystemRecover } from "./health.ts";
import { handleCloudAuth,isCloudAuthenticated } from "./auth/cloud.ts";

const PORT=Number(process.env.PORT||3000);

async function servePublic(path:string,type="text/html; charset=utf-8"){
 try{
  const file=Bun.file(path);
  if(!(await file.exists()))return null;
  return new Response(file,{headers:{"content-type":type,"cache-control":"no-store"}});
 }catch{return null}
}
async function serveHud(){
 try{
  const file=Bun.file("public/index.html");
  if(!(await file.exists()))return null;
  let html=await file.text();
  html=html.replace("</head>",'<script type="importmap">{"imports":{"three":"/vendor/three/three.module.js"}}</script></head>');
  if(!html.includes("/render-hotfix.js"))html=html.replace("</body>","<script src=\"/render-hotfix.js?v=9\"></script><script src=\"/conversation-core.js?v=2\"></script><script src=\"/conversation.js?v=17\"></script><script src=\"/daily-life.js?v=1\"></script><script src=\"/knowledge.js?v=1\"></script><script src=\"/teamwork.js?v=1\"></script><script src=\"/apps-actions.js?v=4\"></script><script src=\"/creative.js?v=1\"></script><script src=\"/workspace.js?v=2\"></script><script src=\"/spatial-tools-core.js?v=1\"></script><script src=\"/spatial-tools.js?v=1\"></script><script src=\"/voice-control-core.js?v=2\"></script><script src=\"/voice-control.js?v=5\"></script><script src=\"/command-room.js?v=2\"></script><script src=\"/voice-workspace-core.js?v=1\"></script><script src=\"/voice-workspace.js?v=2\"></script><script src=\"/connectors.js?v=5\"></script><script src=\"/calls-core.js?v=2\"></script><script src=\"/calls.js?v=5\"></script><script src=\"/call-contacts-core.js?v=1\"></script><script src=\"/call-extras.js?v=2\"></script><script src=\"/call-session-core.js?v=1\"></script><script src=\"/call-session.js?v=1\"></script><script src=\"/folders-core.js?v=4\"></script><script src=\"/folders.js?v=7\"></script><script src=\"/folders-database.js?v=2\"></script><script src=\"/voice-features.js?v=2\"></script></body>");
  return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
 }catch{return null}
}

Bun.serve({port:PORT,async fetch(req){
 const u=new URL(req.url);
 if(req.method==="GET"){
  if(u.pathname.startsWith('/vendor/')){let path='';if(u.pathname==='/vendor/pdfjs/pdf.mjs')path='node_modules/pdfjs-dist/build/pdf.mjs';else if(u.pathname==='/vendor/pdfjs/pdf.worker.mjs')path='node_modules/pdfjs-dist/build/pdf.worker.mjs';else if(/^\/vendor\/three\/three\.(?:module|core)\.js$/.test(u.pathname))path='node_modules/three/build/'+u.pathname.split('/').pop();else if(/^\/vendor\/three\/addons\/[a-zA-Z0-9_/-]+\.js$/.test(u.pathname))path='node_modules/three/examples/jsm/'+u.pathname.slice('/vendor/three/addons/'.length);if(path){const r=await servePublic(path,'application/javascript; charset=utf-8');if(r)return r}return Response.json({ok:false,error:'Viewer asset not found'},{status:404})}

  if(["/folders-database.js","/folders-core.js","/folders.js","/voice-features.js","/calls-core.js","/calls-worker.js","/calls.js","/call-contacts-core.js","/call-extras.js","/call-session-core.js","/call-session.js"].includes(u.pathname)||u.pathname==="/connectors.js"||u.pathname==="/voice-workspace-core.js"||u.pathname==="/voice-workspace.js"||u.pathname==="/command-room.js"||u.pathname==="/voice-control.js"||u.pathname==="/voice-control-core.js"||u.pathname==="/creative.js"||u.pathname==="/spatial-tools.js"||u.pathname==="/spatial-tools-core.js"||u.pathname==="/workspace.js"||u.pathname==="/workspace-viewer.js"||u.pathname==="/conversation-core.js"||u.pathname==="/conversation.js"||u.pathname==="/daily-life.js"||u.pathname==="/knowledge.js"||u.pathname==="/teamwork.js"||u.pathname==="/apps-actions.js") {const r=await servePublic("public"+u.pathname,"application/javascript; charset=utf-8");if(r)return r}
  if(u.pathname==="/hud/sidebar-voice-live.js") {const r=await servePublic("public/hud/sidebar-voice-live.js","application/javascript; charset=utf-8");if(r)return r}
  if(u.pathname==="/render-hotfix.js") {const r=await servePublic("public/render-hotfix.js","application/javascript; charset=utf-8");if(r)return r}
  if(u.pathname==="/hud"||u.pathname==="/hud/"||u.pathname==="/") {const r=await serveHud();if(r)return r}
  if(u.pathname==="/missions"||u.pathname==="/missions/") {const r=await servePublic("public/missions/index.html");if(r)return r}
  if(u.pathname==="/integrations"||u.pathname==="/integrations/") {const r=await servePublic("public/integrations/index.html");if(r)return r}
  if(u.pathname==="/system"||u.pathname==="/system/") {const r=await servePublic("public/system/index.html");if(r)return r}
  if(u.pathname==="/calls-engine-check"){const r=await servePublic("public/calls-engine-check.html");if(r)return r}
  if(u.pathname==="/forge"||u.pathname==="/forge/") {const r=await servePublic("public/forge/index.html");if(r)return r}
  if(u.pathname==="/manifest.webmanifest"||u.pathname==="/hud/manifest.json") {const r=await servePublic("public/manifest.webmanifest","application/manifest+json");if(r)return r}
 }
 if(u.pathname==="/ready") return Response.json({ok:true,service:"scotty-core",status:"ready",time:new Date().toISOString()},{headers:{"cache-control":"no-store"}});
 if(u.pathname==="/health") return handleHealth();
 if(req.method==="GET"&&u.pathname==="/api/connections/setup/status") return Response.json({ok:true,...connectionSetupStatus()},{headers:{"cache-control":"no-store"}});

 if(u.pathname.startsWith("/api/auth")) return handleCloudAuth(req,u);
 if(u.pathname==="/api/connections/google/callback") return handleCloudConnections(req,u);

 const protectedRoute=
  u.pathname.startsWith('/api/folders')||
  (u.pathname.startsWith('/api/connectors')&&!(u.pathname==='/api/connectors/status'&&req.method==='GET')&&u.pathname!=='/api/connectors/spotify/callback'&&!/^\/api\/connectors\/oauth\/(googledocs|outlook|onedrive|googlephotos|canva|youtube|pinterest)\/callback$/.test(u.pathname)&&!u.pathname.startsWith('/api/connectors/device/'))||
  (u.pathname.startsWith('/api/voice-workspace')&&!(u.pathname==='/api/voice-workspace/status'&&req.method==='GET'))||
  (u.pathname.startsWith('/api/command-room')&&!(u.pathname==='/api/command-room/status'&&req.method==='GET'))||
  (u.pathname.startsWith('/api/control')&&!(u.pathname==='/api/control/status'&&req.method==='GET'))||
  (u.pathname.startsWith('/api/creative')&&!(u.pathname==='/api/creative/status'&&req.method==='GET'))||
  (u.pathname.startsWith('/api/spatial')&&!(u.pathname==='/api/spatial/status'&&req.method==='GET'))||
  (u.pathname.startsWith('/api/workspace')&&!(u.pathname==='/api/workspace/status'&&req.method==='GET'))||
  u.pathname.startsWith("/api/daily")||
  (u.pathname.startsWith("/api/calls")&&!u.pathname.startsWith("/api/calls/device/"))||
  u.pathname.startsWith('/api/knowledge')||
  (u.pathname.startsWith('/api/teamwork')&&u.pathname!='/api/teamwork/status')||
  (u.pathname.startsWith('/api/apps')&&u.pathname!='/api/apps/status')||
  u.pathname==="/api/hud/stt"||
  u.pathname==="/api/hud/command"||
  u.pathname==="/api/hud/agents"||
  u.pathname==="/api/hud/agents/run"||
  u.pathname==="/api/hud/agents/recovery-self-test"||
  u.pathname==="/api/hud/agents/skills"||
  u.pathname.startsWith("/api/hud/agents/missions")||
  u.pathname==="/api/hud/activity"||
  u.pathname.startsWith("/api/hud/resources")||
  u.pathname.startsWith("/api/missions")||
  u.pathname.startsWith("/api/approvals")||
  u.pathname.startsWith("/api/providers")||
  (u.pathname.startsWith("/api/connections")&&u.pathname!=="/api/connections/setup/status")||
  u.pathname==="/api/tts"||
  u.pathname.startsWith("/api/voice/scottish/")||
  u.pathname==="/api/voice/speak"||
  u.pathname==="/api/eyes/analyze"||
  (u.pathname.startsWith("/api/memory/")&&u.pathname!=="/api/memory/status")||
  u.pathname.startsWith("/forge/api/")||
  (u.pathname==="/api/system/status"||u.pathname==="/api/system/qa"||u.pathname==="/api/system/recover");
 if(protectedRoute&&!(await isCloudAuthenticated(req))) return Response.json({ok:false,error:"Authentication required"},{status:401,headers:{"cache-control":"no-store"}});
 if(u.pathname==='/api/spatial/status'&&req.method==='GET'){try{await bootstrapResources();await ensureSpatial();return Response.json({ok:true,feature:'spatial',ready:true},{headers:{'cache-control':'no-store'}})}catch{return Response.json({ok:true,feature:'spatial',ready:false},{status:503,headers:{'cache-control':'no-store'}})}}
 if(u.pathname.startsWith('/api/spatial'))return handleSpatial(req,u);
 if(u.pathname==='/api/workspace/status'&&req.method==='GET'){try{await ensureWorkspace();return Response.json({ok:true,feature:'workspace',ready:true},{headers:{'cache-control':'no-store'}})}catch{return Response.json({ok:true,feature:'workspace',ready:false},{status:503,headers:{'cache-control':'no-store'}})}}
 if(u.pathname.startsWith('/api/calls'))return handleCalls(req,u);
 if(u.pathname.startsWith('/api/connectors'))return handleConnectors(req,u);
 if(u.pathname.startsWith('/api/voice-workspace'))return handleVoiceWorkspace(req,u);
 if(u.pathname.startsWith('/api/command-room'))return handleRoom(req,u);
 if(u.pathname.startsWith('/api/control'))return handleControl(req,u);
 if(u.pathname.startsWith('/api/creative'))return handleCreative(req,u);
 if(u.pathname.startsWith('/api/folders'))return handleFolders(req,u);
 if(u.pathname.startsWith('/api/workspace'))return handleWorkspace(req,u);
 if(u.pathname.startsWith("/api/daily"))return handleDaily(req,u);
 if(u.pathname.startsWith('/api/knowledge'))return handleKnowledge(req,u);
 if(u.pathname==='/api/teamwork/status'&&req.method==='GET'){try{await ensureTeamwork();return Response.json({ok:true,feature:'teamwork',ready:true},{headers:{'cache-control':'no-store'}})}catch{return Response.json({ok:true,feature:'teamwork',ready:false},{status:503,headers:{'cache-control':'no-store'}})}}
 if(u.pathname.startsWith('/api/teamwork'))return handleTeamwork(req,u);
 if(u.pathname==='/api/apps/status'&&req.method==='GET'){try{await ensureApps();return Response.json({ok:true,feature:'apps',ready:true},{headers:{'cache-control':'no-store'}})}catch{return Response.json({ok:true,feature:'apps',ready:false},{status:503,headers:{'cache-control':'no-store'}})}}
 if(u.pathname.startsWith('/api/apps'))return handleApps(req,u);
 if(u.pathname==="/api/hud/stt") return handleHudStt(req);
 if(u.pathname==="/api/hud/command"||u.pathname==="/api/hud/brain/status") return handleCloudCommand(req,u);
 if(u.pathname==="/api/hud/agents"||u.pathname==="/api/hud/agents/run"||u.pathname==="/api/hud/agents/recovery-self-test"||u.pathname==="/api/hud/agents/status"||u.pathname==="/api/hud/agents/skills"||u.pathname.startsWith("/api/hud/agents/missions")||u.pathname==="/api/hud/activity") return handleCloudAgents(req,u);
 if(u.pathname.startsWith("/api/hud/resources")) return handleCloudResources(req,u);
 if(u.pathname.startsWith("/api/missions")||u.pathname.startsWith("/api/approvals")) return handleCloudAutonomy(req,u);
 if(u.pathname.startsWith("/api/providers")) return handleCloudProviders(req,u);
 if(u.pathname.startsWith("/api/connections")) return handleCloudConnections(req,u);
 if(u.pathname.startsWith("/forge/api/")) return handleCloudForge(req,u);
 if(u.pathname==="/api/system/status") return handleSystemStatus(req,u);
 if(u.pathname==="/api/system/qa") return handleSystemQa(req,u);
 if(u.pathname==="/api/system/recover") return handleSystemRecover(req,u);

 if(u.pathname.startsWith("/api/eyes")) return handleEyesOn(req,u);
 if(u.pathname==="/api/tts"||u.pathname.startsWith("/api/voice")) return handleCloudVoice(req,u);
 if(u.pathname.startsWith("/api/memory")) return handleCloudMemory(req,u);
 if(u.pathname.startsWith("/api/")) return Response.json({ok:false,error:"S.C.O.T.T.Y. cloud route not found"},{status:404,headers:{"cache-control":"no-store"}});

 return Response.json({service:"S.C.O.T.T.Y.",status:"online",architecture:"cloud-gateway-v3",native:["brain","agents","activity","resources","missions","approvals","providers","connections","eyes","stt","voice","memory","forge-control","release-status"]});
}});

console.log("S.C.O.T.T.Y. cloud gateway v3 listening",PORT);
handleHealth().then(async r=>console.log("S.C.O.T.T.Y. safe health",await r.text())).catch(()=>{});
bootstrapAgents().then(n=>console.log("S.C.O.T.T.Y. cloud agent matrix ready",n)).catch(e=>console.warn("Agent bootstrap deferred",e?.message||e));
bootstrapResources().then(r=>console.log("S.C.O.T.T.Y. spatial resource graph ready",JSON.stringify(r))).catch(e=>console.warn("Resource graph bootstrap deferred",e?.message||e));
bootstrapAutonomy().then(n=>console.log("S.C.O.T.T.Y. autonomy mission core ready",n)).catch(e=>console.warn("Autonomy bootstrap deferred",e?.message||e));
if(process.env.SCOTTY_FORGE_SELF_TEST==="1"){
 runForgeSelfTest().then(r=>console.log("S.C.O.T.T.Y. Forge self-test",JSON.stringify(r))).catch(e=>console.warn("S.C.O.T.T.Y. Forge self-test failed",e?.message||e));
}
if(process.env.SCOTTY_FULL_QA_ON_START==="1"){
 const qr=new Request("http://localhost/api/system/qa",{method:"POST"});
 handleSystemQa(qr,new URL(qr.url)).then(async r=>console.log("S.C.O.T.T.Y. Part 8 full QA",await r.text())).catch(e=>console.warn("S.C.O.T.T.Y. Part 8 full QA failed",e?.message||e));
}
const maintenance=()=>{
 const rr=new Request("http://localhost/api/system/recover",{method:"POST"});
 handleSystemRecover(rr,new URL(rr.url)).catch(()=>{});
};
setTimeout(maintenance,30000);
setInterval(maintenance,15*60*1000);
setTimeout(()=>autonomyTick().catch(()=>{}),45000);
setInterval(()=>autonomyTick().catch(()=>{}),5*60*1000);

setTimeout(()=>dailyTick(),15000);
setInterval(()=>dailyTick(),20000);
setTimeout(()=>ensureKnowledge().then(()=>console.info('Memory & Knowledge schema ready')).catch(e=>console.warn('Memory & Knowledge initialization:',e.message)),5000);
setTimeout(()=>teamTick(),10000);
setInterval(()=>teamTick(),15000);
setTimeout(()=>ensureApps().catch(e=>console.warn('Connected Apps initialization:',e.message)),12000);

setTimeout(()=>ensureWorkspace().catch(e=>console.warn('Workspace initialization:',e.message)),18000);

setTimeout(()=>ensureSpatial().catch(e=>console.warn('Spatial tools initialization:',e.message)),20000);

setTimeout(()=>ensureCreative().catch(e=>console.warn('Creative initialization:',e.message)),20000);

setTimeout(()=>ensureControl().catch(e=>console.warn('Voice control initialization:',e.message)),22000);

setTimeout(()=>ensureRoom().catch(e=>console.warn('Command room initialization:',e.message)),24000);
