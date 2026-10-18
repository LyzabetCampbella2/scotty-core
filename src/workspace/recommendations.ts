import postgres from "postgres";

const validId = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(v);
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
let sql: ReturnType<typeof postgres> | undefined;
function db() {
  if (!sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    sql = postgres(process.env.DATABASE_URL, { max: 3, connect_timeout: 12, idle_timeout: 20, ssl: "require" });
  }
  return sql;
}
const words = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2));

export async function handleWorkspaceRecommendations(u: URL): Promise<Response> {
  try {
    const projectId = u.searchParams.get("projectId");
    const goal = (u.searchParams.get("goal") || "").trim().slice(0, 2000);
    if (!goal) return json({ error: "goal is required" }, 400);
    if (projectId && !validId(projectId)) return json({ error: "Invalid projectId" }, 400);
    const q = db();
    if (projectId) {
      const exists = await q`select id from scotty_projects where id=${projectId}`;
      if (!exists.length) return json({ error: "Unknown project" }, 404);
    }
    const roster = await q`select a.id,a.name,a.department,coalesce(b.specialty,'Unassigned') as specialty,
      coalesce(b.instructions,'') as instructions,
      exists(select 1 from scotty_project_agents pa where pa.agent_id=a.id and pa.project_id=${projectId || "__no_project__"}) as "alreadyOnTeam"
      from scotty_agents a left join scotty_agent_brains b on b.agent_id=a.id
      order by a.sort_order,a.name`;
    const terms = words(goal);
    const scored = roster.map((agent: any) => {
      const profile = words([agent.name, agent.department, agent.specialty, agent.instructions].join(" "));
      const matched = [...terms].filter(t => profile.has(t));
      return { ...agent, matchCount: matched.length, matchedTerms: matched,
        score: terms.size ? Math.round(matched.length / terms.size * 100) : 0 };
    }).sort((a: any, b: any) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 8);
    return json({ ok: true, goal, method: "transparent keyword matching over the existing agent roster; confirm fit before assigning",
      recommendations: scored.map(({ id, name, department, specialty, alreadyOnTeam, score, matchedTerms }: any) =>
        ({ id, name, department, specialty, alreadyOnTeam, score, matchedTerms })) });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Recommendation error" }, 400);
  }
}
