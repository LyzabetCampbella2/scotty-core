/**
 * SCOTTY Starship: owner-only, feature-flagged interface adapter.
 * The presentation client cannot invoke agents, write memories or operate devices.
 */
import { listBrains } from "../agents/postgres-store.ts";
import { renderStarship } from "./scene.ts";

const headers = {"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY"};
export function ownerSession(req:Request):boolean {
  const expected=process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
  if(!expected) return false;
  const raw=req.headers.get("cookie")||"";
  const value=raw.split(";").map(x=>x.trim()).find(x=>x.startsWith("scotty_owner_session="))?.slice("scotty_owner_session=".length);
  return Boolean(value&&value===expected);
}
export async function handleStarship(req:Request,u:URL):Promise<Response>{
  if(process.env.SCOTTY_STARSHIP_ENABLED!=="true")
    return Response.json({ok:false,error:"Starship preview is disabled"},{status:503,headers});
  if(!ownerSession(req))
    return Response.json({ok:false,error:"Owner session required"},{status:401,headers});
  if(req.method!=="GET")
    return Response.json({ok:false,error:"Read-only interface"},{status:405,headers});
  if(u.pathname==="/starship")
    return new Response(renderStarship(),{headers:{...headers,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
  if(u.pathname==="/api/starship/crew"){
    if(process.env.SCOTTY_STARSHIP_CREW_READONLY!=="true"||process.env.SCOTTY_AGENT_BRAINS_ENABLED!=="true")
      return Response.json({ok:false,connected:false,agents:[],reason:"Read-only crew adapter disabled"},{headers});
    try{
      const agents=await listBrains();
      // DO NOT send private instructions, memories, knowledge sources or credentials to UI.
      const publicCrew=agents.map(x=>({id:x.id,name:x.name,department:x.department,specialty:x.specialty}));
      return Response.json({ok:true,connected:true,agents:publicCrew,rosterCount:publicCrew.length,rosterValid:publicCrew.length===185},{headers});
    }catch{
      return Response.json({ok:false,connected:false,agents:[],reason:"Roster unavailable"},{status:503,headers});
    }
  }
  return Response.json({ok:false,error:"Not found"},{status:404,headers});
}
