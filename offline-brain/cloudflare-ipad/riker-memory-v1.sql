-- OPTIONAL, ISOLATED Cloudflare D1 ONLY. Not production PostgreSQL.
-- Review and back up the target before applying. No automatic migration.
-- Sensitive content must use a separately approved encrypted store.
CREATE TABLE IF NOT EXISTS riker_memory (
 id TEXT PRIMARY KEY,
 agent_id TEXT NOT NULL CHECK(agent_id='chief-riker'),
 category TEXT NOT NULL CHECK(category IN ('owner_preference','decision','project','mission','collaboration','check_in','reference','lesson')),
 scope TEXT NOT NULL CHECK(scope IN ('private','project','department')),
 project_id TEXT,
 department TEXT,
 text TEXT NOT NULL,
 source TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
 sensitivity TEXT NOT NULL CHECK(sensitivity='ordinary'),
 created_at TEXT NOT NULL,
 reviewed_at TEXT,
 expires_at TEXT NOT NULL,
 CHECK((scope='project' AND project_id IS NOT NULL) OR (scope!='project' AND project_id IS NULL)),
 CHECK((scope='department' AND department='Operations & Coordination') OR (scope!='department' AND department IS NULL))
);
CREATE INDEX IF NOT EXISTS riker_memory_recall ON riker_memory(agent_id,status,expires_at,reviewed_at);
CREATE TABLE IF NOT EXISTS riker_memory_audit (
 id TEXT PRIMARY KEY,
 note_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('proposed','approved','rejected','deleted')),
 at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS riker_memory_audit_note ON riker_memory_audit(note_id,at);
