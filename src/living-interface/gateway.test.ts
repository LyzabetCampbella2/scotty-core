import { describe, expect, test } from "bun:test";
import { handleStarship, ownerSession } from "./gateway.ts";

const request=(path:string,cookie?:string,method="GET")=>new Request("https://scotty.example"+path,{method,headers:cookie?{cookie}:{}});
describe("SCOTTY Living Starship safety boundary",()=>{
 test("owner check fails with no configured cookie token",()=>{
  const old=process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
  delete process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
  try{expect(ownerSession(request("/starship","scotty_owner_session=fake"))).toBe(false);}
  finally{if(old===undefined)delete process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;else process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN=old;}
 });
 test("preview remains closed when its feature flag is disabled",async()=>{
  const old=process.env.SCOTTY_STARSHIP_ENABLED;
  delete process.env.SCOTTY_STARSHIP_ENABLED;
  try{expect((await handleStarship(request("/starship"),new URL("https://scotty.example/starship"))).status).toBe(503);}
  finally{if(old===undefined)delete process.env.SCOTTY_STARSHIP_ENABLED;else process.env.SCOTTY_STARSHIP_ENABLED=old;}
 });
 test("owner-only preview denies requests lacking session",async()=>{
  const oldFlag=process.env.SCOTTY_STARSHIP_ENABLED,oldToken=process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
  process.env.SCOTTY_STARSHIP_ENABLED="true";process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN="test-owner-session";
  try{expect((await handleStarship(request("/starship"),new URL("https://scotty.example/starship"))).status).toBe(401);}
  finally{if(oldFlag===undefined)delete process.env.SCOTTY_STARSHIP_ENABLED;else process.env.SCOTTY_STARSHIP_ENABLED=oldFlag;if(oldToken===undefined)delete process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;else process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN=oldToken;}
 });
 test("owner-only preview rejects write methods",async()=>{
  const oldFlag=process.env.SCOTTY_STARSHIP_ENABLED,oldToken=process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
  process.env.SCOTTY_STARSHIP_ENABLED="true";process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN="test-owner-session";
  try{const r=request("/api/starship/crew","scotty_owner_session=test-owner-session","POST");expect((await handleStarship(r,new URL(r.url))).status).toBe(405);}
  finally{if(oldFlag===undefined)delete process.env.SCOTTY_STARSHIP_ENABLED;else process.env.SCOTTY_STARSHIP_ENABLED=oldFlag;if(oldToken===undefined)delete process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;else process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN=oldToken;}
 });
 test("roster read-only API does not leak records without enabled adapter",async()=>{
  const oldFlag=process.env.SCOTTY_STARSHIP_ENABLED,oldToken=process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN,oldCrew=process.env.SCOTTY_STARSHIP_CREW_READONLY;
  process.env.SCOTTY_STARSHIP_ENABLED="true";process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN="test-owner-session";delete process.env.SCOTTY_STARSHIP_CREW_READONLY;
  try{const r=request("/api/starship/crew","scotty_owner_session=test-owner-session");const result=await handleStarship(r,new URL(r.url));const data=await result.json();expect(data.agents).toEqual([]);expect(data.connected).toBe(false);}
  finally{if(oldFlag===undefined)delete process.env.SCOTTY_STARSHIP_ENABLED;else process.env.SCOTTY_STARSHIP_ENABLED=oldFlag;if(oldToken===undefined)delete process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;else process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN=oldToken;if(oldCrew===undefined)delete process.env.SCOTTY_STARSHIP_CREW_READONLY;else process.env.SCOTTY_STARSHIP_CREW_READONLY=oldCrew;}
 });
});
