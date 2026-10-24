CREATE TABLE IF NOT EXISTS brain_notes (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, scope TEXT NOT NULL,
 title TEXT NOT NULL, content TEXT NOT NULL, url TEXT,
 reviewed_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS brain_notes_lookup ON brain_notes(scope, agent_id, reviewed_at);
CREATE TABLE IF NOT EXISTS brain_missions (
 id TEXT PRIMARY KEY, question TEXT NOT NULL, team_size INTEGER NOT NULL,
 status TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS brain_missions_recent ON brain_missions(updated_at);
