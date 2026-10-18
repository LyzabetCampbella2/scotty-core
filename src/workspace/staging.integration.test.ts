import { test, expect } from "bun:test";
import postgres from "postgres";
import { handleWorkspace } from "./index.ts";
import { handleWorkspaceRecommendations } from "./recommendations.ts";

const url = process.env.SCOTTY_STAGING_TEST_DATABASE_URL;
if (!url) throw new Error("Run integration tests only with SCOTTY_STAGING_TEST_DATABASE_URL set");
if (!/^postgres:\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost):5432\/scotty_workspace_ci$/.test(url))
  throw new Error("Refusing non-loopback or non-test database");
process.env.DATABASE_URL = url;
process.env.SCOTTY_WORKSPACE_ENABLED = "true";
process.env.SCOTTY_WORKSPACE_ADMIN_TOKEN = "synthetic-ci-only-token";
const q = postgres(url, { ssl: false });
const base = "http://localhost:3000";
const request = (path: string, method = "GET", data?: object, headers: Record<string,string> = {}) => {
  const req = new Request(base + path, { method, headers: { authorization: "Bearer synthetic-ci-only-token", "content-type": "application/json", ...headers },
    ...(data ? { body: JSON.stringify(data) } : {}) });
  return handleWorkspace(req, new URL(req.url));
};
test("synthetic projects, assignment, mission, evidence, approvals and project isolation", async () => {
  try {
    await q`create table scotty_agents (id text primary key, name text not null, department text not null, sort_order int not null default 0)`;
    await q`create table scotty_agent_brains (agent_id text primary key references scotty_agents(id), specialty text, instructions text)`;
    await q`insert into scotty_agents(id,name,department) values ('agent_test','Test Researcher','Research')`;
    await q`insert into scotty_agent_brains(agent_id,specialty,instructions) values ('agent_test','Research','Analyze approved synthetic evidence')`;
    expect((await request("/api/workspace/projects","POST",{id:"synthetic_alpha",name:"Synthetic Alpha"})).status).toBe(201);
    expect((await request("/api/workspace/projects","POST",{id:"synthetic_beta",name:"Synthetic Beta"})).status).toBe(201);
    const recommendation = await handleWorkspaceRecommendations(new URL(base+"/api/workspace/recommend?projectId=synthetic_alpha&goal=research"));
    expect(recommendation.status).toBe(200);
    expect((await recommendation.json()).recommendations[0].id).toBe("agent_test");
    expect((await request("/api/workspace/projects/synthetic_alpha/team","POST",{agentId:"agent_test",assignment:"Analyze synthetic records"})).status).toBe(201);
    expect((await request("/api/workspace/projects/synthetic_beta/missions","POST",{title:"Unauthorized cross-project assignment",agentId:"agent_test"})).status).toBe(409);
    const created = await request("/api/workspace/projects/synthetic_alpha/missions","POST",{title:"Draft synthetic report",agentId:"agent_test",requiresApproval:true});
    expect(created.status).toBe(201);
    const missionId = (await created.json()).mission.id;
    expect((await request("/api/workspace/projects/synthetic_beta/missions/"+missionId,"PATCH",{status:"done"})).status).toBe(404);
    expect((await request("/api/workspace/projects/synthetic_alpha/missions/"+missionId,"PATCH",{status:"review",outputMarkdown:"Synthetic draft only"})).status).toBe(200);
    const alpha = await (await request("/api/workspace/overview?projectId=synthetic_alpha")).json();
    expect(alpha.approvals.some((a: any)=>a.status==="pending")).toBe(true);
    expect(alpha.briefing.evidenceGaps.length).toBeGreaterThan(0);
    const beta = await (await request("/api/workspace/overview?projectId=synthetic_beta")).json();
    expect(beta.missions.length).toBe(0);
    expect(beta.approvals.length).toBe(0);
    const unauth = await handleWorkspace(new Request(base+"/api/workspace/projects"),new URL(base+"/api/workspace/projects"));
    expect(unauth.status).toBe(401);
    const crossOrigin = await request("/api/workspace/projects","POST",{id:"blocked",name:"Blocked"},{origin:"https://untrusted.example"});
    expect(crossOrigin.status).toBe(403);
  } finally { await q.end(); }
}, 30000);
