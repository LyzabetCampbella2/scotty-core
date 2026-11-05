-- Apply ONLY to the isolated Cloudflare D1 database scotty-brain-memory after owner review.
-- Additive: never touch Render, legacy PostgreSQL, backups, or production SCOTTY.
CREATE TABLE IF NOT EXISTS agent_projects (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, focus TEXT NOT NULL,
 created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS agent_project_links (
 agent_id TEXT NOT NULL, project_id TEXT NOT NULL, assigned_at TEXT NOT NULL,
 PRIMARY KEY(agent_id,project_id), FOREIGN KEY(project_id) REFERENCES agent_projects(id));
CREATE TABLE IF NOT EXISTS agent_activity (
 event_key TEXT NOT NULL, agent_id TEXT NOT NULL, project_id TEXT,
 kind TEXT NOT NULL CHECK(kind IN ('project','question','mission')),
 title TEXT NOT NULL, reference_id TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('owner-assigned','verified-run')),
 created_at TEXT NOT NULL, PRIMARY KEY(event_key,agent_id));
CREATE INDEX IF NOT EXISTS agent_activity_agent_recent ON agent_activity(agent_id,created_at DESC);
CREATE INDEX IF NOT EXISTS agent_activity_verified_mission ON agent_activity(reference_id,source,kind);
CREATE INDEX IF NOT EXISTS agent_links_project ON agent_project_links(project_id);
-- Starter project labels are public-oriented planning categories, not project data grants.
INSERT OR IGNORE INTO agent_projects VALUES('eirden-atelier','Eirden Atelier','Business application','manuscript software, client services, commerce, design and QA',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT OR IGNORE INTO agent_projects VALUES('bloodpool-trilogy','Bloodpool Trilogy','Creative writing','novel development, worldbuilding, chapter planning, editing and research',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT OR IGNORE INTO agent_projects VALUES('golden-hour-creative','Golden Hour Creative','Creative business','UGC video, cat content, pricing, brand design and outreach',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT OR IGNORE INTO agent_projects VALUES('scotty-aios','SCOTTY AIOS','Software platform','agent architecture, backups, secure automation, testing and voice HUD',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT OR IGNORE INTO agent_projects VALUES('learning-coursework','Learning & Coursework','Education','astronomy, biology, anthropology, coursework tutoring and evidence review',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
