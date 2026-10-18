import postgres from "postgres";

type Json = Record<string, unknown>;
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const validId = (v: unknown): v is string => typeof v === "string" && idPattern.test(v);
const text = (v: unknown, max = 4000): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

let sql: ReturnType<typeof postgres> | undefined;
let ready: Promise<void> | undefined;
function db() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    sql = postgres(url, { max: 4, connect_timeout: 12, idle_timeout: 20, ssl: url.startsWith("postgres://127.0.0.1:") || url.startsWith("postgres://localhost:") ? false : "require" });
  }
  return sql;
}
async function ensure() {
  if (!ready) ready = (async () => {
    const q = db();
    await q`create table if not exists scotty_projects (
      id text primary key, name text not null, goal text not null default '',
      information_policy text not null default 'approved_sources_only',
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )`;
    await q`create table if not exists scotty_project_agents (
      project_id text not null references scotty_projects(id) on delete cascade,
      agent_id text not null references scotty_agents(id) on delete restrict,
      assignment text not null default '', status text not null default 'available'
        check(status in ('available','working','blocked','review')),
      updated_at timestamptz not null default now(), primary key(project_id,agent_id)
    )`;
    await q`create table if not exists scotty_missions (
      id text primary key, project_id text not null references scotty_projects(id) on delete cascade,
      title text not null, goal text not null default '', assigned_agent_id text references scotty_agents(id) on delete restrict,
      status text not null default 'queued' check(status in ('queued','working','blocked','review','done')),
      blocker text, output_markdown text, due_at timestamptz, requires_approval boolean not null default false,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )`;
    await q`create table if not exists scotty_project_evidence (
      id text primary key, project_id text not null references scotty_projects(id) on delete cascade,
      title text not null, source_uri text, source_type text not null default 'note',
      excerpt text not null default '', approved boolean not null default false,
      added_by text not null default 'owner', created_at timestamptz not null default now()
    )`;
    await q`create table if not exists scotty_project_approvals (
      id text primary key, project_id text not null references scotty_projects(id) on delete cascade,
      mission_id text references scotty_missions(id) on delete cascade,
      kind text not null, summary text not null, status text not null default 'pending'
        check(status in ('pending','approved','rejected')),
      decision_note text, created_at timestamptz not null default now(), decided_at timestamptz
    )`;
    await q`create index if not exists scotty_missions_project_status_idx on scotty_missions(project_id,status,due_at)`;
    await q`create index if not exists scotty_evidence_project_approved_idx on scotty_project_evidence(project_id,approved,created_at desc)`;
    await q`create index if not exists scotty_approvals_project_status_idx on scotty_project_approvals(project_id,status,created_at desc)`;
  })().catch(e => { ready = undefined; throw e; });
  return ready;
}
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;

export function workspaceAuthorized(req: Request) {
  const token = process.env.SCOTTY_WORKSPACE_ADMIN_TOKEN || process.env.SCOTTY_BRAIN_ADMIN_TOKEN;
  const auth = req.headers.get("authorization");
  if (token && auth === `Bearer ${token}`) return true;
  const ownerToken = process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
  const cookie = req.headers.get("cookie")?.split(";").map(x => x.trim())
    .find(x => x.startsWith("scotty_owner_session="))?.slice("scotty_owner_session=".length);
  return Boolean(ownerToken && cookie && cookie === ownerToken);
}
function cookieSession(req: Request) {
  const ownerToken = process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
  const cookie = req.headers.get("cookie")?.split(";").map(x => x.trim())
    .find(x => x.startsWith("scotty_owner_session="))?.slice("scotty_owner_session=".length);
  return Boolean(ownerToken && cookie && cookie === ownerToken &&
    req.headers.get("authorization") !== `Bearer ${process.env.SCOTTY_WORKSPACE_ADMIN_TOKEN || process.env.SCOTTY_BRAIN_ADMIN_TOKEN || ""}`);
}
function allowedOrigin(req: Request, u: URL) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (origin === u.origin) return true;
  const configured = (process.env.SCOTTY_WORKSPACE_ALLOWED_ORIGINS || "https://scotty-cloud-hud.vercel.app,https://scotty-cloud-hud-lyzabetcampbella2s-projects.vercel.app")
    .split(",").map(x => x.trim()).filter(Boolean);
  return configured.includes(origin) ||
    /^https:\/\/scotty-cloud-hud-git-[a-z0-9-]+-lyzabetcampbella2s-projects\.vercel\.app$/.test(origin) ||
    /^https:\/\/scotty-cloud-[a-z0-9]+-lyzabetcampbella2s-projects\.vercel\.app$/.test(origin);
}
async function body(req: Request): Promise<Json> {
  const value = await req.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a JSON object");
  return value as Json;
}

