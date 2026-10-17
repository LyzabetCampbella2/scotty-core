import {renderCollaborationInbox} from "./collaboration-inbox.ts";
import {handleCollaboration} from "./collaboration-api.ts";
import {handleAgents} from "./api.ts";
import {renderReviewPage} from "./review-ui.ts";

// Adapt the existing Render owner login to Agent Brains without creating a second login.
// Import and pass isCloudAuthenticated from src/auth/cloud.ts in the Render router.
export async function handleRenderAgentBrains(
 req:Request,u:URL,isOwnerAuthenticated:(req:Request)=>Promise<boolean>
):Promise<Response|null>{
 const api=u.pathname==="/api/agent-brains"||u.pathname.startsWith("/api/agent-brains/");
 const page=u.pathname==="/agents/learning-review";
 const inbox=u.pathname==="/agents/collaboration-inbox";
 if(!api&&!page&&!inbox)return null;
 const headers={"Cache-Control":"no-store"};
 if(process.env.SCOTTY_AGENT_BRAINS_ENABLED!=="true")
  return Response.json({ok:false,error:"Agent brains disabled"},{status:503,headers});
 if(!await isOwnerAuthenticated(req))
  return Response.json({ok:false,error:"Owner login required"},{status:401,headers});
 if(inbox){if(req.method!=="GET")return new Response("Method not allowed",{status:405,headers});return renderCollaborationInbox();}
 if(page){
  if(req.method!=="GET")return new Response("Method not allowed",{status:405,headers});
  return renderReviewPage();
 }
 // Internal API adapter retains existing reviewed endpoint paths.
 if(u.pathname.startsWith("/api/agent-brains/collaboration/")||u.pathname==="/api/agent-brains/collaboration-requests"||u.pathname.startsWith("/api/agent-brains/collaboration-requests/"))return handleCollaboration(req,u);
 const adapted=new URL(u);
 adapted.pathname=u.pathname.replace(/^\/api\/agent-brains(?=\/|$)/,"/api/agents");
 return handleAgents(req,adapted,true);
}
