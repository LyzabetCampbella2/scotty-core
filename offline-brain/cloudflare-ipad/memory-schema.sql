CREATE TABLE IF NOT EXISTS brain_notes (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, scope TEXT NOT NULL,
 title TEXT NOT NULL, content TEXT NOT NULL, url TEXT,
 reviewed_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS brain_notes_lookup ON brain_notes(scope, agent_id, reviewed_at);