/**
 * Owner-authorized project workspace API.
 * Projects are hard data boundaries: every child read/write includes project_id.
 * Drafts are not published, evidence is not trusted until explicitly approved,
 * and external integrations are never called from this module.
 */
export async function handleWorkspace(req: Request, u: URL): Promise<Response> {
  if (process.env.SCOTTY_WORKSPACE_ENABLED !== "true") return json({ ok: false, error: "Project workspace is disabled" }, 503);
  if (!workspaceAuthorized(req)) return json({ ok: false, error: "Unauthorized" }, 401);
  if (req.method !== "GET") {
    if (!allowedOrigin(req, u)) return json({ ok: false, error: "Cross-origin write blocked" }, 403);
    if (cookieSession(req) && req.headers.get("x-scotty-csrf") !== "1")
      return json({ ok: false, error: "CSRF header required" }, 403);
  }
  try {
    await ensure();
    const q = db(), p = u.pathname, method = req.method;

    if (method === "GET" && p === "/api/workspace/projects") {
      const projects = await q`select id,name,goal,information_policy,created_at as "createdAt",updated_at as "updatedAt" from scotty_projects order by updated_at desc`;
      return json({ ok: true, projects });
    }

    if (method === "POST" && p === "/api/workspace/projects") {
      const b = await body(req);
      if (!validId(b.id) || !text(b.name, 160) || (b.goal !== undefined && typeof b.goal !== "string")) return json({ error: "Invalid project" }, 400);
      const rows = await q`insert into scotty_projects(id,name,goal) values(${b.id},${b.name.trim()},${typeof b.goal === "string" ? b.goal.slice(0, 4000) : ""})
        returning id,name,goal,information_policy,created_at as "createdAt",updated_at as "updatedAt"`;
      return json({ ok: true, project: rows[0] }, 201);
    }

    if (method === "GET" && p === "/api/workspace/overview") {
      const projectId = u.searchParams.get("projectId");
      if (!validId(projectId)) return json({ error: "projectId is required" }, 400);
      const projects = await q`select id,name,goal,information_policy from scotty_projects where id=${projectId} limit 1`;
      if (!projects[0]) return json({ error: "Unknown project" }, 404);
      const [team, missions, evidence, approvals] = await Promise.all([
        q`select pa.agent_id as "agentId",a.name,a.department,pa.assignment,pa.status,pa.updated_at as "updatedAt"
          from scotty_project_agents pa join scotty_agents a on a.id=pa.agent_id
          where pa.project_id=${projectId} order by a.department,a.name`,
        q`select id,title,goal,"assigned_agent_id" as "assignedAgentId",status,blocker,"output_markdown" as "outputMarkdown",
          due_at as "dueAt","requires_approval" as "requiresApproval",created_at as "createdAt",updated_at as "updatedAt"
          from scotty_missions where project_id=${projectId} order by
          case status when 'blocked' then 0 when 'review' then 1 when 'working' then 2 when 'queued' then 3 else 4 end, due_at nulls last`,
        q`select id,title,source_uri as "sourceUri",source_type as "sourceType",excerpt,approved,added_by as "addedBy",created_at as "createdAt"
          from scotty_project_evidence where project_id=${projectId} order by approved desc,created_at desc`,
        q`select id,mission_id as "missionId",kind,summary,status,decision_note as "decisionNote",created_at as "createdAt"
          from scotty_project_approvals where project_id=${projectId} order by created_at desc`
      ]);
      const openMissions = missions.filter((m: any) => m.status !== "done");
      const dueSoon = openMissions.filter((m: any) => m.dueAt && new Date(m.dueAt).getTime() < Date.now() + 7 * 86400000);
      const missingEvidence = missions.filter((m: any) => m.status === "review" && !evidence.some((e: any) => e.approved));
      return json({ ok: true, project: projects[0], team, missions, evidence, approvals,
        briefing: { blocked: openMissions.filter((m: any) => m.status === "blocked"), dueSoon,
          awaitingApproval: approvals.filter((a: any) => a.status === "pending"),
          evidenceGaps: missingEvidence.map((m: any) => ({ missionId: m.id, title: m.title, reason: "No approved project evidence is attached yet" })) } });
    }

    const member = p.match(/^\/api\/workspace\/projects\/([^/]+)\/team$/);
    if (method === "POST" && member) {
      const projectId = decodeURIComponent(member[1]), b = await body(req);
      if (!validId(projectId) || !validId(b.agentId) || !text(b.assignment, 1000)) return json({ error: "Invalid team assignment" }, 400);
      const rows = await q`select id from scotty_projects where id=${projectId}`;
      if (!rows.length) return json({ error: "Unknown project" }, 404);
      const agents = await q`select id from scotty_agents where id=${b.agentId}`;
      if (!agents.length) return json({ error: "Agent is not in the existing roster" }, 404);
      const result = await q`insert into scotty_project_agents(project_id,agent_id,assignment) values(${projectId},${b.agentId},${b.assignment.trim()})
        on conflict(project_id,agent_id) do update set assignment=excluded.assignment,updated_at=now()
        returning project_id as "projectId",agent_id as "agentId",assignment,status`;
      await q`update scotty_projects set updated_at=now() where id=${projectId}`;
      return json({ ok: true, assignment: result[0] }, 201);
    }

    const missionRoute = p.match(/^\/api\/workspace\/projects\/([^/]+)\/missions$/);
    if (missionRoute && method === "POST") {
      const projectId = decodeURIComponent(missionRoute[1]), b = await body(req);
      if (!validId(projectId) || !text(b.title, 200) || (b.goal !== undefined && typeof b.goal !== "string") ||
        (b.agentId !== undefined && b.agentId !== null && !validId(b.agentId))) return json({ error: "Invalid mission" }, 400);
      const projects = await q`select id from scotty_projects where id=${projectId}`;
      if (!projects.length) return json({ error: "Unknown project" }, 404);
      if (b.agentId) {
        const assigned = await q`select 1 from scotty_project_agents where project_id=${projectId} and agent_id=${b.agentId}`;
        if (!assigned.length) return json({ error: "Assign the existing agent to this project team before assigning a mission" }, 409);
      }
      const missionId = newId("mission");
      const dueAt = typeof b.dueAt === "string" && !Number.isNaN(Date.parse(b.dueAt)) ? new Date(b.dueAt) : null;
      const rows = await q`insert into scotty_missions(id,project_id,title,goal,assigned_agent_id,due_at,requires_approval)
        values(${missionId},${projectId},${b.title.trim()},${typeof b.goal === "string" ? b.goal.slice(0, 4000) : ""},${b.agentId || null},${dueAt},${b.requiresApproval === true})
        returning id,title,goal,assigned_agent_id as "assignedAgentId",status,due_at as "dueAt",requires_approval as "requiresApproval"`;
      await q`update scotty_projects set updated_at=now() where id=${projectId}`;
      return json({ ok: true, mission: rows[0] }, 201);
    }

    const updateMission = p.match(/^\/api\/workspace\/projects\/([^/]+)\/missions\/([^/]+)$/);
    if (updateMission && method === "PATCH") {
      const projectId = decodeURIComponent(updateMission[1]), missionId = decodeURIComponent(updateMission[2]), b = await body(req);
      const statuses = ["queued", "working", "blocked", "review", "done"];
      if (!validId(projectId) || !validId(missionId) || (b.status !== undefined && !statuses.includes(String(b.status))) ||
        (b.outputMarkdown !== undefined && typeof b.outputMarkdown !== "string") || (b.blocker !== undefined && b.blocker !== null && typeof b.blocker !== "string")) return json({ error: "Invalid mission update" }, 400);
      const rows = await q`update scotty_missions set
        status=coalesce(${b.status ?? null},status),
        blocker=case when ${Object.hasOwn(b, "blocker")} then ${typeof b.blocker === "string" ? b.blocker.slice(0, 2000) : null} else blocker end,
        output_markdown=case when ${Object.hasOwn(b, "outputMarkdown")} then ${typeof b.outputMarkdown === "string" ? b.outputMarkdown.slice(0, 30000) : null} else output_markdown end,
        updated_at=now()
        where id=${missionId} and project_id=${projectId}
        returning id,title,status,blocker,output_markdown as "outputMarkdown",updated_at as "updatedAt"`;
      if (!rows.length) return json({ error: "Mission not found in this project" }, 404);
      if (rows[0].status === "review") await q`insert into scotty_project_approvals(id,project_id,mission_id,kind,summary)
        select ${newId("approval")},${projectId},${missionId},'mission_output',${rows[0].title}
        where not exists(select 1 from scotty_project_approvals where project_id=${projectId} and mission_id=${missionId} and status='pending')`;
      await q`update scotty_projects set updated_at=now() where id=${projectId}`;
      return json({ ok: true, mission: rows[0] });
    }

    const evidenceRoute = p.match(/^\/api\/workspace\/projects\/([^/]+)\/evidence$/);
    if (evidenceRoute && method === "POST") {
      const projectId = decodeURIComponent(evidenceRoute[1]), b = await body(req);
      if (!validId(projectId) || !text(b.title, 200) || !text(b.excerpt ?? "", 12000) || (b.sourceUri !== undefined && b.sourceUri !== null && !text(b.sourceUri, 2048))) return json({ error: "Invalid evidence item" }, 400);
      const projects = await q`select id from scotty_projects where id=${projectId}`;
      if (!projects.length) return json({ error: "Unknown project" }, 404);
      const rows = await q`insert into scotty_project_evidence(id,project_id,title,source_uri,source_type,excerpt,approved)
        values(${newId("evidence")},${projectId},${b.title.trim()},${b.sourceUri || null},${text(b.sourceType,40) ? b.sourceType : "note"},${typeof b.excerpt === "string" ? b.excerpt.slice(0,12000) : ""},false)
        returning id,title,source_uri as "sourceUri",source_type as "sourceType",excerpt,approved,created_at as "createdAt"`;
      await q`update scotty_projects set updated_at=now() where id=${projectId}`;
      return json({ ok: true, evidence: rows[0], note: "Evidence starts unapproved and cannot be treated as project-authoritative until reviewed." }, 201);
    }

    const approveEvidence = p.match(/^\/api\/workspace\/projects\/([^/]+)\/evidence\/([^/]+)\/approve$/);
    if (approveEvidence && method === "POST") {
      const projectId = decodeURIComponent(approveEvidence[1]), evidenceId = decodeURIComponent(approveEvidence[2]);
      const rows = await q`update scotty_project_evidence set approved=true where id=${evidenceId} and project_id=${projectId}
        returning id,title,approved,source_uri as "sourceUri"`;
      if (!rows.length) return json({ error: "Evidence not found in this project" }, 404);
      return json({ ok: true, evidence: rows[0] });
    }

    const approvalRoute = p.match(/^\/api\/workspace\/projects\/([^/]+)\/approvals\/([^/]+)$/);
    if (approvalRoute && method === "POST") {
      const projectId = decodeURIComponent(approvalRoute[1]), approvalId = decodeURIComponent(approvalRoute[2]), b = await body(req);
      if (!["approved", "rejected"].includes(String(b.decision))) return json({ error: "Decision must be approved or rejected" }, 400);
      const rows = await q`update scotty_project_approvals set status=${b.decision},decision_note=${typeof b.note === "string" ? b.note.slice(0,2000) : null},decided_at=now()
        where id=${approvalId} and project_id=${projectId} and status='pending'
        returning id,mission_id as "missionId",kind,summary,status,decision_note as "decisionNote",decided_at as "decidedAt"`;
      if (!rows.length) return json({ error: "Approval not found or already decided in this project" }, 404);
      return json({ ok: true, approval: rows[0] });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Workspace error" }, 400);
  }
}
